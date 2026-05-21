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
// Dynamic so we can still capture `?ref=` per visit when the share
// URL was generated via the dashboard referral generator.
export const dynamic = "force-dynamic";

type Params = {
  // Param name MUST match the existing /[username]/status/[id] catch-all
  // slug — Next.js requires one slug name per path-position across all
  // routes in the same folder level. We keep "username" as the slug
  // for both routes even though semantically this one is a handle.
  params: { username: string; shortid: string };
  searchParams: { ref?: string };
};

// X usernames are 1-15 chars, alphanumeric + underscore. Anything else
// at this URL position is not a real share — bail to 404 fast (avoids
// hitting Supabase for obviously-bogus URLs).
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  if (!HANDLE_RE.test(params.username)) {
    return {
      title: "letxcook · Analysis not found",
      description: "This shared analysis is no longer available.",
    };
  }
  const row = await loadAnalysis(params.shortid);
  if (!row) {
    return {
      title: "letxcook · Analysis not found",
      description: "This shared analysis is no longer available.",
    };
  }
  return buildVerdictMetadata(row);
}

export default async function CanonicalVerdictPage({ params, searchParams }: Params) {
  if (!HANDLE_RE.test(params.username)) notFound();
  const row = await loadAnalysis(params.shortid);
  if (!row) notFound();

  // Canonicalisation. If the user landed here with a different handle
  // than the actual author (e.g. typo, hand-edited URL, or row has no
  // author at all), redirect to the canonical URL so SEO + sharing
  // converge on one location.
  const canonical = canonicalPathFor(row);
  const matchesCanonical =
    row.tweet_author &&
    params.username.toLowerCase() === row.tweet_author.toLowerCase();
  if (!matchesCanonical) {
    // Preserve ?ref= so the referral attribution survives the bounce.
    const query = searchParams.ref ? `?ref=${encodeURIComponent(searchParams.ref)}` : "";
    redirect(`${canonical}${query}`);
  }

  return (
    <VerdictPage row={row} referrerId={sanitizeReferrerId(searchParams.ref)} />
  );
}
