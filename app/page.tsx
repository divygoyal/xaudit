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
      <FAQ />
      <BottomCTA />
      <Footer />
      <GoogleOneTap signedIn={Boolean(user)} />
    </main>
  );
}
