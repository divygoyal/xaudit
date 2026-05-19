import Link from "next/link";
import { ArrowUpRight, Gift, Sparkles, Zap } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUsage } from "@/lib/usage";
import { AuditsTable, type AuditRow } from "@/components/dashboard/audits-table";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  // Layout already gates auth, but TS doesn't know — guard here.
  if (!user) return null;

  const admin = getSupabaseAdmin();
  const [usage, audits, refCount] = await Promise.all([
    getUsage(user.id),
    admin
      .from("analyses")
      .select("id, draft_text, result, created_at, tweet_url, tweet_author")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", user.id),
  ]);

  const rows = (audits.data ?? []) as AuditRow[];
  const friendsJoined = refCount.count ?? 0;
  const monthlyRemaining = Math.max(0, usage.limit - usage.used);
  const greetingName = (user.email ?? "there").split("@")[0];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
            Dashboard
          </div>
          <h1 className="mt-1 font-serif text-3xl tracking-tight text-paper md:text-4xl">
            Welcome back, <span className="serif-italic text-vermillion">{greetingName}</span>
          </h1>
          <p className="mt-1.5 text-sm text-ink-300">
            Your audits, credits, and referrals in one place.
          </p>
        </div>
        <Link
          href="/#analyze"
          className="inline-flex items-center gap-1.5 rounded-full bg-vermillion px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-paper-warm shadow-[0_14px_28px_-16px_rgba(255,68,0,0.7)] transition-colors hover:bg-vermillion-glow"
        >
          New audit
          <ArrowUpRight size={12} strokeWidth={2.4} />
        </Link>
      </header>

      {/* Top cards */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Usage */}
        <article className="rounded-2xl border border-ink-800 bg-ink-900/40 p-5">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
              This month
            </div>
            <Zap size={14} className="text-vermillion-glow" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-serif text-4xl text-paper tabular-nums">{usage.used}</span>
            <span className="font-mono text-[12px] text-ink-500">/ {usage.limit}</span>
          </div>
          <div className="mt-1 text-[12.5px] text-ink-300">
            {monthlyRemaining > 0
              ? `${monthlyRemaining} free audit${monthlyRemaining === 1 ? "" : "s"} left`
              : "Free allowance used — bonus credits below kick in next."}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-vermillion to-vermillion-glow"
              style={{
                width: `${Math.min(100, Math.round((usage.used / Math.max(1, usage.limit)) * 100))}%`,
              }}
            />
          </div>
        </article>

        {/* Bonus credits */}
        <article className="rounded-2xl border border-ink-800 bg-ink-900/40 p-5">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
              Bonus credits
            </div>
            <Sparkles size={14} className="text-vermillion-glow" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-serif text-4xl text-paper tabular-nums">
              {usage.bonusCredits}
            </span>
            <span className="font-mono text-[12px] text-ink-500">extra</span>
          </div>
          <div className="mt-1 text-[12.5px] text-ink-300">
            Earned from referrals. Used after your monthly allowance.
          </div>
        </article>

        {/* Referrals */}
        <article className="rounded-2xl border border-ink-800 bg-ink-900/40 p-5">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
              Friends joined
            </div>
            <Gift size={14} className="text-vermillion-glow" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-serif text-4xl text-paper tabular-nums">{friendsJoined}</span>
            <span className="font-mono text-[12px] text-ink-500">via your link</span>
          </div>
          <Link
            href="/dashboard/referrals"
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-vermillion-glow transition-colors hover:text-vermillion"
          >
            View your invite link
            <ArrowUpRight size={11} strokeWidth={2.4} />
          </Link>
        </article>
      </section>

      {/* Recent audits */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
              Recent audits
            </div>
            <h2 className="mt-1 font-serif text-2xl tracking-tight text-paper">
              Latest <span className="serif-italic text-vermillion">grades</span>
            </h2>
          </div>
          {rows.length > 0 && (
            <Link
              href="/dashboard/history"
              className="inline-flex items-center gap-1 text-[12.5px] text-ink-300 transition-colors hover:text-vermillion-glow"
            >
              See all
              <ArrowUpRight size={12} strokeWidth={2.4} />
            </Link>
          )}
        </div>
        <AuditsTable rows={rows} />
      </section>
    </div>
  );
}
