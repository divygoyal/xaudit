import Link from "next/link";
import { Check, Sparkles, Zap } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getUsage, FREE_LIMIT, REFERRAL_REWARD } from "@/lib/usage";

export const dynamic = "force-dynamic";

function nextResetDate(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

export default async function BillingPage() {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const usage = await getUsage(user.id);
  const reset = nextResetDate();
  const resetLabel = reset.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
  const usedPct = Math.min(100, Math.round((usage.used / Math.max(1, usage.limit)) * 100));

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

      {/* Current plan card */}
      <section className="rounded-2xl border border-ink-800 bg-ink-900/40 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">
              <span className="h-1.5 w-1.5 rounded-full bg-moss" />
              Free plan
            </div>
            <h2 className="mt-3 font-serif text-2xl text-paper">
              {FREE_LIMIT} audits / month, free forever
            </h2>
            <p className="mt-1 max-w-xl text-[13px] text-ink-300">
              Refers reset on the 1st of each month. Bonus credits from referrals stack on top and
              never expire.
            </p>
          </div>
          <div className="text-right">
            <div className="font-serif text-4xl text-paper tabular-nums">$0</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
              forever
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
                {usage.used} / {usage.limit}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-vermillion to-vermillion-glow"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="mt-2 text-[11.5px] text-ink-400">Resets {resetLabel}</div>
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

      {/* Pro tier teaser */}
      <section className="relative overflow-hidden rounded-2xl border border-vermillion/30 bg-gradient-to-br from-vermillion/[0.08] via-ink-900/30 to-ink-900/30 p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-vermillion/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-vermillion/40 bg-vermillion/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-vermillion-glow">
              <Sparkles size={10} strokeWidth={2.4} />
              Coming soon
            </div>
            <h2 className="mt-3 font-serif text-2xl text-paper md:text-3xl">
              xAudit <span className="serif-italic text-vermillion">Pro</span>
            </h2>
            <p className="mt-1.5 text-[13.5px] text-ink-300">
              For ghostwriters and serious posters who run more than a handful of drafts a week.
            </p>
            <ul className="mt-4 space-y-2 text-[13px] text-ink-200">
              <Feature>Unlimited audits — no monthly cap</Feature>
              <Feature>Thread-aware grading (whole thread, not just one tweet)</Feature>
              <Feature>Personal style profile from your last 50 tweets</Feature>
              <Feature>Bulk CSV import — paste 20 drafts, get a ranked list</Feature>
              <Feature>Priority Gemini queue — sub-15s grades</Feature>
            </ul>
          </div>
          <div className="ml-auto text-right">
            <div className="font-serif text-4xl text-paper tabular-nums">$12</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
              / month
            </div>
            <a
              href={`mailto:hello@xaudit.app?subject=${encodeURIComponent("Notify me when Pro launches")}&body=${encodeURIComponent("Email: " + (user.email ?? ""))}`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-vermillion px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-paper-warm transition-colors hover:bg-vermillion-glow"
            >
              <Zap size={12} strokeWidth={2.4} />
              Notify me
            </a>
          </div>
        </div>
      </section>
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
