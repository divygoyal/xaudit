import Link from "next/link";
import { Check, CreditCard, ExternalLink, Sparkles, Zap } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getBillingStatus } from "@/lib/billing";
import { getUsage, FREE_LIMIT, REFERRAL_REWARD } from "@/lib/usage";

export const dynamic = "force-dynamic";

function nextResetDate(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

function formatDate(dateLike: string | null | undefined) {
  if (!dateLike) return null;
  return new Date(dateLike).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: { checkout?: string; already?: string };
}) {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const [usage, billing] = await Promise.all([getUsage(user.id), getBillingStatus(user.id)]);
  const reset = nextResetDate();
  const resetLabel = reset.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
  const usedPct = billing.isPro
    ? 100
    : Math.min(100, Math.round((usage.used / Math.max(1, usage.limit)) * 100));
  const periodEnd = formatDate(billing.subscription?.current_period_end);

  return (
    <div className="space-y-8">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
          Billing & plan
        </div>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-paper md:text-4xl">
          Your <span className="serif-italic text-vermillion">plan</span>
        </h1>
        <p className="mt-1.5 text-sm text-ink-300">
          Manage how many audits you can run and when your allowance resets.
        </p>
      </header>

      {searchParams?.checkout === "success" && (
        <StatusNotice tone="success">
          Checkout complete. Your Pro access will appear as soon as Dodo sends the subscription webhook.
        </StatusNotice>
      )}
      {searchParams?.checkout === "cancelled" && (
        <StatusNotice tone="neutral">Checkout cancelled. Your free plan is still active.</StatusNotice>
      )}
      {searchParams?.already === "pro" && (
        <StatusNotice tone="neutral">You are already on letxcook Pro.</StatusNotice>
      )}

      <section className="rounded-2xl border border-ink-800 bg-ink-900/40 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">
              <span className={`h-1.5 w-1.5 rounded-full ${billing.isPro ? "bg-vermillion" : "bg-moss"}`} />
              {billing.isPro ? "Pro plan" : "Free plan"}
            </div>
            <h2 className="mt-3 font-serif text-2xl text-paper">
              {billing.isPro ? "Unlimited X draft audits" : `${FREE_LIMIT} audits / month, free forever`}
            </h2>
            <p className="mt-1 max-w-xl text-[13px] text-ink-300">
              {billing.isPro
                ? periodEnd
                  ? billing.subscription?.cancel_at_period_end
                    ? `Your Pro access remains active until ${periodEnd}.`
                    : `Your next billing period starts ${periodEnd}.`
                  : "Your Pro subscription is active."
                : "Free audits reset on the 1st of each month. Bonus credits from referrals stack on top and never expire."}
            </p>
          </div>
          <div className="text-right">
            <div className="font-serif text-4xl text-paper tabular-nums">
              {billing.isPro ? "$9" : "$0"}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
              {billing.isPro ? "/ month" : "forever"}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
                This month
              </span>
              <span className="font-mono text-[12px] tabular-nums text-ink-300">
                {billing.isPro ? `${usage.used} / unlimited` : `${usage.used} / ${usage.limit}`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-vermillion to-vermillion-glow"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="mt-2 text-[11.5px] text-ink-400">
              {billing.isPro ? "No monthly cap" : `Resets ${resetLabel}`}
            </div>
          </div>

          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
              Bonus credits
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-3xl text-paper tabular-nums">
                {usage.bonusCredits}
              </span>
              <span className="font-mono text-[11px] text-ink-500">extra audits</span>
            </div>
            <Link
              href="/dashboard/referrals"
              className="mt-1 inline-flex text-[11.5px] text-vermillion-glow transition-colors hover:text-vermillion"
            >
              Earn +{REFERRAL_REWARD} per referral →
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-vermillion/30 bg-gradient-to-br from-vermillion/[0.08] via-ink-900/30 to-ink-900/30 p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-vermillion/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-vermillion/40 bg-vermillion/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-vermillion-glow">
              <Sparkles size={10} strokeWidth={2.4} />
              {billing.isPro ? "Active" : "Upgrade now"}
            </div>
            <h2 className="mt-3 font-serif text-2xl text-paper md:text-3xl">
              letxcook <span className="serif-italic text-vermillion">Pro</span>
            </h2>
            <p className="mt-1.5 text-[13.5px] text-ink-300">
              For creators, ghostwriters, and founders who test more than a handful of drafts a week.
            </p>
            <ul className="mt-4 space-y-2 text-[13px] text-ink-200">
              <Feature>Unlimited X draft audits — no monthly cap</Feature>
              <Feature>Unlimited rewrites and alternate angles</Feature>
              <Feature>Tweet URL, pasted draft, and screenshot analysis</Feature>
              <Feature>Full audit history and shareable verdict pages</Feature>
              <Feature>Priority analysis queue and early access to thread-aware grading</Feature>
            </ul>
          </div>
          <div className="ml-auto text-right">
            <div className="font-serif text-4xl text-paper tabular-nums">$9</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
              / month
            </div>
            {billing.isPro ? (
              <form action="/api/billing/portal" method="post">
                <button
                  type="submit"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-vermillion/40 bg-ink-950/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-paper transition-colors hover:bg-vermillion/10"
                >
                  <ExternalLink size={12} strokeWidth={2.4} />
                  Manage billing
                </button>
              </form>
            ) : (
              <form action="/api/billing/checkout" method="post">
                <button
                  type="submit"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-vermillion px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-paper-warm transition-colors hover:bg-vermillion-glow"
                >
                  <Zap size={12} strokeWidth={2.4} />
                  Upgrade to Pro
                </button>
              </form>
            )}
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-ink-400">
              <CreditCard size={11} strokeWidth={2.2} />
              Powered by Dodo Payments
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusNotice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "neutral";
}) {
  return (
    <div
      className={[
        "rounded-xl border px-4 py-3 text-[13px]",
        tone === "success"
          ? "border-moss/35 bg-moss/[0.08] text-moss"
          : "border-ink-700 bg-ink-900/50 text-ink-200",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check size={13} strokeWidth={2.6} className="mt-0.5 shrink-0 text-vermillion-glow" />
      <span>{children}</span>
    </li>
  );
}
