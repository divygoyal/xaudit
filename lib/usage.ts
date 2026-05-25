import { cookies } from "next/headers";
import { getSupabaseAdmin } from "./supabase-admin";
import { getBillingStatus, type BillingPlan } from "./billing";

// ─────────────────────────────────────────────────────────────
// FREE TIER LIMITS — adjust here, used everywhere
// ─────────────────────────────────────────────────────────────
export const ANON_FREE_LIMIT = 1;
export const FREE_LIMIT = 3;
export const REFERRAL_REWARD = 5; // bonus credits to each side on a successful referral
export const PRO_USAGE_REMAINING = Number.MAX_SAFE_INTEGER;
const ANON_COOKIE_NAME = "xaudit_anon";

export type UsageInfo = {
  used: number;
  limit: number; // base monthly limit (does NOT include bonus credits)
  bonusCredits: number; // permanent rolling balance from referrals
  remaining: number; // effective remaining = (limit - used) + bonusCredits, clamped
  isAnon: boolean;
  plan: BillingPlan;
  isUnlimited: boolean;
};

function currentMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthStartIso() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function readAnonCount(): number {
  const c = cookies().get(ANON_COOKIE_NAME);
  if (!c?.value) return 0;
  try {
    const data = JSON.parse(c.value) as { m?: string; c?: number };
    if (data?.m === currentMonthKey()) return Number(data.c) || 0;
  } catch {
    // Tampered or malformed — treat as zero. The next call will rewrite it.
  }
  return 0;
}

/** Pretty-print "X / Y used this month" for UI surfaces. */
export function formatUsageBadge(u: UsageInfo): string {
  return `${u.used} / ${u.limit} this month`;
}

/**
 * Returns the current usage for the caller. Pass `userId` from the
 * server-side Supabase client (null for anonymous visitors).
 */
export async function getUsage(userId: string | null): Promise<UsageInfo> {
  if (userId) {
    const sb = getSupabaseAdmin();
    // Run count + credits + billing lookup in parallel — all target indexed user fields.
    const [countRes, creditsRes, billing] = await Promise.all([
      sb
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", monthStartIso()),
      sb
        .from("user_credits")
        .select("bonus_credits")
        .eq("user_id", userId)
        .maybeSingle(),
      getBillingStatus(userId),
    ]);
    const used = countRes.count ?? 0;
    const bonusCredits = creditsRes.data?.bonus_credits ?? 0;
    const monthlyRemaining = Math.max(0, FREE_LIMIT - used);
    if (billing.isPro) {
      return {
        used,
        limit: FREE_LIMIT,
        bonusCredits,
        remaining: PRO_USAGE_REMAINING,
        isAnon: false,
        plan: billing.plan,
        isUnlimited: true,
      };
    }
    return {
      used,
      limit: FREE_LIMIT,
      bonusCredits,
      remaining: monthlyRemaining + bonusCredits,
      isAnon: false,
      plan: "free",
      isUnlimited: false,
    };
  }

  const used = readAnonCount();
  return {
    used,
    limit: ANON_FREE_LIMIT,
    bonusCredits: 0,
    remaining: Math.max(0, ANON_FREE_LIMIT - used),
    isAnon: true,
    plan: "free",
    isUnlimited: false,
  };
}

/**
 * Burn one bonus credit. Only call when the user has already exceeded
 * their monthly free allowance — the route handler decides this.
 * Returns the new bonus_credits balance, or null if no decrement happened
 * (balance was already zero).
 */
export async function decrementBonusCredit(userId: string): Promise<number | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.rpc("decrement_bonus_credit", { uid: userId });
  if (error) {
    console.error("[usage] decrement_bonus_credit rpc error:", error);
    return null;
  }
  return typeof data === "number" ? data : null;
}

/**
 * Apply a referral atomically (insert into `referrals` + credit both users).
 * Returns true if newly applied, false if duplicate / invalid / self-referral.
 */
export async function applyReferral(
  referrerId: string,
  referredId: string,
  reward = REFERRAL_REWARD
): Promise<boolean> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.rpc("apply_referral", {
    referrer: referrerId,
    referred: referredId,
    reward,
  });
  if (error) {
    console.error("[usage] apply_referral rpc error:", error);
    return false;
  }
  return data === true;
}

/**
 * Cookie payload to write after a successful anonymous analysis.
 * Caller passes this to `NextResponse.cookies.set(ANON_COOKIE_NAME, value, ...)`.
 */
export function nextAnonCookieValue() {
  return JSON.stringify({ m: currentMonthKey(), c: readAnonCount() + 1 });
}

export { ANON_COOKIE_NAME };
