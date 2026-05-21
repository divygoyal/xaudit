import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Terms of Service · letxcook",
  description: "The rules of the road for using letxcook.",
};

export default function TermsPage() {
  return (
    <main>
      <Navbar />
      <section className="relative">
        <div className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
          <h1 className="font-serif text-display-md font-medium tracking-tight text-paper">
            Terms of Service
          </h1>
          <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-400">
            Last updated: May 21, 2026
          </p>

          <div className="mt-10 flex flex-col gap-10 text-[15px] leading-relaxed text-ink-200">
            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using letxcook, you agree to be bound by these
                Terms of Service. If you disagree with any part of the terms,
                you may not access the service.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                2. Description of Service
              </h2>
              <p>
                letxcook provides AI-powered grading and rewriting of X
                (Twitter) post drafts via a web app. We reserve the right to
                modify or discontinue the service at any time.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                3. User Accounts
              </h2>
              <p>
                You are responsible for maintaining the security of your
                account and any tokens associated with it. You engage with the
                service at your own risk.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                4. Acceptable Use
              </h2>
              <p>
                You agree not to misuse the service or help anyone else do so.
                This includes not probing, scanning, or testing the
                vulnerability of any system or network.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                5. Disclaimer
              </h2>
              <p>
                The service is provided &ldquo;as is&rdquo; without warranties
                of any kind. The platform generally does not guarantee that it
                will meet your specific requirements or remain uninterrupted.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                6. Contact
              </h2>
              <p>
                Questions about the Terms of Service should be sent to{" "}
                <a
                  href="mailto:letxcook@gmail.com"
                  className="text-vermillion-glow underline decoration-vermillion/40 decoration-dotted underline-offset-2 transition-colors hover:text-vermillion"
                >
                  letxcook@gmail.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
