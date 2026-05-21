import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { VerdictPage } from "@/components/verdict-page";
import {
  buildVerdictMetadata,
  canonicalPathFor,
  loadAnalysis,
  sanitizeReferrerId,
} from "@/lib/verdict";

export const runtime = "nodejs";
// Dynamic so we can capture `?ref=` per visit. Cheap: one Supabase
// row lookup.
export const dynamic = "force-dynamic";

type Params = { params: { id: string }; searchParams: { ref?: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const row = await loadAnalysis(params.id);
  if (!row) {
    return {
      title: "letxcook · Analysis not found",
      description: "This shared analysis is no longer available.",
    };
  }
  return buildVerdictMetadata(row);
}

export default async function LegacyVerdictPage({ params, searchParams }: Params) {
  const row = await loadAnalysis(params.id);
  if (!row) notFound();

  // Authored analyses now live at the canonical /{handle}/{id} URL.
  // Redirect any /v/{id} hit so existing shared links in the wild
  // (tweets, DMs, Slack threads) flow to the cute URL automatically.
  // Anonymous drafts (no tweet_author) stay on /v/{id} since there's
  // no handle to embed.
  if (row.tweet_author) {
    const canonical = canonicalPathFor(row);
    const query = searchParams.ref
      ? `?ref=${encodeURIComponent(searchParams.ref)}`
      : "";
    redirect(`${canonical}${query}`);
  }

  return (
    <VerdictPage row={row} referrerId={sanitizeReferrerId(searchParams.ref)} />
  );
}
