import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { Subscription } from "dodopayments/resources/subscriptions";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getDodoClient } from "@/lib/dodo";
import { getUserIdForCheckoutSession, upsertDodoSubscription } from "@/lib/billing";

export const runtime = "nodejs";

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.active",
  "subscription.renewed",
  "subscription.updated",
  "subscription.on_hold",
  "subscription.cancelled",
  "subscription.failed",
  "subscription.expired",
  "subscription.plan_changed",
]);

function isSubscriptionEvent(type: string) {
  return SUBSCRIPTION_EVENTS.has(type);
}

function headerRecord(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

function fallbackEventId(rawBody: string) {
  return `sha256:${createHash("sha256").update(rawBody).digest("hex")}`;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const headers = headerRecord(req);
  const eventId = headers["webhook-id"] ?? headers["svix-id"] ?? fallbackEventId(rawBody);

  let event;
  try {
    event = getDodoClient().webhooks.unwrap(rawBody, { headers });
  } catch (err) {
    console.error("[dodo/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const existing = await getSupabaseAdmin()
    .from("dodo_webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing.data) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    if (event.type === "payment.succeeded" && event.data.subscription_id) {
      const subscription = await getDodoClient().subscriptions.retrieve(event.data.subscription_id);
      const userId =
        event.data.metadata?.user_id ??
        (await getUserIdForCheckoutSession(event.data.checkout_session_id));
      await upsertDodoSubscription(subscription, userId);
    } else if (isSubscriptionEvent(event.type)) {
      const subscription = event.data as Subscription;
      await upsertDodoSubscription(subscription, subscription.metadata?.user_id);
    }

    const { error } = await getSupabaseAdmin().from("dodo_webhook_events").insert({
      event_id: eventId,
      event_type: event.type,
      payload: event,
    });

    if (error && error.code !== "23505") {
      console.error("[dodo/webhook] event insert error:", error);
      return NextResponse.json({ error: "Webhook processed but not recorded." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[dodo/webhook] handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
