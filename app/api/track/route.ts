import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

// Strict whitelist — keeps random payloads out of the events table.
const ALLOWED_EVENT_TYPES = new Set([
  "share_view", // someone landed on /v/[id]
  "share_signup", // someone signed up after coming from a share
]);

type IncomingBody = {
  event_type?: string;
  analysis_id?: string;
  referrer_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  metadata?: Record<string, unknown>;
};

function clip(s: unknown, max = 96): string | null {
  if (typeof s !== "string") return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function POST(req: Request) {
  let body: IncomingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const eventType = clip(body.event_type, 32);
  if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: "Unknown event_type." }, { status: 400 });
  }

  // Best-effort capture of current user (cookies). Anonymous is fine.
  let userId: string | null = null;
  try {
    const sb = getSupabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // ignore — analytics never blocks the path
  }

  const referrerId = clip(body.referrer_id, 36);
  // Don't credit the author for viewing their own comparison
  const cleanReferrerId =
    referrerId && /^[0-9a-f-]{36}$/i.test(referrerId) && referrerId !== userId
      ? referrerId
      : null;

  const row = {
    event_type: eventType,
    analysis_id: clip(body.analysis_id, 64),
    user_id: userId,
    referrer_id: cleanReferrerId,
    utm_source: clip(body.utm_source, 64),
    utm_medium: clip(body.utm_medium, 64),
    utm_campaign: clip(body.utm_campaign, 64),
    utm_content: clip(body.utm_content, 96),
    metadata: body.metadata ?? null,
  };

  try {
    const { error } = await getSupabaseAdmin()
      .from("analytics_events")
      .insert(row);
    if (error) console.error("[track] insert failed:", error);
  } catch (e) {
    console.error("[track] insert exception:", e);
  }

  // Always 204 — beacons should never get error responses that look like
  // real failures to the calling code.
  return new NextResponse(null, { status: 204 });
}
