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
          <SectionEyebrow>A real verdict</SectionEyebrow>
          <h2 className="mt-4 font-sans text-display-md font-medium text-paper">
            Here&apos;s what a <span className="serif-italic">verdict</span> looks like.
          </h2>
          <p className="mt-5 text-balance text-[15px] leading-relaxed text-ink-200">
            A real X post, graded across 14 ranking signals — then rewritten to strengthen the
            weakest ones. Hover any change to see exactly which signal it lifts.
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
