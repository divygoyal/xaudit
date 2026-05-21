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
                letxcook accesses Google user data exclusively to authenticate
                your identity and manage your account.
              </p>
              <ul className="ml-5 flex list-disc flex-col gap-2 text-ink-200">
                <li>
                  <span className="font-medium text-paper">Access &amp; Use:</span>{" "}
                  We only access data explicitly granted via the Google OAuth
                  consent screen (Name, Email, and Profile Picture). This data
                  is used solely to create your profile and personalize your
                  dashboard experience.
                </li>
                <li>
                  <span className="font-medium text-paper">
                    Data Retention &amp; Deletion:
                  </span>{" "}
                  Google user data is retained securely while your account
                  remains active. Users may request complete deletion of their
                  data at any time by contacting support, or revoke application
                  access through their Google Account Security Settings.
                  Permanent removal from our databases occurs within 30 days of
                  a deletion request.
                </li>
                <li>
                  <span className="font-medium text-paper">Data Sharing:</span>{" "}
                  We do not share, transfer, sell, or disclose your Google user
                  data to any third parties, except as required for basic
                  system operations.
                </li>
                <li>
                  <span className="font-medium text-paper">AI Models:</span> We
                  explicitly do not use or share Google user data to train,
                  tune, or improve artificial intelligence or machine learning
                  models.
                </li>
                <li>
                  <span className="font-medium text-paper">
                    Limited Use Disclosure:
                  </span>{" "}
                  letxcook&apos;s use and transfer of information received from
                  Google APIs to any other app will adhere to the{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-vermillion-glow underline decoration-vermillion/40 decoration-dotted underline-offset-2 transition-colors hover:text-vermillion"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements.
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
