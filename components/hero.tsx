import { getTranslations } from "next-intl/server";
import { HandwrittenUnderline } from "./handwritten-underline";
import { HeroCompareMobile } from "./hero-compare-mobile";
import { HeroTrajectory } from "./hero-trajectory";
import { RecommendedRewrite } from "./recommended-rewrite";
import { Button } from "./ui/button";
import { SAMPLE_DRAFT, SAMPLE_RESULT } from "@/lib/sample-data";
import { computeScore } from "@/lib/score";

export async function Hero() {
  const t = await getTranslations("hero");
  const primary =
    SAMPLE_RESULT.rewrites.find((r) => r.is_primary) ?? SAMPLE_RESULT.rewrites[0];
  const currentScore = computeScore(SAMPLE_RESULT);

  return (
    <section className="relative overflow-hidden">
      <HeroTrajectory />

      <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-6 md:px-10 md:pb-14 md:pt-8">
        <div className="stagger flex flex-col items-center gap-4 text-center md:gap-5">
          {/* headline — compressed to ~60px so the comparison card stays in view */}
          <h1 className="font-sans font-medium leading-[1.04] tracking-[-0.035em] text-paper text-[clamp(2rem,4.4vw,3.75rem)]">
            <span className="block">{t("headline_line1")}</span>
            <span className="block">
              {t.rich("headline_line2", {
                emph: (chunks) => (
                  <span className="relative inline-block">
                    <span className="serif-italic text-paper">{chunks}</span>
                    <HandwrittenUnderline className="absolute -bottom-2 left-0 h-[14px] w-full md:-bottom-2.5 md:h-[18px]" />
                  </span>
                ),
              })}
            </span>
          </h1>

          {/* subhead */}
          <p className="max-w-xl text-balance text-[13.5px] leading-relaxed text-ink-200 md:text-[15px]">
            {t.rich("subhead", {
              strong: (chunks) => <span className="text-paper">{chunks}</span>,
            })}
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <a href="#analyze">
              <Button variant="primary" className="text-[14px]">
                <span>{t("cta_primary")}</span>
                <SparkIcon />
              </Button>
            </a>
            <a href="#sample">
              <Button variant="outline" className="text-[14px]">
                <PlayIcon />
                <span>{t("cta_secondary")}</span>
              </Button>
            </a>
          </div>

          {/* trust microline */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-ink-300">
            <TrustItem>{t("trust_no_signup")}</TrustItem>
            <span className="text-ink-600">·</span>
            <TrustItem>{t("trust_no_storage")}</TrustItem>
            <span className="text-ink-600">·</span>
            <TrustItem>{t("trust_free")}</TrustItem>
          </div>
        </div>

        {/* embedded comparison — sits BELOW the stagger so it has its own delayed entrance */}
        <div id="sample" className="hero-compare-wrap mt-6 md:mt-7">
          {/* mobile: tabbed comparison with stat row + peek */}
          <div className="lg:hidden">
            <HeroCompareMobile
              result={SAMPLE_RESULT}
              draftText={SAMPLE_DRAFT}
              primary={primary}
              currentScore={currentScore}
            />
          </div>
          {/* desktop: full 3-column WhyChanged view */}
          <div className="hero-compare hidden lg:block">
            <RecommendedRewrite
              result={SAMPLE_RESULT}
              draftText={SAMPLE_DRAFT}
              primary={primary}
              currentScore={currentScore}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <CheckIcon />
      <span>{children}</span>
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M2.5 6.8 L5 9.2 L10.5 3.5"
        stroke="rgb(var(--vermillion))"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M7 1 L8 5 L12 6 L8 7 L7 11 L6 7 L2 6 L6 5 Z"
        fill="currentColor"
      />
      <circle cx="11" cy="2" r="0.8" fill="currentColor" />
      <circle cx="2" cy="11" r="0.6" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M2.5 1.5 L9 5.5 L2.5 9.5 Z" fill="currentColor" />
    </svg>
  );
}
