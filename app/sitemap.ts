import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, LOCALES, type LocaleCode } from "@/i18n/config";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/** Build the absolute URL for a given (locale, marketing-path) pair.
 *  Default locale lives at root with no prefix (matches as-needed mode);
 *  other locales sit under /<locale>/<path>. */
function urlFor(locale: LocaleCode, path: string): string {
  const trimmed = path.replace(/^\/+/, "");
  if (locale === DEFAULT_LOCALE) {
    return `${siteUrl}/${trimmed}`.replace(/\/$/, "") || `${siteUrl}/`;
  }
  return `${siteUrl}/${locale}/${trimmed}`.replace(/\/$/, "");
}

/** Build the alternates.languages map for a marketing path. Only includes
 *  locales that ACTUALLY serve this path — critical: claiming alternates
 *  for non-existent URLs (e.g. /ja-jp/privacy when JP only has homepage)
 *  poisons Google's hreflang graph and racks up 404s in Search Console. */
function alternatesFor(
  path: string,
  availableLocales: readonly LocaleCode[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of availableLocales) {
    const url = urlFor(locale, path);
    for (const tag of LOCALES[locale].hreflang) {
      out[tag] = url;
    }
  }
  out["x-default"] = urlFor(DEFAULT_LOCALE, path);
  return out;
}

/** Per-marketing-path spec. `availableLocales` is *the* truth about which
 *  /<locale>/<path> URLs we have actually built and shipped — keep in
 *  lock-step with the file system. When a locale gains a privacy/terms
 *  translation, add its code to that path's `availableLocales`. */
type PathSpec = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
  availableLocales: readonly LocaleCode[];
};

const PATHS: readonly PathSpec[] = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1.0,
    // Homepage exists for every enabled locale (each has app/<locale>/page.tsx).
    availableLocales: ["en", "ja-jp"],
  },
  {
    path: "/privacy",
    changeFrequency: "monthly",
    priority: 0.3,
    // No localized privacy page yet — deferred per scope discussion.
    availableLocales: ["en"],
  },
  {
    path: "/terms",
    changeFrequency: "monthly",
    priority: 0.3,
    // No localized terms page yet — deferred per scope discussion.
    availableLocales: ["en"],
  },
];

/** Served at /sitemap.xml.
 *
 *  Static marketing surfaces only — verdict pages at /<handle>/<shortid>
 *  and /v/<id> are intentionally excluded:
 *    - identical templated metadata across rows = thin-content risk if
 *      bulk-submitted (Google may demote the site)
 *    - genuine discovery happens via X backlinks (the natural signal we
 *      want anyway); if a verdict goes viral, Google finds it via the
 *      inbound links */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];
  for (const { path, changeFrequency, priority, availableLocales } of PATHS) {
    const alternates = { languages: alternatesFor(path, availableLocales) };
    for (const locale of availableLocales) {
      entries.push({
        url: urlFor(locale, path),
        lastModified: now,
        changeFrequency,
        priority,
        alternates,
      });
    }
  }
  return entries;
}
