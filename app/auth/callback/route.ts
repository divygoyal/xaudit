import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";
import { applyReferral } from "@/lib/usage";

export const runtime = "nodejs";

const REFERRAL_COOKIE_NAME = "xaudit_ref";
const ATTRIBUTION_COOKIE_NAME = "xaudit_attribution";

type Attribution = {
  a?: string; // analysis_id
  r?: string | null; // referrer_id
  s?: string | null; // utm_source
  m?: string | null; // utm_medium
  c?: string | null; // utm_campaign
  co?: string | null; // utm_content
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const origin = url.origin;

  if (code) {
    const supabase = getSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const cookieJar = cookies();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Apply pending referral if any (atomic / idempotent).
      try {
        const refCookie = cookieJar.get(REFERRAL_COOKIE_NAME)?.value;
        if (refCookie && user && refCookie !== user.id) {
          await applyReferral(refCookie, user.id);
        }
      } catch (e) {
        console.error("[auth/callback] referral apply failed:", e);
      }

      // 2. Record `share_signup` if this user landed via a shared comparison.
      try {
        const attrRaw = cookieJar.get(ATTRIBUTION_COOKIE_NAME)?.value;
        if (attrRaw && user) {
          const attr = JSON.parse(decodeURIComponent(attrRaw)) as Attribution;
          await getSupabaseAdmin().from("analytics_events").insert({
            event_type: "share_signup",
            analysis_id: attr.a ?? null,
            user_id: user.id,
            referrer_id:
              attr.r && /^[0-9a-f-]{36}$/i.test(attr.r) && attr.r !== user.id
                ? attr.r
                : null,
            utm_source: attr.s ?? null,
            utm_medium: attr.m ?? null,
            utm_campaign: attr.c ?? null,
            utm_content: attr.co ?? null,
          });
        }
      } catch (e) {
        console.error("[auth/callback] share_signup track failed:", e);
      }

      const safeNext = next.startsWith("/") ? next : "/";
      const response = NextResponse.redirect(`${origin}${safeNext}`);
      // Clear both attribution cookies — they're spent.
      response.cookies.set(REFERRAL_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      response.cookies.set(ATTRIBUTION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
