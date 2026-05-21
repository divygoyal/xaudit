import type { MetadataRoute } from "next";

/** PWA manifest. Next.js auto-injects <link rel="manifest"> in the head
 *  and serves this at /manifest.webmanifest. Covers "Add to home screen"
 *  on iOS / Android, and gives the OS theme-color when the site is
 *  installed as a standalone PWA. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "letxcook",
    short_name: "letxcook",
    description:
      "Grade your X drafts before you ship — across the 13 engagement signals X's own ranker tries to predict.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0b09",
    theme_color: "#ff4500",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
      {
        src: "/logo-hero.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
    ],
  };
}
