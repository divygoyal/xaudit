import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy · letxcook",
  description:
    "How letxcook handles your data — what we collect, what we don't, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <main>
      <Navbar />
      <section className="relative">
        <div className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
          <h1 className="font-serif text-display-md font-medium tracking-tight text-paper">
            Privacy Policy
          </h1>
          <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-400">
            Last updated: May 21, 2026
          </p>

          <div className="mt-10 flex flex-col gap-10 text-[15px] leading-relaxed text-ink-200">
            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                1. Introduction
              </h2>
              <p>
                letxcook is committed to protecting your privacy. This page
                explains what information we collect when you use our website
                and services, what we do with it, and what your options are.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                2. Information We Collect
              </h2>
              <p>We gather only the data necessary to deliver the service:</p>
              <ul className="ml-5 flex list-disc flex-col gap-2 text-ink-200">
                <li>
                  <span className="font-medium text-paper">
                    Account Information:
                  </span>{" "}
                  name, email, and profile picture sourced from your
                  authentication provider (Google) when you choose to sign in.
                </li>
                <li>
                  <span className="font-medium text-paper">Draft Content:</span>{" "}
                  the X post text or screenshot you paste in for grading is
                  sent to our AI provider for analysis. We do not retain your
                  draft text on our servers after grading is complete unless
                  you are signed in and the analysis is saved to your history.
                </li>
                <li>
                  <span className="font-medium text-paper">Usage Data:</span>{" "}
                  anonymous counters (analyses per session, free-trial usage)
                  stored in a first-party cookie to enforce free-tier limits
                  and prevent abuse.
                </li>
                <li>
                  <span className="font-medium text-paper">
                    Referral Attribution:
                  </span>{" "}
                  if you arrived via a shared verdict link with a referral
                  parameter, we store the referrer&apos;s user ID in a
                  first-party cookie so credit can be applied if you sign up.
                </li>
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                3. How We Use Your Data
              </h2>
              <p>
                Account information is used solely to identify you and protect
                your account. Draft content is sent to our AI provider
                (currently Google Gemini) for grading and rewriting — the AI
                returns its analysis and we display it to you.
              </p>
              <p>
                We do <span className="font-medium text-paper">not</span> share,
                sell, transfer, or disclose your draft content or account
                information to any third parties beyond the AI provider strictly
                required to deliver the grade. We do{" "}
                <span className="font-medium text-paper">not</span> use your
                draft content to train AI models.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                4. Data Retention and Deletion
              </h2>
              <p>
                Anonymous (non-signed-in) drafts are not stored after the
                grading session ends. Drafts submitted by signed-in users are
                retained as part of their analysis history and are deletable on
                request — contact us at the email below and we&apos;ll remove
                them within 30 days.
              </p>
              <p>
                You may delete your account at any time by emailing us. Account
                deletion removes all associated analyses, referral data, and
                profile information within 30 days.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                5. Data Security
              </h2>
              <p>
                We use industry-standard protections including SSL/TLS
                encryption for all connections to our service. Authentication
                tokens and account data are stored in a managed Supabase
                Postgres instance with row-level security policies. Our
                application is hosted on Vercel&apos;s infrastructure.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                6. Contact Us
              </h2>
              <p>
                Questions about this Privacy Policy can be directed to{" "}
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
