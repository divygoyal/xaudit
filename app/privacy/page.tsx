import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy · letxcook",
  description: "How letxcook handles your data.",
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
                explains how information is handled when using our website and
                services.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                2. Information We Collect
              </h2>
              <p>We gather data necessary for service delivery:</p>
              <ul className="ml-5 flex list-disc flex-col gap-2 text-ink-200">
                <li>
                  <span className="font-medium text-paper">
                    Account Information:
                  </span>{" "}
                  Name, email, and profile picture sourced from authentication
                  providers (Google).
                </li>
                <li>
                  <span className="font-medium text-paper">Usage Data:</span>{" "}
                  Anonymous counters stored in first-party cookies to enforce
                  free-tier limits.
                </li>
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                3. Google User Data
              </h2>
              <p>
                letxcook accesses Google user data only to sign you in and
                identify your account.
              </p>
              <ul className="ml-5 flex list-disc flex-col gap-2 text-ink-200">
                <li>
                  <span className="font-medium text-paper">Access:</span> Only
                  data explicitly granted by users is accessed.
                </li>
                <li>
                  <span className="font-medium text-paper">
                    Data Retention and Deletion:
                  </span>{" "}
                  Google user data is retained securely while accounts remain
                  active. Users may request complete deletion by contacting
                  support or revoking application access through Google Account
                  security settings, with permanent removal occurring within 30
                  days.
                </li>
                <li>
                  <span className="font-medium text-paper">Data Sharing:</span>{" "}
                  We do <span className="font-medium text-paper">not</span>{" "}
                  share, transfer, sell, or disclose your Google user data to
                  any third parties.
                </li>
                <li>
                  <span className="font-medium text-paper">AI Models:</span> We
                  explicitly do not share Google user data with AI models for
                  training.
                </li>
                <li>
                  <span className="font-medium text-paper">Limited Use:</span>{" "}
                  Transfer of Google API information adheres to Google&apos;s
                  API Services User Data Policy.
                </li>
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                4. Data Security
              </h2>
              <p>
                Industry-standard protections are implemented, including
                SSL/TLS encryption for connections.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-xl font-medium text-paper">
                5. Contact Us
              </h2>
              <p>
                Questions can be directed to{" "}
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
