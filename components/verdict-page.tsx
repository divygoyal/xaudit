import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { RecommendedRewrite } from "./recommended-rewrite";
import { HeroCompareMobile } from "./hero-compare-mobile";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { ReferralCapture } from "./referral-capture";
import { computeScore } from "@/lib/score";
import type { AnalysisResult } from "@/lib/types";

export type VerdictRow = {
  id: string;
  tweet_url: string | null;
  tweet_author: string | null;
  draft_text: string;
  result: AnalysisResult;
  created_at: string;
};

interface Props {
  row: VerdictRow;
  referrerId: string | null;
}

/** Server component used by both /v/[id] (legacy / anonymous) and
 *  /[handle]/[shortid] (canonical). Single source of truth for the
 *  verdict page render so the two routes stay in lock-step. */
export function VerdictPage({ row, referrerId }: Props) {
  const primary =
    row.result.rewrites?.find((r) => r.is_primary) ?? row.result.rewrites?.[0];
  if (!primary) return null;

  const currentScore = computeScore(row.result);

  return (
    <main>
      <ReferralCapture referrerId={referrerId} analysisId={row.id} />
      <Navbar />

      {/* Banner — this analysis was shared */}
      <section className="relative border-b border-ink-700/60 bg-vermillion/[0.04]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 md:px-10">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-300">
            <span className="rounded-full border border-vermillion/35 bg-vermillion/[0.10] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-vermillion-glow">
              Shared
            </span>
            <span>
              Analysis of{" "}
              {row.tweet_author ? (
                row.tweet_url ? (
                  <a
                    href={row.tweet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-paper underline decoration-vermillion/40 decoration-dotted underline-offset-2 hover:text-vermillion-glow"
                  >
                    @{row.tweet_author}&apos;s post
                    <ExternalLink size={10} className="ml-0.5 inline -translate-y-px" />
                  </a>
                ) : (
                  <span className="font-medium text-paper">@{row.tweet_author}&apos;s post</span>
                )
              ) : (
                <span className="font-medium text-paper">an X draft</span>
              )}
            </span>
          </div>
          <Link
            href="/#analyze"
            className="group inline-flex items-center gap-1.5 rounded-full bg-vermillion px-3.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-paper-warm shadow-[0_10px_24px_-12px_rgba(214,58,0,0.6)] transition hover:bg-vermillion-soft"
          >
            Audit your own draft
            <ArrowRight
              size={11}
              strokeWidth={2.6}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </section>

      {/* Comparison — mobile uses tabbed compact view, desktop uses full 3-col */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="lg:hidden">
              <HeroCompareMobile
                result={row.result}
                draftText={row.draft_text}
                primary={primary}
                currentScore={currentScore}
              />
            </div>
            <div className="hidden lg:block">
              <RecommendedRewrite
                result={row.result}
                draftText={row.draft_text}
                primary={primary}
                currentScore={currentScore}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA — convert this visitor into a user */}
      <section className="relative border-t border-ink-700/60 bg-ink-900/30">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center md:px-10 md:py-20">
          <h2 className="font-sans text-display-md font-medium text-paper">
            Grade your <span className="serif-italic text-vermillion">own</span> draft.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-300">
            Same 13-signal audit. Paste an X post URL or your draft text — get a
            practical signal grade and a rewrite in seconds.
          </p>
          <Link
            href="/#analyze"
            className="group mt-7 inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-950 transition hover:bg-paper-warm"
          >
            Try it free
            <ArrowRight
              size={13}
              strokeWidth={2.6}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
