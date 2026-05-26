import type { Metadata } from "next";
import { getSupabaseAdmin } from "./supabase-admin";
import type { VerdictRow } from "@/components/verdict-page";

// Same precedence used in app/layout.tsx + sitemap.ts. Used to emit an
// absolute og:image URL — X's unfurler is much happier with a fully
// qualified https:// URL and an explicit width/height/alt than with
// the relative path Next.js would otherwise resolve via metadataBase.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

/** Single source of truth for fetching a shared analysis row. Both
 *  /v/[id] and /[handle]/[shortid] go through this. */
export async function loadAnalysis(id: string): Promise<VerdictRow | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("analyses")
    .select("id, tweet_url, tweet_author, draft_text, result, created_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as VerdictRow;
}

/** Build the canonical share path for a row. Authored analyses get the
 *  cute /{handle}/{id} shape; anonymous drafts stay on /v/{id}. */
export function canonicalPathFor(row: Pick<VerdictRow, "id" | "tweet_author">) {
  return row.tweet_author ? `/${row.tweet_author}/${row.id}` : `/v/${row.id}`;
}

/** Generate Open Graph + Twitter card metadata for a verdict page.
 *  Both routes call this so the title/description/og:image/canonical
 *  stay identical regardless of which URL the visitor lands on. */
export function buildVerdictMetadata(row: VerdictRow): Metadata {
  const authorHandle = row.tweet_author ? `@${row.tweet_author}` : null;
  const title = "Make your X posts perform better";
  const description = `An honest grade of ${
    authorHandle ? `${authorHandle}'s X draft` : "this X draft"
  } against 13 engagement signals.`;
  const canonical = canonicalPathFor(row);
  // OG image lives under /v/[id]/opengraph-image regardless of which
  // page URL the visitor used. Path is independent of canonical so we
  // don't have to duplicate the image route.
  //
  // Emit a fully qualified URL (not just /v/.../opengraph-image) so
  // crawlers that don't resolve relative URLs against metadataBase
  // (notably X / Twitterbot) still get a working preview. We also
  // declare width/height/alt explicitly because the file-convention
  // dimensions are NOT auto-attached when og:image is set manually.
  const ogImageUrl = `${SITE_URL}/v/${row.id}/opengraph-image`;
  const ogImage = {
    url: ogImageUrl,
    width: 1200,
    height: 630,
    alt: `${authorHandle ? `${authorHandle}'s ` : ""}X draft graded by letxcook`,
  };
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

/** Validate a `ref` query-param looks like a UUID before forwarding it
 *  into a cookie. Prevents arbitrary junk from poisoning attribution. */
export function sanitizeReferrerId(raw: string | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(trimmed) ? trimmed : null;
}
