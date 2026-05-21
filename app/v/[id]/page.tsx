import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { RecommendedRewrite } from "@/components/recommended-rewrite";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ReferralCapture } from "@/components/referral-capture";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { computeScore } from "@/lib/score";
import type { AnalysisResult } from "@/lib/types";

export const runtime = "nodejs";
// Dynamic (instead of ISR) so we can capture `?ref=` per visit.
// Cheap: this page only does one Supabase row lookup.
export const dynamic = "force-dynamic";

type Params = { params: { id: string }; searchParams: { ref?: string } };

async function loadAnalysis(id: string) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("analyses")
    .select("id, tweet_url, tweet_author, draft_text, result, created_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as {
    id: string;
    tweet_url: string | null;
    tweet_author: string | null;
    draft_text: string;
    result: AnalysisResult;
    created_at: string;
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const row = await loadAnalysis(params.id);
  if (!row) {
    return {
      title: "letxcook · Analysis not found",
      description: "This shared analysis is no longer available.",
    };
  }
  const author = row.tweet_author ? `@${row.tweet_author}` : "an X draft";
  const lift = row.result.rewrites?.find((r) => r.is_primary)?.predicted_lift ?? 0;
  const title = `letxcook · ${author} graded${lift > 0 ? ` · +${lift} pts predicted lift` : ""}`;
  const description = `13 ranker signals graded. ${lift > 0 ? `Rewrite gains +${lift} predicted points.` : "Repo-grounded analysis."}`;
  return {
    title,
    description,
    // Canonical URL of this shared analysis. Strips query params so
    // ?ref=… / ?utm_…= don't fragment the canonical for indexing.
    alternates: { canonical: `/v/${params.id}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/v/${params.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SharedAnalysisPage({ params, searchParams }: Params) {
  const row = await loadAnalysis(params.id);
  if (!row) notFound();
  const refParam = (searchParams.ref ?? "").trim();
  // Only forward something that LOOKS like a uuid — keeps junk out of the cookie.
  const referrerId = /^[0-9a-f-]{36}$/i.test(refParam) ? refParam : null;

  const primary =
    row.result.rewrites?.find((r) => r.is_primary) ?? row.result.rewrites?.[0];
  if (!primary) notFound();

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

      {/* Comparison */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
          <div className="mx-auto max-w-6xl">
            <RecommendedRewrite
              result={row.result}
              draftText={row.draft_text}
              primary={primary}
              currentScore={currentScore}
            />
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
            verifiable, repo-grounded grade and a rewrite in seconds.
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
