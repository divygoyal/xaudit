import type { Metadata } from "next";
import { Instrument_Serif, Hanken_Grotesk, JetBrains_Mono, Caveat } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
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
const rootOgImage = "/ogimage.png";

export const metadata: Metadata = {
  title: "letxcook — Paste your X draft. See if the algorithm will care.",
  description:
    "We grade your X draft against 13 engagement signals — and rewrite it stronger. Verdict in under 30 seconds.",
  metadataBase: new URL(siteUrl),
  // IMPORTANT: setting any field inside metadata.icons OVERRIDES the
  // file-convention link Next.js generates from app/icon.svg. So we
  // must list `icon` explicitly too — otherwise adding `apple` here
  // drops the browser-tab favicon link from the head.
  icons: {
    icon: "/icon.svg",
    apple: "/logo-hero.svg",
  },
  openGraph: {
    title: "letxcook",
    description: "Paste your X draft. See if the algorithm will care.",
    type: "website",
    images: [
      {
        url: rootOgImage,
        width: 1717,
        height: 912,
        alt: "letxcook homepage preview",
      },
    ],
    // url + siteName + locale satisfy the strict OG spec (og:url is one
    // of the four required properties) and let Slack/Discord render the
    // site label above the share card.
    url: "/",
    siteName: "letxcook",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "letxcook",
    description: "Paste your X draft. See if the algorithm will care.",
    images: [rootOgImage],
  },
  // Search-engine site-ownership verification. Each env var is the
  // token a given Webmaster Tools dashboard hands you. Google is
  // already verified via files in /public — included here as the
  // env-var path for completeness.
  //   - Bing:   https://www.bing.com/webmasters/  → Add site → meta tag → copy content
  //   - Yandex: https://webmaster.yandex.com/     → Add site → meta tag → copy content
  //   - Google: https://search.google.com/search-console (alt to file method)
  // When an env var is unset the corresponding tag is simply omitted.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
  // og:logo is emitted manually in the <head> (see RootLayout below)
  // because Next.js's metadata.other field emits <meta name=…> and
  // OG conventions / validators want <meta property=…>. Spec-strict
  // validators flag it as missing if the wrong attribute is used.
};

// Set theme before paint to avoid flash-of-wrong-theme.
// Dark by default — only the user explicitly picking "light" via the
// ThemeToggle (which writes xa-theme=light to localStorage) breaks out
// of dark. New visitors and "no preference" sessions all land on dark.
const noFlashScript = `
(function(){try{
  if(localStorage.getItem('xa-theme')==='light'){
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
}catch(e){
  document.documentElement.classList.add('dark');
}})();
`;

// Microsoft Clarity project id. Hardcoded because it's a public id
// (Clarity's snippet emits it on every page anyway) and we don't want
// the analytics tag to silently drop when an env var is missing on a
// new environment.
const CLARITY_PROJECT_ID = "wx8b8ucek5";

// Schema.org Organization JSON-LD. This is what Google reads to build
// the Knowledge Panel, brand search results, and AI overviews. Far
// more impactful than og:logo for actual SEO — and the format Google
// explicitly documents for "brand logo".
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "letxcook",
  alternateName: "let X cook",
  url: siteUrl,
  logo: `${siteUrl}/logo-hero.svg`,
  description:
    "Grade your X drafts against 13 engagement signals — and rewrite them stronger.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Load the active locale's message catalogue at render time. Without
  // next-intl middleware in place yet (we removed it during Phase 0 to
  // sidestep the [locale]/[username] slug collision), `requestLocale`
  // resolves to undefined and i18n/request.ts falls through to the
  // default locale ("en"). When per-locale static folders ship in
  // Phase 1, each /app/<locale>/layout.tsx will call setRequestLocale()
  // itself and override this default.
  const messages = await getMessages();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrumentSerif.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable} ${caveat.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        {/* og:logo — emitted manually because Next.js metadata.other
            emits <meta name=…> and OG convention wants property=. */}
        <meta property="og:logo" content={`${siteUrl}/logo-hero.svg`} />
        {/* Structured data for Google's Knowledge Panel + brand search. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        {/* Microsoft Clarity — session-recording + heatmaps. Loaded via
            next/script with afterInteractive so it never blocks initial
            paint or hydration. Dashboard: https://clarity.microsoft.com/ */}
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
        </Script>
      </head>
      <body className="bg-ink-950 text-paper antialiased font-sans selection:bg-vermillion selection:text-ink-950">
        <NextIntlClientProvider messages={messages}>
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
