"use client";

import { useMemo, useState, useRef } from "react";
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
import {
  buildAlignedDiff,
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
    <section className="hero-compare-mobile relative overflow-hidden rounded-2xl border border-vermillion/40 bg-ink-900 shadow-[0_24px_70px_-30px_rgba(214,58,0,0.32),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-px left-0 h-px w-full bg-gradient-to-r from-transparent via-vermillion to-transparent"
      />

      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-ink-700/60 px-4 py-3">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-vermillion-glow">
          <Sparkles size={11} strokeWidth={2.4} />
          Recommended rewrite
        </div>
      </header>

      {/* 3-stat row */}
      <div className="grid grid-cols-3 gap-2 border-b border-ink-700/60 px-3 py-3">
        <StatCard
          label="Signal score"
          value={currentScore}
          suffix="/100"
          tone="rust"
        />
        <StatCard
          label="Predicted"
          value={projectedScore}
          suffix="/100"
          tone="moss"
        />
        <StatCard
          label="Improvement"
          value={`+${lift}`}
          suffix="pts"
          tone="moss-strong"
          icon={<TrendingUp size={11} strokeWidth={2.4} />}
        />
      </div>

      {/* Tab bar */}
      <div className="grid grid-cols-3 gap-1.5 border-b border-ink-700/60 px-3 py-2.5">
        <TabButton
          active={activeTab === "original"}
          onClick={() => setActiveTab("original")}
          icon={FileText}
          label="Original"
          tone="rust"
        />
        <TabButton
          active={activeTab === "changes"}
          onClick={() => setActiveTab("changes")}
          icon={ArrowLeftRight}
          label="Changes"
          tone="vermillion"
        />
        <TabButton
          active={activeTab === "optimized"}
          onClick={() => setActiveTab("optimized")}
          icon={Award}
          label="Optimized"
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
  suffix,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  tone: "rust" | "moss" | "moss-strong";
  icon?: React.ReactNode;
}) {
  const toneClasses =
    tone === "rust"
      ? "border-rust/40 bg-rust/[0.06]"
      : tone === "moss-strong"
        ? "border-moss/50 bg-moss/[0.10]"
        : "border-moss/40 bg-moss/[0.06]";
  const valueColor =
    tone === "rust" ? "text-rust" : "text-moss";

  return (
    <div
      className={`flex flex-col gap-1 rounded-xl border bg-ink-950/40 px-2.5 py-2 ${toneClasses}`}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      <span
        className={`inline-flex items-baseline gap-1 font-mono text-[14.5px] font-medium tabular-nums ${valueColor}`}
      >
        {icon && <span className="self-center">{icon}</span>}
        {value}
        {suffix && (
          <span className="font-mono text-[10px] text-ink-400">{suffix}</span>
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
  const activeClasses =
    tone === "rust"
      ? "border-rust/45 bg-rust/[0.10] text-rust"
      : tone === "vermillion"
        ? "border-vermillion/45 bg-vermillion/[0.10] text-vermillion-glow"
        : "border-moss/50 bg-moss/[0.12] text-moss";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[12px] font-medium transition-all ${
        active
          ? `${activeClasses} font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]`
          : "border-ink-700 bg-transparent text-ink-300 hover:border-ink-500 hover:text-paper"
      }`}
    >
      <Icon size={12} strokeWidth={2.4} />
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
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-rust">
          <Eye size={10} strokeWidth={2.4} />
          Original draft
        </span>
        <span className="rounded-full border border-rust/40 bg-rust/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-rust">
          BEFORE
        </span>
      </div>
      <AnnotatedBody text={draftText} annotations={annotations} tone="rust" />
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
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-moss">
          <Award size={10} strokeWidth={2.4} />
          Optimized version
        </span>
        <span className="rounded-full border border-moss/40 bg-moss/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-moss">
          AFTER
        </span>
      </div>
      <AnnotatedBody text={text} annotations={annotations} tone="moss" />
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
  const phraseBg = isMoss ? "bg-moss/[0.22]" : "bg-rust/[0.16]";
  const badgeBg = isMoss ? "bg-moss text-paper-warm" : "bg-rust text-paper-warm";
  const labelText = isMoss ? "text-moss" : "text-rust";

  return (
    <p className="whitespace-pre-line text-[13.5px] leading-[1.75] text-paper">
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.text}</span>;
        const delay = (0.15 + seg.editIndex * 0.18).toFixed(2);
        return (
          <span key={i} className="hero-cm-phrase-group">
            <span
              className={`hero-cm-phrase rounded-[3px] px-[3px] py-[1px] ${phraseBg}`}
              style={{ animationDelay: `${delay}s` }}
            >
              {seg.text}
            </span>
            <span
              className={`hero-cm-callout ml-1 inline-flex items-center gap-1 align-baseline font-mono text-[9.5px] uppercase tracking-[0.14em] ${labelText}`}
              style={{ animationDelay: `${parseFloat(delay) + 0.18}s` }}
            >
              <span
                className={`inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold tabular-nums ${badgeBg}`}
              >
                {seg.editIndex + 1}
              </span>
              <span className="leading-none">{seg.label}</span>
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
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-vermillion-glow">
          <Sparkles size={10} strokeWidth={2.4} />
          {edits.length} key improvements
        </span>
        <span className="rounded-full border border-vermillion/40 bg-vermillion/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-vermillion-glow">
          Diff
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
      className="hero-cm-change-card flex flex-col gap-1.5 rounded-xl border border-vermillion/30 bg-vermillion/[0.05] p-3"
      style={{ animationDelay: `${0.1 + idx * 0.12}s` }}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-vermillion text-paper-warm font-mono text-[10px] font-bold tabular-nums">
          {edit.index + 1}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-vermillion/30 bg-vermillion/10 px-1.5 py-[1px] font-mono text-[9px] uppercase tracking-[0.18em] text-vermillion-glow">
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
            <div className="flex items-start gap-1.5 rounded-lg border border-rust/25 bg-rust/[0.06] px-2 py-1.5 text-[11.5px] leading-snug text-ink-300">
              <span className="font-mono text-rust">−</span>
              <span className="line-clamp-2">{shorten(edit.originalPhrase)}</span>
            </div>
          )}
          {edit.newPhrase && (
            <div className="flex items-start gap-1.5 rounded-lg border border-moss/30 bg-moss/[0.08] px-2 py-1.5 text-[11.5px] leading-snug text-paper">
              <span className="font-mono text-moss">+</span>
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
  const isOriginal = tab === "original";
  const isChanges = tab === "changes";
  // Changes peek is not contextual here — peekTab is always optimized or original.
  // But defensive: render generic CTA if tab === "changes".
  const text = isOriginal ? draftText : optimizedText;
  const toneCls = isOriginal ? "text-rust" : "text-moss";
  const Icon = isOriginal ? Eye : Award;
  const label = isOriginal ? "Original draft" : "Optimized version";
  const subLabel = isOriginal ? "before" : "after";

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
            Peek
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-ink-300">
          {isChanges ? "Tap to see the diff." : text}
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
