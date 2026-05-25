import type { Subscription } from "dodopayments/resources/subscriptions";
import { getSupabaseAdmin } from "./supabase-admin";
import { getDodoProProductId } from "./dodo";

export const PRO_PLAN = "pro" as const;
export const FREE_PLAN = "free" as const;
export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active"]);

export type BillingPlan = typeof FREE_PLAN | typeof PRO_PLAN;

export type SubscriptionRow = {
  user_id: string;
  dodo_customer_id: string | null;
  dodo_subscription_id: string | null;
  product_id: string | null;
  plan: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  raw?: unknown;
  created_at?: string;
  updated_at?: string;
};

export type BillingStatus = {
  plan: BillingPlan;
  isPro: boolean;
  subscription: SubscriptionRow | null;
};

export function isActiveProSubscription(row: SubscriptionRow | null | undefined) {
  if (!row || row.plan !== PRO_PLAN) return false;
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(row.status)) return false;
  if (!row.current_period_end) return true;
  return new Date(row.current_period_end).getTime() > Date.now();
}

export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_subscriptions")
    .select(
      "user_id, dodo_customer_id, dodo_subscription_id, product_id, plan, status, current_period_end, cancel_at_period_end, created_at, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[billing] subscription lookup error:", error);
    return { plan: FREE_PLAN, isPro: false, subscription: null };
  }

  const subscription = (data as SubscriptionRow | null) ?? null;
  const isPro = isActiveProSubscription(subscription);
  return {
    plan: isPro ? PRO_PLAN : FREE_PLAN,
    isPro,
    subscription,
  };
}

export async function getSubscriptionByDodoIds(params: {
  subscriptionId?: string | null;
  customerId?: string | null;
}) {
  const sb = getSupabaseAdmin();

  if (params.subscriptionId) {
    const { data, error } = await sb
      .from("user_subscriptions")
      .select("*")
      .eq("dodo_subscription_id", params.subscriptionId)
      .maybeSingle();
    if (error) console.error("[billing] subscription-id lookup error:", error);
    if (data) return data as SubscriptionRow;
  }

  if (params.customerId) {
    const { data, error } = await sb
      .from("user_subscriptions")
      .select("*")
      .eq("dodo_customer_id", params.customerId)
      .maybeSingle();
    if (error) console.error("[billing] customer-id lookup error:", error);
    if (data) return data as SubscriptionRow;
  }

  return null;
}

export async function recordCheckoutSession(params: {
  sessionId: string;
  userId: string;
  productId: string;
}) {
  const { error } = await getSupabaseAdmin().from("dodo_checkout_sessions").upsert(
    {
      session_id: params.sessionId,
      user_id: params.userId,
      product_id: params.productId,
      status: "created",
    },
    { onConflict: "session_id" }
  );

  if (error) {
    console.error("[billing] checkout session insert error:", error);
    throw new Error("Unable to record checkout session.");
  }
}

export async function getUserIdForCheckoutSession(sessionId: string | null | undefined) {
  if (!sessionId) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("dodo_checkout_sessions")
    .select("user_id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("[billing] checkout session lookup error:", error);
    return null;
  }

  return typeof data?.user_id === "string" ? data.user_id : null;
}

export async function upsertDodoSubscription(
  subscription: Subscription,
  userId?: string | null
) {
  const resolvedUserId =
    userId ??
    subscription.metadata?.user_id ??
    (
      await getSubscriptionByDodoIds({
        subscriptionId: subscription.subscription_id,
        customerId: subscription.customer?.customer_id,
      })
    )?.user_id;

  if (!resolvedUserId) {
    console.warn("[billing] subscription webhook missing user mapping", {
      subscription_id: subscription.subscription_id,
      customer_id: subscription.customer?.customer_id,
      type: subscription.status,
    });
    return null;
  }

  const proProductId = getDodoProProductId();
  const row = {
    user_id: resolvedUserId,
    dodo_customer_id: subscription.customer?.customer_id ?? null,
    dodo_subscription_id: subscription.subscription_id,
    product_id: subscription.product_id,
    plan: subscription.product_id === proProductId ? PRO_PLAN : "unknown",
    status: subscription.status,
    current_period_end: subscription.next_billing_date ?? subscription.expires_at ?? null,
    cancel_at_period_end: subscription.cancel_at_next_billing_date ?? false,
    raw: subscription,
  };

  const { data, error } = await getSupabaseAdmin()
    .from("user_subscriptions")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    console.error("[billing] subscription upsert error:", error);
    throw new Error("Unable to update subscription status.");
  }

  return data as SubscriptionRow;
}
