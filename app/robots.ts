import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/** Served at /robots.txt. Disallows:
 *   - app surfaces (/dashboard, /api, /auth, /login, /compose) — not SEO content
 *   - X-permalink mirror routes (/i/, /<handle>/status/) — pure runtime
 *     redirects to /?tweet=…#analyze. Letting Google chase them wastes
 *     crawl budget on dead-end 302s. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/api/",
          "/auth/",
          "/login",
          "/compose",
          "/compose/",
          "/i/",
          // X-permalink mirrors at /<handle>/status/<id> also redirect
          // home — wildcard so Google ignores them across all handles.
          "/*/status/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
