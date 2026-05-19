import type { AnalysisResult, Grade, Risk } from "./types";

const POS_WEIGHT: Record<Grade, number> = {
  Strong: 10,
  Moderate: 6.5,
  Weak: 2.5,
};

const NEG_PENALTY: Record<Risk, number> = {
  High: 9,
  Moderate: 3,
  Low: 0,
};

/** Compute a 0-100 score from the graded signals. Heuristic, not "the real algorithm." */
export function computeScore(result: AnalysisResult): number {
  let s = 0;
  result.positive_signals.forEach((p) => {
    s += POS_WEIGHT[p.grade];
  });
  result.negative_signals.forEach((n) => {
    s -= NEG_PENALTY[n.risk];
  });
  return Math.max(0, Math.min(100, Math.round(s)));
}

/** Lookup the verdict band from a score (used when we want band ↔ score to stay aligned). */
export function bandFromScore(score: number): Grade {
  if (score >= 72) return "Strong";
  if (score >= 42) return "Moderate";
  return "Weak";
}

export type Tone = {
  hex: string;
  ringClass: string;
  textClass: string;
  bgSoftClass: string;
  borderClass: string;
  glowRgb: string;
};

export function toneByBand(band: Grade): Tone {
  if (band === "Strong") {
    return {
      hex: "var(--moss)",
      ringClass: "ring-moss/40",
      textClass: "text-moss",
      bgSoftClass: "bg-moss/8",
      borderClass: "border-moss/40",
      glowRgb: "rgb(var(--moss))",
    };
  }
  if (band === "Moderate") {
    return {
      hex: "var(--vermillion)",
      ringClass: "ring-vermillion/40",
      textClass: "text-vermillion-glow",
      bgSoftClass: "bg-vermillion/8",
      borderClass: "border-vermillion/40",
      glowRgb: "rgb(var(--vermillion))",
    };
  }
  return {
    hex: "var(--rust)",
    ringClass: "ring-rust/40",
    textClass: "text-rust",
    bgSoftClass: "bg-rust/8",
    borderClass: "border-rust/40",
    glowRgb: "rgb(var(--rust))",
  };
}
