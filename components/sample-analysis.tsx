import { SAMPLE_DRAFT, SAMPLE_RESULT } from "@/lib/sample-data";
import { computeScore } from "@/lib/score";
import { RecommendedRewrite } from "./recommended-rewrite";
import { SectionEyebrow } from "./signals-strip";

export function SampleAnalysis() {
  const primary =
    SAMPLE_RESULT.rewrites.find((r) => r.is_primary) ?? SAMPLE_RESULT.rewrites[0];
  const currentScore = computeScore(SAMPLE_RESULT);

  return (
    <section id="sample" className="relative border-t border-ink-700/60">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow>The full verdict</SectionEyebrow>
          <h2 className="mt-4 font-sans text-display-md font-medium text-paper">
            Now zoom in on{" "}
            <span className="serif-italic">every change</span>.
          </h2>
          <p className="mt-5 text-balance text-[15px] leading-relaxed text-ink-200">
            Same post you just saw — but here&apos;s the full breakdown. Hover any rewrite to see
            exactly which of the 13 ranking signals it lifts, and why.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-6xl">
          <RecommendedRewrite
            result={SAMPLE_RESULT}
            draftText={SAMPLE_DRAFT}
            primary={primary}
            currentScore={currentScore}
          />
        </div>
      </div>
    </section>
  );
}
