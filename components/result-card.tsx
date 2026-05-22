"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import type {
  AnalysisResult,
  Grade,
  NegativeSignal,
  PositiveSignal,
  RewriteHighlight,
  Risk,
} from "@/lib/types";
import { computeScore, toneByBand } from "@/lib/score";
import { CountUp } from "./count-up";
import { RecommendedRewrite } from "./recommended-rewrite";
import { HeroCompareMobile } from "./hero-compare-mobile";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Quote,
  MousePointerClick,
  UserRound,
  Image as ImageIcon,
  PlayCircle,
  Timer,
  UserPlus,
  EyeOff,
  Ban,
  VolumeX,
  Flag,
  Check,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Copy,
  ShieldCheck,
  Star,
  Plus,
  Minus,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

const POS_ICONS: Record<string, LucideIcon> = {
  Like: Heart,
  Reply: MessageCircle,
  Repost: Repeat2,
  Quote: Quote,
  Click: MousePointerClick,
  "Profile click": UserRound,
  "Photo expand": ImageIcon,
  "Video view": PlayCircle,
  Dwell: Timer,
  Follow: UserPlus,
};
const NEG_ICONS: Record<string, LucideIcon> = {
  "Not interested": EyeOff,
  Block: Ban,
  Mute: VolumeX,
  Report: Flag,
};

const gradeWeight: Record<Grade, number> = { Strong: 3, Moderate: 2, Weak: 1 };
const riskWeight: Record<Risk, number> = { High: 3, Moderate: 2, Low: 1 };

/** Picks 3 strongest positives, 3 weakest positives, top negatives, recommended rewrite. */
export function useResultDerivations(result: AnalysisResult) {
  return useMemo(() => {
    const score = computeScore(result);
    const tone = toneByBand(result.verdict.band);

    const strengths = [...result.positive_signals]
      .sort((a, b) => gradeWeight[b.grade] - gradeWeight[a.grade])
      .slice(0, 3);

    const weakest = [...result.positive_signals]
      .sort((a, b) => gradeWeight[a.grade] - gradeWeight[b.grade])
      .slice(0, 3);

    const topNegatives = [...result.negative_signals]
      .sort((a, b) => riskWeight[b.risk] - riskWeight[a.risk])
      .slice(0, 3);

    // recommended rewrite — match angle to weakest positive name, else highest predicted_lift
    let recommendedIdx = 0;
    if (result.rewrites.length) {
      const weakestName = weakest[0]?.name?.toLowerCase() ?? "";
      const angleMap: Record<string, string> = {
        reply: "Reply-hook",
        click: "Click-hook",
        follow: "Follow-hook",
      };
      const wantedAngle = Object.entries(angleMap).find(([k]) => weakestName.includes(k))?.[1];
      if (wantedAngle) {
        const idx = result.rewrites.findIndex((r) => r.angle === wantedAngle);
        if (idx !== -1) recommendedIdx = idx;
        else recommendedIdx = pickHighestLift(result);
      } else {
        recommendedIdx = pickHighestLift(result);
      }
    }
    return { score, tone, strengths, weakest, topNegatives, recommendedIdx };
  }, [result]);
}

function pickHighestLift(r: AnalysisResult) {
  let bestIdx = 0;
  let bestLift = r.rewrites[0]?.predicted_lift ?? 0;
  r.rewrites.forEach((rw, i) => {
    if ((rw.predicted_lift ?? 0) > bestLift) {
      bestIdx = i;
      bestLift = rw.predicted_lift ?? 0;
    }
  });
  return bestIdx;
}

// ─────────────────────────────────────────────────────────────
// COMPACT AUDIT RESULT (lives in the right column of the workshop)
// ─────────────────────────────────────────────────────────────

interface AuditResultProps {
  result: AnalysisResult;
}

export function AuditResultCompact({ result }: AuditResultProps) {
  const t = useTranslations("result_card");
  const { score, tone, weakest, recommendedIdx } = useResultDerivations(result);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const chips = useMemo(() => {
    const reply = result.positive_signals.find((s) => s.name === "Reply");
    const click = result.positive_signals.find((s) => s.name === "Click");
    const highestRisk = [...result.negative_signals].sort(
      (a, b) => riskWeight[b.risk] - riskWeight[a.risk]
    )[0];
    return [
      {
        label: t("chip_reply_bait"),
        value: reply?.grade ?? "—",
        icon: MessageCircle,
        kind: "grade" as const,
      },
      {
        label: t("chip_click_intent"),
        value: click?.grade ?? "—",
        icon: MousePointerClick,
        kind: "grade" as const,
      },
      {
        label: t("chip_risk_level"),
        value: highestRisk?.risk ?? "—",
        icon: ShieldCheck,
        kind: "risk" as const,
      },
    ];
  }, [result, t]);

  const recommendedRewrite = result.rewrites[recommendedIdx];

  return (
    <div className="space-y-3">
      {result.is_mock && (
        <div className="rounded-lg border border-vermillion/30 bg-vermillion/5 px-3 py-1.5 text-[11px] text-vermillion-glow">
          <span className="font-mono uppercase tracking-wider">{t("demo_mode_label")}</span>
          <span className="ml-2 text-ink-200">{t("demo_mode_body")}</span>
        </div>
      )}

      <div
        className={`relative overflow-hidden rounded-2xl border ${tone.borderClass} bg-ink-900/40 shadow-[0_18px_60px_-30px_rgba(75,40,15,0.18)]`}
      >
        {/* HEADER — eyebrow + verdict + score */}
        <div className="px-5 py-5 md:px-6 md:py-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-400">
            Audit result
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-4">
            {/* verdict */}
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-5xl tracking-tight text-paper md:text-[58px]">
                  <span className="serif-italic">{result.verdict.band}</span>
                  <span style={{ color: tone.glowRgb }}>.</span>
                </span>
              </div>
            </div>
            {/* score */}
            <div className="text-right">
              <div className="flex items-baseline gap-1">
                <CountUp
                  value={score}
                  duration={1400}
                  className={`font-serif text-5xl tracking-tight ${tone.textClass} md:text-[58px]`}
                />
                <span className="font-mono text-xs text-ink-400">/100</span>
              </div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400">
                Overall score
              </div>
            </div>
          </div>

          {/* chips */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {chips.map((c) => {
              const t = c.kind === "grade" ? gradeTone(c.value as Grade) : riskTone(c.value as Risk);
              return (
                <div
                  key={c.label}
                  className={`flex items-center gap-2 rounded-lg border ${t.iconBox} px-3 py-2`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${t.iconBg}`}>
                    <c.icon size={12} className={t.iconColor} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[11.5px] text-paper">{c.label}</div>
                    <div className={`font-mono text-[10px] uppercase tracking-wider ${t.label}`}>
                      {c.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BIGGEST FIX inset */}
          {recommendedRewrite && weakest[0] && (
            <div className="relative mt-5 overflow-hidden rounded-xl border border-vermillion/40 bg-vermillion/[0.04] px-4 py-4">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-px left-0 h-px w-full bg-gradient-to-r from-transparent via-vermillion to-transparent"
              />
              <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-vermillion-glow">
                Biggest fix
              </div>
              <h3 className="mt-1.5 font-serif text-2xl tracking-tight text-paper">
                Strengthen the <span className="serif-italic">{weakest[0].name.toLowerCase()}</span>{" "}
                signal.
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-200">
                {recommendedRewrite.why_better}
              </p>
              <a
                href="#rewrite-recommended"
                className="group mt-4 inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900 px-3.5 py-2 text-[12px] text-paper transition-all hover:border-vermillion hover:bg-ink-800"
              >
                See rewritten versions
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          )}
        </div>

        {/* Full breakdown — collapsible at bottom */}
        <button
          onClick={() => setShowBreakdown((v) => !v)}
          className="group flex w-full items-center justify-between border-t border-ink-700/60 bg-ink-900/30 px-5 py-3 text-left transition-colors hover:bg-ink-900/50 md:px-6"
        >
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-300">
            {t("full_breakdown_label")}
          </div>
          <ChevronDown
            size={15}
            className={`text-ink-300 transition-transform duration-300 ${
              showBreakdown ? "rotate-180" : ""
            }`}
          />
        </button>

        {showBreakdown && (
          <div className="border-t border-ink-700/60 bg-ink-900/20 px-5 py-4 md:px-6 md:py-5">
            <CompactSignalGrid label={t("positive_rewarded")} signals={result.positive_signals} kind="positive" />
            <div className="mt-4">
              <CompactSignalGrid label={t("negative_punished")} signals={result.negative_signals} kind="negative" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REWRITES GRID — full-width 3 columns
// ─────────────────────────────────────────────────────────────

export function RewritesGrid({ result, draftText = "" }: AuditResultProps & { draftText?: string }) {
  const t = useTranslations("result_card");
  const { score } = useResultDerivations(result);
  const [showAlternates, setShowAlternates] = useState(false);

  if (!result.rewrites.length) return null;

  // Identify the primary (Combined) rewrite. Prefer is_primary flag, fall back
  // to angle === "Combined" / "Hybrid", finally to the highest-lift rewrite.
  const primaryIdx = (() => {
    const flagged = result.rewrites.findIndex((r) => r.is_primary);
    if (flagged !== -1) return flagged;
    const byAngle = result.rewrites.findIndex(
      (r) => r.angle === "Combined" || r.angle === "Hybrid"
    );
    if (byAngle !== -1) return byAngle;
    let bestIdx = 0;
    let bestLift = result.rewrites[0]?.predicted_lift ?? 0;
    result.rewrites.forEach((r, i) => {
      if ((r.predicted_lift ?? 0) > bestLift) {
        bestIdx = i;
        bestLift = r.predicted_lift ?? 0;
      }
    });
    return bestIdx;
  })();

  const primary = result.rewrites[primaryIdx];
  const alternates = result.rewrites.filter((_, i) => i !== primaryIdx);

  // Show every signal the Combined rewrite addresses — trust the model's list.
  // No filtering: the rewrite genuinely strengthens both weak signals (fixing) AND
  // already-OK ones (reinforcing). Hiding either misleads the user about the rewrite's value.
  const fixesApplied = primary.addresses_signals ?? [];

  const primaryLift = primary.predicted_lift ?? 0;
  const primaryNewScore = Math.min(100, score + primaryLift);

  return (
    <div>
      {/* PRIMARY — the premium Recommended Rewrite section.
          Mobile gets the tabbed compact view; desktop keeps the full 3-col. */}
      <div className="lg:hidden">
        <HeroCompareMobile
          result={result}
          draftText={draftText}
          primary={primary}
          currentScore={score}
        />
      </div>
      <div className="hidden lg:block">
        <RecommendedRewrite
          result={result}
          draftText={draftText}
          primary={primary}
          currentScore={score}
        />
      </div>

      {/* ALTERNATES — collapsible */}
      {alternates.length > 0 && (
        <div className="mt-5">
          <button
            onClick={() => setShowAlternates((v) => !v)}
            className="group relative flex w-full items-center justify-between overflow-hidden rounded-xl border border-dashed border-vermillion/45 bg-gradient-to-r from-vermillion/[0.09] via-ink-900/55 to-moss/[0.08] px-4 py-3.5 text-left shadow-[0_18px_45px_-36px_rgba(214,58,0,0.45)] transition-all hover:-translate-y-[1px] hover:border-vermillion/70 hover:bg-vermillion/[0.08]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-vermillion/70 to-transparent"
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-vermillion-glow">
                <Sparkles size={11} strokeWidth={2.4} />
                {showAlternates
                  ? t("hide_alternatives", { count: alternates.length })
                  : t("see_alternatives", { count: alternates.length })}
              </span>
              <span className="text-[12px] text-ink-300">
                {showAlternates ? "" : t("alternatives_narrower_fix")}
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`shrink-0 text-vermillion-glow transition-transform duration-300 ${
                showAlternates ? "rotate-180" : ""
              }`}
            />
          </button>

          {showAlternates && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {alternates.map((r, altIdx) => {
                const lift = r.predicted_lift ?? 0;
                const newScore = Math.min(100, score + lift);
                return (
                  <article
                    key={`${r.angle}-${altIdx}`}
                    data-rewrite-angle={r.angle}
                    className="diff-card is-optimized rewrite-alt-card group relative flex flex-col overflow-hidden rounded-2xl border border-moss/35 bg-ink-900/40 shadow-[0_18px_50px_-34px_rgba(93,143,77,0.22)] transition-all hover:-translate-y-[1px] hover:border-moss/55"
                  >
                    <header className="relative z-10 flex items-center justify-between gap-2 px-4 pb-1 pt-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <Sparkles size={12} className="shrink-0 text-moss" strokeWidth={2.4} />
                        <span className="truncate font-mono text-[10px] uppercase tracking-[0.22em] text-moss">
                          {t("alternative_angle_eyebrow")}
                        </span>
                      </div>
                      {lift > 0 && (
                        <span className="rounded-full border border-moss/30 bg-moss/8 px-2 py-0.5 font-mono text-[9.5px] tabular-nums text-moss">
                          +{lift} pts → {newScore}/100
                        </span>
                      )}
                    </header>
                    <div className="relative z-10 flex-1 px-4 py-4">
                      <div className="mb-3 inline-flex rounded-full border border-moss/35 bg-moss/8 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-moss">
                        {r.angle.replace("-hook", " hook")}
                      </div>
                      {r.highlights && r.highlights.length > 0 ? (
                        <AlternativeRewriteText
                          text={r.text}
                          highlights={r.highlights}
                        />
                      ) : (
                        <p className="whitespace-pre-line text-[13px] leading-relaxed text-paper">
                          {r.text}
                        </p>
                      )}
                    </div>
                    <footer className="relative z-10 flex items-center justify-between gap-2 border-t border-moss/20 bg-moss/[0.035] px-4 py-2.5">
                      <span className="font-mono text-[10px] text-ink-400">
                        {t("chars_suffix", { count: r.text.length })}
                      </span>
                      <CopyBtn text={r.text} />
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HIGHLIGHTS ROW — full-width 2 separate tinted cards
// ─────────────────────────────────────────────────────────────

const STRENGTH_TITLES: Record<string, string> = {
  Like: "Strong like signal",
  Reply: "Strong reply trigger",
  Repost: "Strong repost shape",
  Quote: "Quotable angle",
  Click: "Strong click intent",
  "Profile click": "Distinctive profile pull",
  "Photo expand": "Engaging photo",
  "Video view": "Strong video engagement",
  Dwell: "High dwell potential",
  Follow: "Clear follow signal",
};

const WEAKNESS_FIX_TITLES: Record<string, string> = {
  Like: "Add explicit like intent",
  Reply: "Add a reply trigger",
  Repost: "Make it more shareable",
  Quote: "Make it more quotable",
  Click: "Stronger click motivation",
  "Profile click": "Build a profile pull",
  "Photo expand": "Add a visual",
  "Video view": "Add video media",
  Dwell: "Reward more dwell",
  Follow: "Build a follow case",
};

const NEGATIVE_FIX_TITLES: Record<string, string> = {
  "Not interested": "Reduce perceived risk",
  Block: "Soften abrasive tone",
  Mute: "Trim repetitive patterns",
  Report: "Review policy concerns",
};

function shortReason(reason: string): string {
  const firstSentence = reason.match(/^[^.!?]+[.!?]/);
  if (firstSentence) {
    const s = firstSentence[0].trim();
    if (s.length <= 130) return s;
  }
  if (reason.length <= 110) return reason;
  const trunc = reason.slice(0, 110);
  const lastSpace = trunc.lastIndexOf(" ");
  return trunc.slice(0, lastSpace > 60 ? lastSpace : 110) + "…";
}

export function HighlightsRow({ result }: AuditResultProps) {
  const { strengths, weakest, topNegatives } = useResultDerivations(result);

  const weakItems = [
    ...weakest
      .filter((s) => s.grade !== "Strong")
      .map((s) => ({
        key: `pos-${s.name}`,
        signalName: s.name,
        title: WEAKNESS_FIX_TITLES[s.name] ?? `Boost ${s.name.toLowerCase()}`,
        reason: shortReason(s.reason),
        tone: "pos" as const,
      })),
    ...topNegatives
      .filter((s) => s.risk !== "Low")
      .map((s) => ({
        key: `neg-${s.name}`,
        signalName: s.name,
        title: NEGATIVE_FIX_TITLES[s.name] ?? `Reduce ${s.name.toLowerCase()} risk`,
        reason: shortReason(s.reason),
        tone: "neg" as const,
      })),
  ].slice(0, 3);

  return (
    <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* WHAT'S WORKING */}
      <div className="rounded-2xl border border-ink-700 bg-ink-900/50 p-6 md:p-7">
        <div className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-moss">
          What's working
        </div>
        <ul className="space-y-5">
          {strengths.map((s) => (
            <li key={s.name} className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-moss/12">
                <Check size={13} strokeWidth={2.5} className="text-moss" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-paper">
                    {STRENGTH_TITLES[s.name] ?? s.name}
                  </span>
                  <SignalTag name={s.name} tone="pos" />
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-300">
                  {shortReason(s.reason)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* WHAT TO FIX */}
      <div className="rounded-2xl border border-ink-700 bg-ink-900/50 p-6 md:p-7">
        <div className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-vermillion-glow">
          What to fix
        </div>
        <ul className="space-y-5">
          {weakItems.map((s) => (
            <li key={s.key} className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-vermillion/12">
                <Flag size={12} strokeWidth={2.3} className="text-vermillion-glow" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-paper">{s.title}</span>
                  <SignalTag name={s.signalName} tone={s.tone === "pos" ? "neg-weak" : "neg-risk"} />
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-300">{s.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SignalTag({ name, tone }: { name: string; tone: "pos" | "neg-weak" | "neg-risk" }) {
  const styles =
    tone === "pos"
      ? "border-moss/35 bg-moss/8 text-moss"
      : tone === "neg-weak"
      ? "border-rust/40 bg-rust/8 text-rust"
      : "border-vermillion/40 bg-vermillion/8 text-vermillion-glow";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-[1px] font-mono text-[9px] uppercase tracking-[0.14em] ${styles}`}
      title="Signal from xai-org/x-algorithm"
    >
      {name}
    </span>
  );
}

type AlternativeSegment =
  | { type: "text"; text: string }
  | { type: "highlight"; text: string; label: string; index: number };

function AlternativeRewriteText({
  text,
  highlights,
}: {
  text: string;
  highlights: RewriteHighlight[];
}) {
  const segments = useMemo(() => buildAlternativeSegments(text, highlights), [text, highlights]);

  return (
    <p className="whitespace-pre-line text-[14px] leading-[1.85] text-paper">
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={`${seg.text}-${i}`}>{seg.text}</span>;
        return (
          <span key={`${seg.text}-${i}`}>
            <span
              className="diff-phrase diff-phrase-green"
              style={
                {
                  "--tint-bg": "rgba(118, 190, 91, 0.31)",
                  "--tint-active-bg": "rgba(118, 190, 91, 0.36)",
                } as CSSProperties
              }
            >
              {seg.text}
            </span>
            <span
              className="diff-callout is-green"
              style={{ animationDelay: `${0.12 + seg.index * 0.08}s` }}
            >
              <span className="diff-callout-line" />
              <span className="diff-callout-badge">{seg.index + 1}</span>
              <span className="diff-callout-label">{alternativeHighlightLabel(seg.label)}</span>
            </span>
          </span>
        );
      })}
    </p>
  );
}

function buildAlternativeSegments(text: string, highlights: RewriteHighlight[]): AlternativeSegment[] {
  const spans: { start: number; end: number; label: string; index: number }[] = [];

  highlights.forEach((h) => {
    if (!h.phrase || h.phrase.length < 2) return;
    const start = text.indexOf(h.phrase);
    if (start === -1) return;
    spans.push({ start, end: start + h.phrase.length, label: h.label, index: 0 });
  });

  spans.sort((a, b) => a.start - b.start);

  const merged: typeof spans = [];
  spans.forEach((span) => {
    const previous = merged[merged.length - 1];
    if (previous && span.start < previous.end) return;
    merged.push(span);
  });

  merged.forEach((span, index) => {
    span.index = index;
  });

  const segments: AlternativeSegment[] = [];
  let cursor = 0;

  merged.forEach((span) => {
    if (span.start > cursor) {
      segments.push({ type: "text", text: text.slice(cursor, span.start) });
    }
    segments.push({
      type: "highlight",
      text: text.slice(span.start, span.end),
      label: span.label,
      index: span.index,
    });
    cursor = span.end;
  });

  if (cursor < text.length) {
    segments.push({ type: "text", text: text.slice(cursor) });
  }

  return segments;
}

function alternativeHighlightLabel(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("hook")) return "Hook written";
  if (normalized.includes("reply") || normalized.includes("ask")) return "Reply trigger";
  if (normalized.includes("proof") || normalized.includes("concrete")) return "Proof added";
  if (normalized.includes("quote")) return "Quote sharpened";
  if (normalized.includes("click")) return "Click intent";

  const clean = label
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return clean ? `${clean.charAt(0).toUpperCase()}${clean.slice(1)}` : "Signal";
}

// ─────────────────────────────────────────────────────────────
// STRUCTURAL NOTES — full-width compact
// ─────────────────────────────────────────────────────────────

export function StructuralCompact({ result }: AuditResultProps) {
  const t = useTranslations("result_card");
  if (!result.structural?.length) return null;
  return (
    <div className="mt-10 rounded-2xl border border-ink-700 bg-ink-900/30">
      <div className="border-b border-ink-700/60 px-5 py-3 md:px-6">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-400">
          {t("structural_notes_label")}
        </div>
      </div>
      <ul className="divide-y divide-ink-700/60">
        {result.structural.map((n) => (
          <li
            key={n.name}
            className="flex flex-col gap-1 px-5 py-3 md:flex-row md:items-baseline md:gap-6 md:px-6"
          >
            <span className="min-w-[140px] font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
              {n.name}
            </span>
            <span className="text-[13px] leading-relaxed text-paper">{n.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function CompactSignalGrid({
  label,
  signals,
  kind,
}: {
  label: string;
  signals: (PositiveSignal | NegativeSignal)[];
  kind: "positive" | "negative";
}) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
        {label}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {signals.map((s) => {
          const isPos = kind === "positive";
          const Icon = isPos ? POS_ICONS[s.name] ?? MessageCircle : NEG_ICONS[s.name] ?? Flag;
          const grade = (s as PositiveSignal).grade;
          const risk = (s as NegativeSignal).risk;
          const t = isPos ? gradeTone(grade) : riskTone(risk);
          return (
            <div
              key={s.name}
              className="flex items-start gap-2.5 rounded-xl border border-ink-700 bg-ink-900/30 px-3 py-2.5"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${t.iconBox}`}
              >
                <Icon size={10} className={t.iconColor} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-paper">{s.name}</span>
                  <span className={`font-mono text-[9px] uppercase tracking-wider ${t.label}`}>
                    {isPos ? grade : risk}
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-200">{s.reason}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // noop
    }
  };
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-950 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-200 transition hover:border-ink-500 hover:text-paper"
    >
      {copied ? <Check size={9} strokeWidth={2.4} /> : <Copy size={9} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function gradeTone(g: Grade) {
  if (g === "Strong")
    return {
      iconBox: "border-moss/40",
      iconBg: "bg-moss/15",
      iconColor: "text-moss",
      label: "text-moss",
    };
  if (g === "Moderate")
    return {
      iconBox: "border-vermillion/35",
      iconBg: "bg-vermillion/12",
      iconColor: "text-vermillion-glow",
      label: "text-vermillion-glow",
    };
  return {
    iconBox: "border-rust/40",
    iconBg: "bg-rust/15",
    iconColor: "text-rust",
    label: "text-rust",
  };
}

function riskTone(r: Risk) {
  if (r === "High")
    return {
      iconBox: "border-rust/40",
      iconBg: "bg-rust/15",
      iconColor: "text-rust",
      label: "text-rust",
    };
  if (r === "Moderate")
    return {
      iconBox: "border-vermillion/35",
      iconBg: "bg-vermillion/12",
      iconColor: "text-vermillion-glow",
      label: "text-vermillion-glow",
    };
  return {
    iconBox: "border-moss/35",
    iconBg: "bg-moss/12",
    iconColor: "text-moss",
    label: "text-moss",
  };
}

// Legacy export — composes the full result page (used by ResultCard consumers).
// Kept for compatibility but the workshop now uses individual exports.
export function ResultCard({ result }: { result: AnalysisResult; draftText?: string }) {
  return (
    <div className="space-y-6">
      <AuditResultCompact result={result} />
      <RewritesGrid result={result} />
      <HighlightsRow result={result} />
      <StructuralCompact result={result} />
    </div>
  );
}
