import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { AnalyzePanel } from "@/components/analyze-panel";
import { SignalsStrip } from "@/components/signals-strip";
import { VsFolklore } from "@/components/vs-folklore";
import { HowItWorks } from "@/components/how-it-works";
import { FAQ } from "@/components/faq";
import { BottomCTA } from "@/components/bottom-cta";
import { Footer } from "@/components/footer";
import { GoogleOneTap } from "@/components/google-one-tap";
import { getSupabaseServer } from "@/lib/supabase-server";

/** JP-specific page metadata. Title + description override the global
 *  defaults from app/layout.tsx so the SERP snippet shows in Japanese.
 *  hreflang matrix mirrors app/page.tsx (must be symmetric — every
 *  variant lists every other variant or Google drops the annotation). */
export const metadata: Metadata = {
  title: "letxcook — Xの下書きを採点。アルゴリズムが評価するか確かめよう。",
  description:
    "Xの下書きを13のエンゲージメントシグナルに基づいて採点し、より強くリライトします。30秒以内に判定が出ます。",
  alternates: {
    canonical: "/ja-jp",
    languages: {
      en: "/",
      "ja-JP": "/ja-jp",
      "x-default": "/",
    },
  },
};

/** Japanese (ja-JP) marketing homepage. Identical to the English root
 *  in component structure — strings come from messages/ja-jp.json via
 *  the locale that app/ja-jp/layout.tsx sets through setRequestLocale.
 *  Future locales (pt-br, es-mx, ar-sa, id-id) follow the same pattern:
 *  one static folder, one layout that sets the locale, one page that
 *  re-uses the marketing component tree. */
export default async function JaJpHomePage() {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  return (
    <main>
      <Navbar />
      <Hero />
      <AnalyzePanel />
      <SignalsStrip />
      <VsFolklore />
      <HowItWorks />
      <FAQ />
      <BottomCTA />
      <Footer />
      <GoogleOneTap signedIn={Boolean(user)} />
    </main>
  );
}
