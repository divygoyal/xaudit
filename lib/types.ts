export type Grade = "Weak" | "Moderate" | "Strong";
export type Risk = "Low" | "Moderate" | "High";

export type PositiveSignal = {
  name: string;
  grade: Grade;
  reason: string;
  /** Exact phrase from the draft that triggered this finding (or empty if structural / no specific phrase). */
  trigger?: string;
  /** Short 2-4 word label naming the problem when this signal is Weak (e.g. "no question", "vague hook"). */
  fix_label?: string;
};

export type NegativeSignal = {
  name: string;
  risk: Risk;
  reason: string;
  trigger?: string;
  /** Short 2-4 word label naming the issue when risk is Moderate or High (e.g. "saturated genre", "spam pattern"). */
  fix_label?: string;
};

export type StructuralNote = {
  name: string;
  note: string;
};

export type RewriteHighlight = {
  /** Exact verbatim substring from the rewrite text. */
  phrase: string;
  /** 1-2 word label naming what the phrase does (e.g. "hook", "reply trigger", "proof"). */
  label: string;
};

export type RewriteEdit = {
  /** Verbatim substring from the ORIGINAL draft_text being replaced. */
  original_phrase: string;
  /** New replacement text. */
  new_phrase: string;
  /** Which X-algorithm signal this edit addresses (e.g., "Reply"). */
  signal: string;
  /** Short title for the bridge card ("Hook rewritten", "Concrete proof added"). */
  improvement_label: string;
  /** 6-12 word description of why this edit helps. */
  description: string;
};

export type Rewrite = {
  angle: string;
  text: string;
  why_better: string;
  /** Estimated score increase vs the original draft, 0-30. */
  predicted_lift?: number;
  /** Phrases inside the rewrite that demonstrate why it works. */
  highlights?: RewriteHighlight[];
  /** Marks the single primary "Combined" rewrite that fuses all weak-signal fixes. */
  is_primary?: boolean;
  /** Which X-algorithm signals this rewrite addresses. Used for the "fixes applied" checklist on the primary card. */
  addresses_signals?: string[];
  /** Structure-preserving phrase-level edits. Used to power the side-by-side diff view. */
  edits?: RewriteEdit[];
};

export type Verdict = {
  band: "Weak" | "Moderate" | "Strong";
  reason: string;
};

export type LeakAnalysis = {
  /** Exact verbatim substring from draft_text. */
  phrase: string;
  /** 2-4 word issue label. "No question", "Saturated angle", "Weak close". */
  short_label: string;
  /** Which X-algorithm signal this leak affects. */
  signal: string;
  /** "Weak" for weak positives, "Risk" for moderate/high negatives. */
  severity: "Weak" | "Risk";
  /** One-sentence cause. */
  why_it_leaks: string;
  /** One-sentence ranker interpretation. */
  ranker_assumes: string;
  /** 1-2 sentences on how to fix. */
  fix_strategy: string;
  /** A short rewritten version of just this phrase. */
  suggested_rewrite: string;
  /** Points gained if this single leak is fixed (0-25). */
  impact_lift: number;
};

export type AnalysisResult = {
  verdict: Verdict;
  positive_signals: PositiveSignal[];
  negative_signals: NegativeSignal[];
  structural: StructuralNote[];
  rewrites: Rewrite[];
  /** Verbatim text of the draft the model analyzed — echoed from the user's input OR OCR'd from a screenshot. Used for trigger lookups + annotations. */
  draft_text?: string;
  /** Deep per-issue analytical breakdown — used by the marked-up draft section. */
  leaks?: LeakAnalysis[];
  is_mock?: boolean;
};

export const POSITIVE_SIGNALS = [
  "Like",
  "Reply",
  "Repost",
  "Quote",
  "Click",
  "Profile click",
  "Photo expand",
  "Video view",
  "Dwell",
  "Follow",
] as const;

export const NEGATIVE_SIGNALS = ["Not interested", "Block", "Mute", "Report"] as const;
