import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/** Served at /sitemap.xml. Static surfaces only — verdict pages at
 *  /<handle>/<shortid> and /v/<id> are intentionally excluded:
 *    - their metadata title is identical across rows, so bulk-submitting
 *      thousands of them risks tripping Google's thin-content algos
 *    - genuine discovery happens via X backlinks (the natural signal we
 *      want anyway). If a verdict goes viral, Google finds it via the
 *      inbound links; if not, no SEO loss
 *  Add per-row inclusion later if/when verdict titles become unique
 *  enough to stand on their own. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
