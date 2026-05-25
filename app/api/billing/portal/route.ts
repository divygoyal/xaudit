import { NextResponse } from "next/server";
import { getBillingStatus } from "@/lib/billing";
import { getDodoClient } from "@/lib/dodo";
import { getSupabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

function siteOrigin(req: Request) {
  const requestOrigin = new URL(req.url).origin;
  if (requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1")) {
    return requestOrigin;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || requestOrigin || "https://letxcook.com").replace(/\/$/, "");
}

function wantsHtml(req: Request) {
  return req.headers.get("accept")?.includes("text/html") ?? false;
}

export async function POST(req: Request) {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const origin = siteOrigin(req);
  if (!user) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("next", "/dashboard/billing");
    return wantsHtml(req)
      ? NextResponse.redirect(loginUrl, { status: 303 })
      : NextResponse.json({ error: "Sign in before managing billing." }, { status: 401 });
  }

  const billing = await getBillingStatus(user.id);
  const customerId = billing.subscription?.dodo_customer_id;
  if (!customerId) {
    return wantsHtml(req)
      ? NextResponse.redirect(`${origin}/dashboard/billing`, { status: 303 })
      : NextResponse.json({ error: "No Dodo customer is linked to this account." }, { status: 404 });
  }

  const portal = await getDodoClient().customers.customerPortal.create(customerId, {
    return_url: `${origin}/dashboard/billing`,
    send_email: false,
  });

  return wantsHtml(req)
    ? NextResponse.redirect(portal.link, { status: 303 })
    : NextResponse.json({ portalUrl: portal.link });
}
