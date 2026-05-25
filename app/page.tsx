import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { AnalyzePanel } from "@/components/analyze-panel";
import { SignalsStrip } from "@/components/signals-strip";
import { VsFolklore } from "@/components/vs-folklore";
import { HowItWorks } from "@/components/how-it-works";
import { Pricing } from "@/components/pricing";
import { FAQ } from "@/components/faq";
import { BottomCTA } from "@/components/bottom-cta";
import { Footer } from "@/components/footer";
import { GoogleOneTap } from "@/components/google-one-tap";
import { getSupabaseServer } from "@/lib/supabase-server";

/** hreflang matrix. Next.js auto-emits these as <link rel="alternate">
 *  in <head>. Must list every enabled locale (full N×N) + x-default for
 *  the spec-compliant signal. As we ship more locales, append entries
 *  here and also bump the matching entry in app/<locale>/page.tsx. */
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      "ja-JP": "/ja-jp",
      "x-default": "/",
    },
  },
};

export default async function HomePage() {
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
      <Pricing />
      <FAQ />
      <BottomCTA />
      <Footer />
      <GoogleOneTap signedIn={Boolean(user)} />
    </main>
  );
}
