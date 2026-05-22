import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, ENABLED_LOCALES, LOCALES } from "@/i18n/config";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/** Build the absolute URL for a given (locale, marketing-path) pair.
 *  Default locale lives at root with no prefix (matches as-needed mode);
 *  other locales sit under /<locale>/<path>. */
function urlFor(locale: string, path: string): string {
  const trimmed = path.replace(/^\/+/, "");
  if (locale === DEFAULT_LOCALE) {
    return `${siteUrl}/${trimmed}`.replace(/\/$/, "") || `${siteUrl}/`;
  }
  return `${siteUrl}/${locale}/${trimmed}`.replace(/\/$/, "");
}

/** Build the alternates.languages map for a marketing path. Includes
 *  every enabled locale's hreflang code (the language-only alias too,
 *  for broader Google matching) plus x-default → default-locale URL. */
function alternatesFor(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of ENABLED_LOCALES) {
    const url = urlFor(locale, path);
    for (const tag of LOCALES[locale].hreflang) {
      out[tag] = url;
    }
  }
  out["x-default"] = urlFor(DEFAULT_LOCALE, path);
  return out;
}

/** Served at /sitemap.xml.
 *
 *  Static marketing surfaces only — verdict pages at /<handle>/<shortid>
 *  and /v/<id> are intentionally excluded:
 *    - identical templated metadata across rows = thin-content risk if
 *      bulk-submitted (Google may demote the site)
 *    - genuine discovery happens via X backlinks (the natural signal we
 *      want anyway); if a verdict goes viral, Google finds it via the
 *      inbound links
 *
 *  Each entry emits per-locale alternates so adding ja-jp / pt-br / etc.
 *  later requires zero changes here — just flip `enabled: true` in
 *  i18n/config.ts and ship the messages file. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
    { path: "/", changeFrequency: "weekly", priority: 1.0 },
    { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
    { path: "/terms", changeFrequency: "monthly", priority: 0.3 },
  ];

  const entries: MetadataRoute.Sitemap = [];
  for (const { path, changeFrequency, priority } of paths) {
    for (const locale of ENABLED_LOCALES) {
      entries.push({
        url: urlFor(locale, path),
        lastModified: now,
        changeFrequency,
        priority,
        alternates: { languages: alternatesFor(path) },
      });
    }
  }
  return entries;
}
