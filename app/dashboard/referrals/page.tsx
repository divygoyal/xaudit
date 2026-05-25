import Link from "next/link";
import { Gift, Sparkles, Twitter, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUsage, REFERRAL_REWARD } from "@/lib/usage";
import { CopyLink } from "@/components/dashboard/copy-link";

export const dynamic = "force-dynamic";

function getSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://letxcook.com")
  );
}

export default async function ReferralsPage() {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseAdmin();
  const [usage, friendsRes, shareSignupsRes] = await Promise.all([
    getUsage(user.id),
    admin
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", user.id),
    admin
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "share_view")
      .eq("referrer_id", user.id),
  ]);

  const friendsJoined = friendsRes.count ?? 0;
  const linkViews = shareSignupsRes.count ?? 0;
  const totalEarned = friendsJoined * REFERRAL_REWARD;

  const inviteUrl = `${getSiteOrigin()}/?ref=${user.id}&utm_source=referral&utm_medium=invite&utm_campaign=dash`;
  const tweetText = encodeURIComponent(
    `I've been using letxcook.com to grade my X drafts before I post. Try it free — first audit is on me:`
  );
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(inviteUrl)}`;

  return (
    <div className="space-y-8">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
          Referrals
        </div>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-paper md:text-4xl">
          Bring friends. Earn <span className="serif-italic text-vermillion">credits</span>.
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-300">
          Share your link. When a friend signs up, you each get{" "}
          <span className="font-semibold text-paper">+{REFERRAL_REWARD} bonus audits</span> on top of
          the monthly free allowance.
        </p>
      </header>

      {/* Invite link */}
      <section className="rounded-2xl border border-vermillion/30 bg-vermillion/[0.04] p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-vermillion-glow">
          Your invite link
        </div>
        <p className="mt-2 max-w-xl text-[13px] text-ink-300">
          Anyone who clicks this and signs up will count toward your referrals.
        </p>
        <div className="mt-4">
          <CopyLink url={inviteUrl} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={tweetUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900/60 px-3.5 py-2 text-[12px] font-medium text-paper transition-colors hover:border-vermillion"
          >
            <Twitter size={12} strokeWidth={2.4} />
            Post on X
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Friends joined"
          value={friendsJoined}
          suffix="signups"
          Icon={Users}
        />
        <Stat
          label="Credits earned"
          value={totalEarned}
          suffix={`@ +${REFERRAL_REWARD} each`}
          Icon={Sparkles}
        />
        <Stat
          label="Link views"
          value={linkViews}
          suffix="tracked"
          Icon={Gift}
        />
      </section>

      {/* Current bonus balance */}
      <section className="rounded-2xl border border-ink-800 bg-ink-900/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
              Current bonus balance
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-3xl text-paper tabular-nums">
                {usage.bonusCredits}
              </span>
              <span className="font-mono text-[12px] text-ink-500">audits</span>
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="text-[12px] font-medium text-vermillion-glow transition-colors hover:text-vermillion"
          >
            How credits work →
          </Link>
        </div>
        <p className="mt-2 text-[12.5px] text-ink-300">
          Bonus credits roll over month to month and are spent after your free monthly allowance.
        </p>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  Icon,
}: {
  label: string;
  value: number;
  suffix: string;
  Icon: LucideIcon;
}) {
  return (
    <article className="rounded-2xl border border-ink-800 bg-ink-900/40 p-5">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
          {label}
        </div>
        <Icon size={14} className="text-vermillion-glow" strokeWidth={2.2} />
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-serif text-4xl text-paper tabular-nums">{value}</span>
        <span className="font-mono text-[11px] text-ink-500">{suffix}</span>
      </div>
    </article>
  );
}
