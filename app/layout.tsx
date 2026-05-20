import type { Metadata } from "next";
import { Instrument_Serif, Hanken_Grotesk, JetBrains_Mono, Caveat } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-display",
  display: "swap",
  weight: ["400", "500"],
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-handwritten",
  display: "swap",
  weight: ["400", "600", "700"],
});

// Pick the absolute site URL Next.js should use when generating
// metadata URLs (og:image, twitter:image, canonical links, etc.).
// Priority: explicit env var > Vercel-provided URL > localhost dev.
// This is what social platforms see when they crawl shared links —
// hardcoding the wrong domain breaks the OG preview entirely.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  title: "xAudit — Paste your X draft. See if the algorithm will care.",
  description:
    "We grade your X draft against the 13 engagement signals X's open-source ranker tries to predict — and rewrite it stronger. Verdict in under 30 seconds.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "xAudit",
    description: "Paste your X draft. See if the algorithm will care.",
    type: "website",
    // url + siteName + locale satisfy the strict OG spec (og:url is one
    // of the four required properties) and let Slack/Discord render the
    // site label above the share card.
    url: "/",
    siteName: "xAudit",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "xAudit",
    description: "Paste your X draft. See if the algorithm will care.",
  },
};

// Set theme before paint to avoid flash-of-wrong-theme.
const noFlashScript = `
(function(){try{
  var t=localStorage.getItem('xa-theme');
  if(t==='dark'){document.documentElement.classList.add('dark');}
  else if(t==='light'){document.documentElement.classList.remove('dark');}
  else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
    document.documentElement.classList.add('dark');
  }
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrumentSerif.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable} ${caveat.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="bg-ink-950 text-paper antialiased font-sans selection:bg-vermillion selection:text-ink-950">
        <div className="relative isolate min-h-screen overflow-x-hidden">
          {/* fine newsprint grain — blend mode switches per theme */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[60] grain-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            }}
          />
          {/* warm top vignette — color tuned per theme via CSS var */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[600px] bg-vignette-top"
          />
          {children}
        </div>
      </body>
    </html>
  );
}
