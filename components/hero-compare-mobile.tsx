"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  TrendingUp,
  Award,
  Eye,
  FileText,
  ArrowLeftRight,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import type { AnalysisResult, Rewrite } from "@/lib/types";
import { CountUp } from "./count-up";
import {
  buildAlignedDiff,
  originalCalloutFallback,
  optimizedCalloutLabel,
  SIGNAL_ICONS,
  type DiffAnnotation,
  type DiffEdit,
} from "./recommended-rewrite";

interface Props {
  result: AnalysisResult;
  draftText: string;
  primary: Rewrite;
  currentScore: number;
}

type Tab = "original" | "changes" | "optimized";

const TAB_ORDER: Tab[] = ["original", "changes", "optimized"];
const SWIPE_THRESHOLD = 48; // pixels

export function HeroCompareMobile({ result, draftText, primary, currentScore }: Props) {
  const t = useTranslations("hero_compare_mobile");
  const [activeTab, setActiveTab] = useState<Tab>("optimized");
  const lift = primary.predicted_lift ?? 0;
  const projectedScore = Math.min(100, currentScore + lift);

  const effectiveDraft = useMemo(() => {
    const typed = (draftText ?? "").trim();
    return typed || (result.draft_text ?? "").trim();
  }, [draftText, result.draft_text]);

  const aligned = useMemo(
    () => buildAlignedDiff(effectiveDraft, primary),
    [effectiveDraft, primary]
  );

  // PEEK target: when looking at Optimized, peek the Original (where we came
  // from). When looking at Original, peek the Optimized (the payoff). When on
  // Changes, peek the Optimized — that's the result those changes produce.
  const peekTab: Tab =
    activeTab === "optimized"
      ? "original"
      : activeTab === "original"
        ? "optimized"
        : "optimized";

  // Swipe handlers — bind to the content area
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    touchStartRef.current = null;
    // require horizontal-dominant gesture so vertical scroll isn't hijacked
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const currentIdx = TAB_ORDER.indexOf(activeTab);
    const nextIdx =
      dx < 0
        ? Math.min(currentIdx + 1, TAB_ORDER.length - 1)
        : Math.max(currentIdx - 1, 0);
    if (nextIdx !== currentIdx) setActiveTab(TAB_ORDER[nextIdx]);
  };

  return (
    <section className="hero-compare-mobile relative overflow-hidden rounded-2xl border border-vermillion/55 bg-ink-900 shadow-[0_24px_70px_-30px_rgba(255,69,0,0.45),0_0_44px_-22px_rgba(255,69,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-px left-0 h-px w-full bg-gradient-to-r from-transparent via-vermillion to-transparent"
      />
      {/* warm vermillion glow bleeding in from the top edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(60%_120%_at_50%_0%,rgba(255,69,0,0.18)_0%,transparent_65%)]"
      />

      {/* Header */}
      <header className="relative flex items-center justify-between gap-3 border-b border-ink-700/60 px-4 py-2.5">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-vermillion-glow drop-shadow-[0_0_10px_rgba(255,138,77,0.45)]">
          <Sparkles size={11} strokeWidth={2.4} />
          {t("header_eyebrow")}
        </div>
      </header>

      {/* 3-stat row — values tick up to dramatize the lift */}
      <div className="relative grid grid-cols-3 gap-2 border-b border-ink-700/60 px-3 py-3">
        <StatCard
          label={t("stat_signal_score")}
          value={currentScore}
          suffix="/100"
          tone="rust"
          delay={0.9}
        />
        <StatCard
          label={t("stat_predicted")}
          value={projectedScore}
          suffix="/100"
          tone="moss"
          delay={1.1}
          duration={1500}
        />
        <StatCard
          label={t("stat_improvement")}
          value={lift}
          prefix="+"
          suffix="pts"
          tone="moss-strong"
          delay={1.3}
          duration={1700}
          flashOnComplete
          icon={<TrendingUp size={10} strokeWidth={2.6} />}
        />
      </div>

      {/* Tab bar */}
      <div className="relative grid grid-cols-3 gap-1.5 border-b border-ink-700/60 px-3 py-2">
        <TabButton
          active={activeTab === "original"}
          onClick={() => setActiveTab("original")}
          icon={FileText}
          label={t("tab_original")}
          tone="rust"
        />
        <TabButton
          active={activeTab === "changes"}
          onClick={() => setActiveTab("changes")}
          icon={ArrowLeftRight}
          label={t("tab_changes")}
          tone="vermillion"
        />
        <TabButton
          active={activeTab === "optimized"}
          onClick={() => setActiveTab("optimized")}
          icon={Award}
          label={t("tab_optimized")}
          tone="moss"
        />
      </div>

      {/* Active tab content */}
      <div
        className="px-4 py-4"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div key={activeTab} className="hero-compare-tab-enter">
          {activeTab === "original" && (
            <OriginalView
              draftText={effectiveDraft}
              annotations={aligned.originalAnnotations}
            />
          )}
          {activeTab === "changes" && <ChangesView edits={aligned.edits} />}
          {activeTab === "optimized" && (
            <OptimizedView
              text={aligned.optimizedText || primary.text}
              annotations={aligned.optimizedAnnotations}
            />
          )}
        </div>
      </div>

      {/* PEEK card — always shows the contextually-relevant other side */}
      <div className="px-4 pb-4">
        <PeekCard
          tab={peekTab}
          draftText={effectiveDraft}
          optimizedText={aligned.optimizedText || primary.text}
          onSwitch={() => setActiveTab(peekTab)}
        />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat row
// ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  prefix,
  suffix,
  tone,
  icon,
  delay = 0,
  duration = 1400,
  flashOnComplete = false,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  tone: "rust" | "moss" | "moss-strong";
  icon?: React.ReactNode;
  delay?: number;
  duration?: number;
  flashOnComplete?: boolean;
}) {
  // Tone palette: each card gets a tinted border + inner halo + outer glow
  // so the colour reads even on a dark surface. Improvement card runs
  // hotter (more saturated) since it's the headline number.
  const config =
    tone === "rust"
      ? {
          border: "border-rust/55",
          bg: "bg-rust/[0.07]",
          text: "text-rust-glow",
          shadow:
            "shadow-[inset_0_0_12px_-4px_rgba(200,85,61,0.38),0_0_18px_-10px_rgba(230,115,86,0.55)]",
        }
      : tone === "moss-strong"
        ? {
            border: "border-moss/65",
            bg: "bg-moss/[0.12]",
            text: "text-moss-glow",
            shadow:
              "shadow-[inset_0_0_14px_-3px_rgba(127,176,105,0.55),0_0_22px_-8px_rgba(168,220,138,0.65)]",
          }
        : {
            border: "border-moss/50",
            bg: "bg-moss/[0.08]",
            text: "text-moss-glow",
            shadow:
              "shadow-[inset_0_0_12px_-4px_rgba(127,176,105,0.42),0_0_18px_-10px_rgba(168,220,138,0.5)]",
          };

  // When the count-up completes, briefly add a flash class for the
  // "Improvement" headline number. Subtle pop, ~700ms.
  const [flashed, setFlashed] = useState(false);
  useEffect(() => {
    if (!flashOnComplete) return;
    const t = window.setTimeout(() => setFlashed(true), (delay + duration / 1000) * 1000);
    const off = window.setTimeout(() => setFlashed(false), (delay + duration / 1000 + 0.7) * 1000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(off);
    };
  }, [flashOnComplete, delay, duration]);

  return (
    <div
      className={`hero-cm-stat relative flex flex-col gap-0.5 rounded-xl border px-2 py-1.5 ${config.border} ${config.bg} ${config.shadow} ${flashed ? "is-flashing" : ""}`}
    >
      <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      <span
        className={`inline-flex items-baseline gap-1 font-mono text-[14px] font-semibold tabular-nums ${config.text}`}
      >
        {icon && <span className="self-center">{icon}</span>}
        {prefix && <span>{prefix}</span>}
        <CountUp value={value} duration={duration} delay={delay} />
        {suffix && (
          <span className="font-mono text-[9.5px] font-medium text-ink-400">
            {suffix}
          </span>
        )}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab buttons
// ─────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof FileText;
  label: string;
  tone: "rust" | "vermillion" | "moss";
}) {
  // Active state: tinted bg + glow halo in the tone's colour. Box-shadow
  // uses the glow variant so the bloom reads even on a dark page surface.
  const activeClasses =
    tone === "rust"
      ? "border-rust/65 bg-rust/[0.16] text-rust-glow shadow-[0_0_18px_-4px_rgba(230,115,86,0.55),inset_0_0_10px_-4px_rgba(200,85,61,0.35)]"
      : tone === "vermillion"
        ? "border-vermillion/65 bg-vermillion/[0.16] text-vermillion-glow shadow-[0_0_20px_-4px_rgba(255,138,77,0.6),inset_0_0_10px_-4px_rgba(255,69,0,0.35)]"
        : "border-moss/65 bg-moss/[0.18] text-moss-glow shadow-[0_0_20px_-4px_rgba(168,220,138,0.6),inset_0_0_10px_-4px_rgba(127,176,105,0.4)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-1.5 py-1.5 text-[11.5px] transition-all ${
        active
          ? `${activeClasses} font-semibold`
          : "border-ink-700 bg-transparent text-ink-300 hover:border-ink-500 hover:text-paper"
      }`}
    >
      <Icon size={11} strokeWidth={2.4} />
      <span>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Original / Optimized views — annotated text
// ─────────────────────────────────────────────────────────────

function OriginalView({
  draftText,
  annotations,
}: {
  draftText: string;
  annotations: DiffAnnotation[];
}) {
  // Transform raw labels ("Hook rewritten") into problem-oriented copy
  // ("Vague hook") so it reads as a *diagnosis* on the original side,
  // matching the desktop callout copy exactly.
  const calloutAnnotations = useMemo(
    () =>
      annotations.map((a) => ({
        ...a,
        label: originalCalloutFallback(a.label, a.signal),
      })),
    [annotations]
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-rust-glow">
          <Eye size={10} strokeWidth={2.4} />
          Original draft
        </span>
        <span className="rounded-full border border-rust/55 bg-rust/15 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-rust-glow shadow-[0_0_12px_-4px_rgba(230,115,86,0.5)]">
          BEFORE
        </span>
      </div>
      <AnnotatedBody text={draftText} annotations={calloutAnnotations} tone="rust" />
    </div>
  );
}

function OptimizedView({
  text,
  annotations,
}: {
  text: string;
  annotations: DiffAnnotation[];
}) {
  // Solution-oriented copy ("Hook written", "Reply trigger") for the
  // after side — same transformer the desktop callout uses.
  const calloutAnnotations = useMemo(
    () =>
      annotations.map((a) => ({
        ...a,
        label: optimizedCalloutLabel(a.label, a.signal),
      })),
    [annotations]
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-moss-glow">
          <Award size={10} strokeWidth={2.4} />
          Optimized version
        </span>
        <span className="rounded-full border border-moss/55 bg-moss/15 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-moss-glow shadow-[0_0_12px_-4px_rgba(168,220,138,0.55)]">
          AFTER
        </span>
      </div>
      <AnnotatedBody text={text} annotations={calloutAnnotations} tone="moss" />
    </div>
  );
}

// Renders body text with phrase highlights and inline numbered callouts:
//   [text] [tinted phrase] ⓘ Label [text continues]
function AnnotatedBody({
  text,
  annotations,
  tone,
}: {
  text: string;
  annotations: DiffAnnotation[];
  tone: "rust" | "moss";
}) {
  // Active pulse — when user taps a numbered callout, the linked phrase
  // pulses for ~900ms. Lets users connect callouts to phrases on mobile
  // (replacing the desktop's hover state which doesn't exist on touch).
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  useEffect(() => {
    if (pulseIndex === null) return;
    const t = window.setTimeout(() => setPulseIndex(null), 900);
    return () => window.clearTimeout(t);
  }, [pulseIndex]);
  const triggerPulse = (idx: number) => {
    // Re-trigger even if same index was already active by going through null
    setPulseIndex(null);
    requestAnimationFrame(() => setPulseIndex(idx));
  };
  // Build sorted, deduped spans
  type Span = {
    start: number;
    end: number;
    label: string;
    editIndex: number;
  };
  const spans: Span[] = [];
  annotations.forEach((a) => {
    const idx = text.indexOf(a.phrase);
    if (idx === -1) return;
    const leading = a.phrase.match(/^\s+/)?.[0].length ?? 0;
    const trailing = a.phrase.match(/\s+$/)?.[0].length ?? 0;
    const start = idx + leading;
    const end = idx + a.phrase.length - trailing;
    if (end <= start) return;
    spans.push({ start, end, label: a.label, editIndex: a.editIndex });
  });
  spans.sort((a, b) => a.start - b.start);
  const dedup: Span[] = [];
  spans.forEach((s) => {
    const last = dedup[dedup.length - 1];
    if (last && s.start < last.end) return;
    dedup.push(s);
  });

  type Seg =
    | { type: "text"; text: string }
    | { type: "phrase"; text: string; label: string; editIndex: number };
  const segments: Seg[] = [];
  let cursor = 0;
  dedup.forEach((s) => {
    if (s.start > cursor) segments.push({ type: "text", text: text.slice(cursor, s.start) });
    segments.push({
      type: "phrase",
      text: text.slice(s.start, s.end),
      label: s.label,
      editIndex: s.editIndex,
    });
    cursor = s.end;
  });
  if (cursor < text.length) segments.push({ type: "text", text: text.slice(cursor) });

  const isMoss = tone === "moss";

  return (
    <p className="whitespace-pre-line text-[13.5px] leading-[1.78] text-paper">
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.text}</span>;
        const delay = (0.15 + seg.editIndex * 0.18).toFixed(2);
        const labelDelay = (parseFloat(delay) + 0.18).toFixed(2);
        return (
          <span key={i}>
            {/* Highlighter-pen paint-in. The phrase background is a
                linear-gradient whose background-size animates from 0% to
                100% width — looks like someone is highlighting the text
                in real time. */}
            <span
              className={`hero-cm-phrase rounded-[4px] px-[4px] py-[1.5px] ${
                isMoss ? "is-moss" : "is-rust"
              } ${pulseIndex === seg.editIndex ? "is-pulsing" : ""}`}
              style={{
                animationDelay: `${delay}s`,
                boxDecorationBreak: "clone",
                WebkitBoxDecorationBreak: "clone",
              }}
            >
              {seg.text}
            </span>
            {/* Use the same .diff-callout markup the desktop uses so the
                dotted leader + numbered badge + sans-serif label match
                pixel-for-pixel (just at mobile scale). Tappable so users
                can re-trigger the phrase pulse and confirm the link. */}
            <span
              role="button"
              tabIndex={0}
              onClick={() => triggerPulse(seg.editIndex)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  triggerPulse(seg.editIndex);
                }
              }}
              className={`diff-callout cursor-pointer ${isMoss ? "is-green" : ""} ${
                pulseIndex === seg.editIndex ? "is-active" : ""
              }`}
              style={{ animationDelay: `${labelDelay}s` }}
            >
              <span className="diff-callout-line" />
              <span className="diff-callout-badge">{seg.editIndex + 1}</span>
              <span className="diff-callout-label">{seg.label}</span>
            </span>
          </span>
        );
      })}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────
// Changes view — 3 improvement cards
// ─────────────────────────────────────────────────────────────

function ChangesView({ edits }: { edits: DiffEdit[] }) {
  const t = useTranslations("hero_compare_mobile");
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-vermillion-glow">
          <Sparkles size={10} strokeWidth={2.4} />
          {t("key_improvements", { count: edits.length })}
        </span>
        <span className="rounded-full border border-vermillion/55 bg-vermillion/15 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-vermillion-glow shadow-[0_0_12px_-4px_rgba(255,138,77,0.55)]">
          {t("diff_badge")}
        </span>
      </div>
      {edits.map((edit, idx) => (
        <ChangeCard key={edit.index} edit={edit} idx={idx} />
      ))}
    </div>
  );
}

function ChangeCard({ edit, idx }: { edit: DiffEdit; idx: number }) {
  const Icon = SIGNAL_ICONS[edit.signal] ?? MessageCircle;
  return (
    <div
      className="hero-cm-change-card flex flex-col gap-1.5 rounded-xl border border-vermillion/45 bg-vermillion/[0.07] p-3 shadow-[0_0_18px_-10px_rgba(255,138,77,0.55)]"
      style={{ animationDelay: `${0.1 + idx * 0.12}s` }}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-vermillion-glow text-ink-950 font-mono text-[10px] font-bold tabular-nums shadow-[0_0_12px_-2px_rgba(255,138,77,0.7)]">
          {edit.index + 1}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-vermillion/45 bg-vermillion/15 px-1.5 py-[1px] font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-vermillion-glow">
          <Icon size={9} strokeWidth={2.4} />
          {edit.signal}
        </span>
      </div>
      <div className="text-[13.5px] font-semibold leading-snug text-paper">
        {edit.improvementLabel}
      </div>
      <p className="text-[12px] leading-snug text-ink-300">{edit.description}</p>
      {(edit.originalPhrase || edit.newPhrase) && (
        <div className="mt-1 grid gap-1.5">
          {edit.originalPhrase && (
            <div className="flex items-start gap-1.5 rounded-lg border border-rust/35 bg-rust/[0.08] px-2 py-1.5 text-[11.5px] leading-snug text-ink-300">
              <span className="font-mono text-rust-glow">−</span>
              <span className="line-clamp-2">{shorten(edit.originalPhrase)}</span>
            </div>
          )}
          {edit.newPhrase && (
            <div className="flex items-start gap-1.5 rounded-lg border border-moss/40 bg-moss/[0.10] px-2 py-1.5 text-[11.5px] leading-snug text-paper">
              <span className="font-mono text-moss-glow">+</span>
              <span className="line-clamp-2">{shorten(edit.newPhrase)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function shorten(s: string, max = 110) {
  const normalized = s.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return normalized.slice(0, max - 1).trim() + "…";
}

// ─────────────────────────────────────────────────────────────
// Peek card
// ─────────────────────────────────────────────────────────────

function PeekCard({
  tab,
  draftText,
  optimizedText,
  onSwitch,
}: {
  tab: Tab;
  draftText: string;
  optimizedText: string;
  onSwitch: () => void;
}) {
  const t = useTranslations("hero_compare_mobile");
  const isOriginal = tab === "original";
  const isChanges = tab === "changes";
  // Changes peek is not contextual here — peekTab is always optimized or original.
  // But defensive: render generic CTA if tab === "changes".
  const text = isOriginal ? draftText : optimizedText;
  const toneCls = isOriginal ? "text-rust-glow" : "text-moss-glow";
  const Icon = isOriginal ? Eye : Award;
  const label = isOriginal ? t("peek_original_label") : t("peek_optimized_label");
  const subLabel = isOriginal ? t("peek_before_sub") : t("peek_after_sub");

  return (
    <button
      type="button"
      onClick={onSwitch}
      className="hero-cm-peek group flex w-full items-start gap-3 rounded-xl border border-ink-700 bg-ink-950/60 px-3 py-2.5 text-left transition-all hover:border-ink-500 hover:bg-ink-950/80 active:scale-[0.98]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em] ${toneCls}`}>
            <Icon size={10} strokeWidth={2.4} />
            {label} ({subLabel})
          </span>
          <span className="rounded-full border border-ink-700/80 bg-ink-900/60 px-1.5 py-[1px] font-mono text-[8.5px] uppercase tracking-[0.18em] text-ink-400">
            {t("peek_badge")}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-ink-300">
          {isChanges ? t("tap_to_see_diff") : text}
        </p>
      </div>
      <ChevronRight
        size={14}
        strokeWidth={2.2}
        className="mt-1 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5"
      />
    </button>
  );
}
