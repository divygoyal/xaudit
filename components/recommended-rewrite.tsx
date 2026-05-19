"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  TrendingUp,
  Check,
  Copy,
  ArrowRight,
  Award,
  Eye,
  ArrowLeftRight,
  HelpCircle,
  MessageCircle,
  MousePointerClick,
  UserPlus,
  Quote as QuoteIcon,
  Heart,
  Repeat2,
  Image as ImageIcon,
  PlayCircle,
  Timer,
  UserRound,
} from "lucide-react";
import type { AnalysisResult, Rewrite, RewriteHighlight } from "@/lib/types";
import { HighlightedRewrite } from "./highlighted-rewrite";

interface Props {
  result: AnalysisResult;
  draftText: string;
  primary: Rewrite;
  currentScore: number;
}

type Mode = "final" | "compare" | "why";

const SIGNAL_ICONS: Record<string, typeof MessageCircle> = {
  Reply: MessageCircle,
  Click: MousePointerClick,
  Follow: UserPlus,
  Quote: QuoteIcon,
  Like: Heart,
  Repost: Repeat2,
  "Photo expand": ImageIcon,
  "Video view": PlayCircle,
  Dwell: Timer,
  "Profile click": UserRound,
};

// Reasons map: each signal a Combined rewrite addresses gets a friendly title + body
const SIGNAL_REASONS: Record<string, { title: string; body: string }> = {
  Reply: {
    title: "Reply trigger added",
    body: "A direct question invites discussion.",
  },
  Click: {
    title: "Stronger click intent",
    body: "Concrete hook pulls the eye in.",
  },
  Follow: {
    title: "Follow case built",
    body: "Distinctive POV signals more to come.",
  },
  Quote: {
    title: "Quotable line sharpened",
    body: "Punchy phrasing invites amplification.",
  },
  Repost: {
    title: "Easier to repost",
    body: "Tight, benefit-forward copy.",
  },
  Dwell: {
    title: "More reason to dwell",
    body: "Specific details earn attention.",
  },
  Like: {
    title: "Clearer like intent",
    body: "Explicit benefit invites approval.",
  },
  "Profile click": {
    title: "Profile pull added",
    body: "Teases more of you to discover.",
  },
  "Photo expand": {
    title: "Visual context strengthened",
    body: "Image deepens the message.",
  },
  "Video view": {
    title: "Native video leverage",
    body: "Video drives higher attention.",
  },
};

export function RecommendedRewrite({ result, draftText, primary, currentScore }: Props) {
  const lift = primary.predicted_lift ?? 0;

  // Fall back to OCR'd draft_text when user typed nothing (uploaded a screenshot only).
  const effectiveDraft = useMemo(() => {
    const typed = (draftText ?? "").trim();
    if (typed) return typed;
    return (result.draft_text ?? "").trim();
  }, [draftText, result.draft_text]);

  // Original-draft annotations: weak signals with triggers (rust tags)
  // AND weak-positive triggers that match leaks (rust tags too).
  const originalAnnotations = useMemo(() => {
    const out: { phrase: string; label: string; signal: string }[] = [];
    result.positive_signals.forEach((s) => {
      if (s.grade !== "Weak") return;
      if (!s.trigger || s.trigger.trim().length < 2) return;
      if (!effectiveDraft.includes(s.trigger)) return;
      out.push({
        phrase: s.trigger,
        label: (s.fix_label || `weak ${s.name.toLowerCase()}`).toUpperCase(),
        signal: s.name,
      });
    });
    result.negative_signals.forEach((n) => {
      if (n.risk === "Low") return;
      if (!n.trigger || n.trigger.trim().length < 2) return;
      if (!effectiveDraft.includes(n.trigger)) return;
      out.push({
        phrase: n.trigger,
        label: (n.fix_label || `${n.name.toLowerCase()} risk`).toUpperCase(),
        signal: n.name,
      });
    });
    return out.slice(0, 4);
  }, [result, effectiveDraft]);

  return (
    <section
      id="rewrite-recommended"
      data-rewrite-angle={primary.angle}
      className="relative mt-10 overflow-hidden rounded-2xl border border-vermillion/40 bg-gradient-to-br from-vermillion/[0.04] via-transparent to-transparent shadow-[0_24px_70px_-30px_rgba(214,58,0,0.32),inset_0_1px_0_0_rgba(255,255,255,0.05)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-px left-0 h-px w-full bg-gradient-to-r from-transparent via-vermillion to-transparent"
      />

      <Header currentScore={currentScore} lift={lift} />

      <div className="px-5 py-5 md:px-7 md:py-6">
        <WhyChangedView
          draftText={effectiveDraft}
          originalAnnotations={originalAnnotations}
          primary={primary}
        />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────

function Header({ currentScore, lift }: { currentScore: number; lift: number }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-700/60 px-5 py-4 md:px-7 md:py-5">
      <div>
        <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-vermillion-glow">
          <Sparkles size={11} strokeWidth={2.4} />
          Recommended rewrite
        </div>
        <p className="mt-1.5 text-[13px] leading-snug text-ink-300">
          Compare your original draft against the optimized version.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="rounded-full border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-[12px] text-ink-200">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
            Signal Score
          </span>
          <span className="ml-2 font-mono text-[13px] tabular-nums text-paper">
            {currentScore}/100
          </span>
        </div>
        {lift > 0 && (
          <div className="inline-flex items-center gap-1 rounded-full border border-moss/40 bg-moss/10 px-3 py-1.5 font-mono text-[12px] tabular-nums text-moss">
            <TrendingUp size={11} strokeWidth={2.4} />
            +{lift} pts
          </div>
        )}
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// MODE TABS
// ─────────────────────────────────────────────────────────────

function ModeBar({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-ink-700/60 px-5 py-3 md:px-7">
      <ModeTab active={mode === "final"} onClick={() => onChange("final")} icon={Eye} label="Final version" />
      <ModeTab active={mode === "compare"} onClick={() => onChange("compare")} icon={ArrowLeftRight} label="Compare" />
      <ModeTab active={mode === "why"} onClick={() => onChange("why")} icon={HelpCircle} label="Why it changed" />
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Eye;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] transition-all ${
        active
          ? "border-vermillion/45 bg-vermillion/10 text-vermillion-glow font-medium"
          : "border-ink-700 bg-transparent text-ink-300 hover:border-ink-500 hover:text-paper"
      }`}
    >
      <Icon size={12} strokeWidth={2.2} />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// FINAL VIEW — clean single column with CTAs
// ─────────────────────────────────────────────────────────────

function FinalView({
  primary,
  projectedScore,
  lift,
}: {
  primary: Rewrite;
  projectedScore: number;
  lift: number;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-ink-700 bg-ink-900/40 px-5 py-5 md:px-6 md:py-6">
        <div>
          {primary.highlights && primary.highlights.length > 0 ? (
            <HighlightedRewrite text={primary.text} highlights={primary.highlights} baseDelay={0.2} />
          ) : (
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-paper">
              {primary.text}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[11.5px] text-ink-300">
          <Award size={12} className="text-moss" strokeWidth={2.4} />
          <span>
            Projected: <span className="tabular-nums text-moss">{projectedScore}/100</span>
            {lift > 0 && <span className="ml-1 tabular-nums text-moss">(+{lift})</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={primary.text} />
          <PrimaryActionButton text={primary.text} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPARE VIEW — marked draft + superpower bridge + optimized draft + lift rail
// ─────────────────────────────────────────────────────────────

function CompareView({
  draftText,
  primary,
  currentScore,
  projectedScore,
  lift,
}: {
  draftText: string;
  originalAnnotations: { phrase: string; label: string; signal?: string }[];
  primary: Rewrite;
  currentScore: number;
  projectedScore: number;
  lift: number;
}) {
  const aligned = useMemo(() => buildAlignedDiff(draftText, primary), [draftText, primary]);
  const fallbackImprovements = useMemo(() => buildFallbackImprovements(primary), [primary]);
  const improvements = aligned.hasEdits ? aligned.edits : fallbackImprovements;
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(
    improvements[0]?.index ?? null
  );

  useEffect(() => {
    setActiveEditIndex(improvements[0]?.index ?? null);
  }, [improvements]);

  const active = activeEditIndex ?? improvements[0]?.index ?? null;

  if (!aligned.hasEdits) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)] xl:items-stretch xl:gap-5 2xl:grid-cols-[minmax(0,1fr)_270px_minmax(0,1fr)_280px]">
        <DraftCard
          tone="original"
          eyebrow="Your draft"
          text={draftText || "(no draft text)"}
        />
        <SuperpowersBridge
          edits={improvements}
          activeEditIndex={active}
          onActiveEdit={setActiveEditIndex}
        />
        <DraftCard
          tone="optimized"
          eyebrow="Optimized version"
          text={primary.text}
          highlights={primary.highlights}
        />
        <div className="xl:col-span-3 2xl:col-span-1">
          <WhyRail
            lift={lift}
            currentScore={currentScore}
            projectedScore={projectedScore}
            addressesSignals={primary.addresses_signals ?? []}
            text={primary.text}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)] xl:items-stretch xl:gap-5 2xl:grid-cols-[minmax(0,1fr)_270px_minmax(0,1fr)_280px]">
      <DiffCard
        tone="original"
        eyebrow="Your draft"
        text={draftText}
        annotations={aligned.originalAnnotations}
        activeEditIndex={active}
        onActiveEdit={setActiveEditIndex}
      />
      <SuperpowersBridge
        edits={improvements}
        activeEditIndex={active}
        onActiveEdit={setActiveEditIndex}
      />
      <DiffCard
        tone="optimized"
        eyebrow="Optimized version"
        text={aligned.optimizedText}
        annotations={aligned.optimizedAnnotations}
        activeEditIndex={active}
        onActiveEdit={setActiveEditIndex}
      />
      <div className="xl:col-span-3 2xl:col-span-1">
        <WhyRail
          lift={lift}
          currentScore={currentScore}
          projectedScore={projectedScore}
          addressesSignals={primary.addresses_signals ?? []}
          text={aligned.optimizedText}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// buildAlignedDiff — construct optimized text by applying edits in order
// ─────────────────────────────────────────────────────────────

type DiffEdit = {
  index: number;
  originalPhrase: string;
  newPhrase: string;
  signal: string;
  improvementLabel: string;
  description: string;
};

type DiffAnnotation = {
  phrase: string;
  label: string;
  signal: string;
  editIndex: number;
};

function buildAlignedDiff(
  original: string,
  primary: Rewrite
): {
  hasEdits: boolean;
  optimizedText: string;
  edits: DiffEdit[];
  originalAnnotations: DiffAnnotation[];
  optimizedAnnotations: DiffAnnotation[];
} {
  const editsIn = primary.edits ?? [];
  const valid = editsIn.filter(
    (e) =>
      e.original_phrase &&
      e.new_phrase &&
      original.includes(e.original_phrase)
  );
  if (valid.length === 0) {
    return {
      hasEdits: false,
      optimizedText: primary.text,
      edits: [],
      originalAnnotations: [],
      optimizedAnnotations: [],
    };
  }

  // Sort edits by position in original to apply in left-to-right order
  const sortedRaw = [...valid].sort(
    (a, b) => original.indexOf(a.original_phrase) - original.indexOf(b.original_phrase)
  );

  // Apply edits sequentially. Build optimized text by walking original + swapping.
  let cursor = 0;
  let optimized = "";
  const edits: DiffEdit[] = [];
  sortedRaw.forEach((e) => {
    const idx = original.indexOf(e.original_phrase, cursor);
    if (idx === -1) return; // already applied or overlapping
    // Append unchanged prefix
    optimized += original.slice(cursor, idx);
    // Record the edit with its position in the NEW optimized text
    edits.push({
      index: edits.length,
      originalPhrase: e.original_phrase,
      newPhrase: e.new_phrase,
      signal: e.signal,
      improvementLabel: e.improvement_label,
      description: e.description,
    });
    optimized += e.new_phrase;
    cursor = idx + e.original_phrase.length;
  });
  optimized += original.slice(cursor);

  const originalAnnotations: DiffAnnotation[] = edits.map((e) => ({
    phrase: e.originalPhrase,
    label: shorten(e.improvementLabel, 22),
    signal: e.signal,
    editIndex: e.index,
  }));
  const optimizedAnnotations: DiffAnnotation[] = edits.map((e) => ({
    phrase: e.newPhrase,
    label: shorten(e.improvementLabel, 22),
    signal: e.signal,
    editIndex: e.index,
  }));

  return {
    hasEdits: true,
    optimizedText: optimized,
    edits,
    originalAnnotations,
    optimizedAnnotations,
  };
}

function shorten(s: string, max: number) {
  if (!s) return s;
  return s.length <= max ? s : s.slice(0, max - 1).trim() + "…";
}

function pickRectByMaxRight(el: HTMLElement): DOMRect {
  const rects = el.getClientRects();
  if (rects.length === 0) return el.getBoundingClientRect();
  let best = rects[0];
  for (let i = 1; i < rects.length; i++) {
    if (rects[i].right > best.right) best = rects[i];
  }
  return best;
}

function pickRectByMinLeft(el: HTMLElement): DOMRect {
  const rects = el.getClientRects();
  if (rects.length === 0) return el.getBoundingClientRect();
  let best = rects[0];
  for (let i = 1; i < rects.length; i++) {
    if (rects[i].left < best.left) best = rects[i];
  }
  return best;
}

/**
 * Returns true if any element/text sibling AFTER the phrase wrapper has a rect
 * whose top matches the given anchor line — i.e., real trailing content lives
 * on the same visual line as the phrase. Whitespace-only text nodes and empty
 * rects are ignored. Used to decide whether the arrow can safely exit at the
 * phrase edge or must shift to the card edge.
 */
function hasSameLineSiblingAfter(phraseEl: HTMLElement, anchor: DOMRect): boolean {
  const wrapper = phraseEl.parentElement;
  if (!wrapper) return false;
  return siblingHasMatchingLine(wrapper.nextSibling, "next", anchor);
}

function hasSameLineSiblingBefore(phraseEl: HTMLElement, anchor: DOMRect): boolean {
  const wrapper = phraseEl.parentElement;
  if (!wrapper) return false;
  return siblingHasMatchingLine(wrapper.previousSibling, "prev", anchor);
}

function siblingHasMatchingLine(
  start: Node | null,
  direction: "next" | "prev",
  anchor: DOMRect
): boolean {
  let node: Node | null = start;
  while (node) {
    const rects = rectsForNode(node);
    if (rects && rects.length > 0) {
      // For "next" we want the FIRST rect (line it starts on). For "prev"
      // we want the LAST rect (line it ends on).
      const rect = direction === "next" ? rects[0] : rects[rects.length - 1];
      if (rect.width > 0 && rectsShareLine(rect, anchor)) {
        return true;
      }
    }
    node = direction === "next" ? node.nextSibling : node.previousSibling;
  }
  return false;
}

/**
 * True if two rects share any vertical overlap — i.e., they live on the same
 * visual line. More robust than comparing tops, because inline siblings can
 * have different padding, vertical-align offsets, and intrinsic heights and
 * still visually share a line.
 */
function rectsShareLine(a: DOMRect, b: DOMRect): boolean {
  const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return overlap > 0;
}

/**
 * Returns the rightmost edge of the phrase plus any inline next-sibling
 * (callout pill, etc.) that lives on the SAME visual line as the phrase's
 * widest line. The y coords stay locked to the phrase's max-right line so a
 * callout that wrapped onto its own line below doesn't shift the anchor
 * vertically.
 */
function widestSameLineRight(
  phraseEl: HTMLElement
): { x: number; y: number; height: number } {
  const base = pickRectByMaxRight(phraseEl);
  let maxRight = base.right;
  let node: Node | null = phraseEl.nextSibling;
  while (node) {
    const rects = rectsForNode(node);
    if (rects) {
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (rectsShareLine(r, base) && r.right > maxRight) {
          maxRight = r.right;
        }
      }
    }
    node = node.nextSibling;
  }
  return {
    x: maxRight,
    y: base.top + base.height / 2,
    height: base.height,
  };
}

function rectsForNode(node: Node): DOMRect[] | DOMRectList | null {
  if (node.nodeType === Node.ELEMENT_NODE) {
    return (node as Element).getClientRects();
  }
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text.trim()) return null;
    const range = document.createRange();
    range.selectNodeContents(node);
    const list = range.getClientRects();
    range.detach?.();
    return list;
  }
  return null;
}

function buildFallbackImprovements(primary: Rewrite): DiffEdit[] {
  const signals = primary.addresses_signals ?? [];
  const highlights = primary.highlights ?? [];
  const fromHighlights = highlights.slice(0, 4).map((h, index) => {
    const signal = signals[index] ?? inferSignalFromLabel(h.label);
    return {
      index,
      originalPhrase: "",
      newPhrase: h.phrase,
      signal,
      improvementLabel: titleFromHighlight(h.label),
      description:
        SIGNAL_REASONS[signal]?.body ??
        "Stronger wording makes the rewrite easier to understand and act on.",
    };
  });

  if (fromHighlights.length > 0) return fromHighlights;

  return signals.slice(0, 4).map((signal, index) => ({
    index,
    originalPhrase: "",
    newPhrase: "",
    signal,
    improvementLabel: SIGNAL_REASONS[signal]?.title ?? `Strengthened ${signal.toLowerCase()}`,
    description: SIGNAL_REASONS[signal]?.body ?? "Signal strengthened.",
  }));
}

function inferSignalFromLabel(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("reply") || normalized.includes("ask")) return "Reply";
  if (normalized.includes("hook") || normalized.includes("click")) return "Click";
  if (normalized.includes("quote")) return "Quote";
  if (normalized.includes("proof") || normalized.includes("specific")) return "Dwell";
  return "Reply";
}

function titleFromHighlight(label: string) {
  const clean = label.trim();
  if (!clean) return "Signal sharpened";
  if (clean.toLowerCase().includes("hook")) return "Hook rewritten";
  if (clean.toLowerCase().includes("proof")) return "Concrete proof added";
  if (clean.toLowerCase().includes("reply")) return "Reply trigger added";
  return `${clean.charAt(0).toUpperCase()}${clean.slice(1)} strengthened`;
}

// ─────────────────────────────────────────────────────────────
// DiffCard — used in Compare view (and Why-changed) for aligned diff
// ─────────────────────────────────────────────────────────────

function DiffCard({
  tone,
  eyebrow,
  text,
  annotations,
  phraseRefs,
  cardRef,
  activeEditIndex,
  onActiveEdit,
  labelStyle = "pill",
}: {
  tone: "original" | "optimized";
  eyebrow: string;
  text: string;
  annotations: DiffAnnotation[];
  phraseRefs?: React.MutableRefObject<Map<string, HTMLElement | null>>;
  cardRef?: React.MutableRefObject<HTMLElement | null>;
  activeEditIndex?: number | null;
  onActiveEdit?: (index: number) => void;
  labelStyle?: "pill" | "callout";
}) {
  const isOptimized = tone === "optimized";
  return (
    <article
      ref={cardRef}
      className={`diff-card relative flex min-h-[390px] flex-col overflow-hidden rounded-2xl border bg-ink-900/40 px-4 py-4 md:px-5 md:py-5 ${
        isOptimized
          ? "is-optimized border-moss/35 shadow-[0_18px_50px_-30px_rgba(93,143,77,0.22)]"
          : "border-ink-700"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {isOptimized ? (
            <Award size={12} className="shrink-0 text-moss" strokeWidth={2.4} />
          ) : (
            <Eye size={12} className="shrink-0 text-ink-400" strokeWidth={2.4} />
          )}
          <div
            className={`truncate font-mono text-[10px] uppercase tracking-[0.22em] ${
              isOptimized ? "text-moss" : "text-ink-400"
            }`}
          >
            {eyebrow}
          </div>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.16em] ${
            isOptimized
              ? "border-moss/30 bg-moss/8 text-moss"
              : "border-rust/30 bg-rust/8 text-rust"
          }`}
        >
          {isOptimized ? "after" : "before"}
        </span>
      </div>

      <div className="flex-1">
        <DiffAnnotatedText
          text={text}
          annotations={annotations}
          tone={isOptimized ? "moss" : "rust"}
          phraseRefs={phraseRefs}
          activeEditIndex={activeEditIndex}
          onActiveEdit={onActiveEdit}
          labelStyle={labelStyle}
        />
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────
// DiffAnnotatedText — renders text with bg-tint highlights + label pills
// ─────────────────────────────────────────────────────────────

function DiffAnnotatedText({
  text,
  annotations,
  tone,
  phraseRefs,
  activeEditIndex,
  onActiveEdit,
  labelStyle = "pill",
}: {
  text: string;
  annotations: DiffAnnotation[];
  tone: "rust" | "vermillion" | "moss";
  phraseRefs?: React.MutableRefObject<Map<string, HTMLElement | null>>;
  activeEditIndex?: number | null;
  onActiveEdit?: (index: number) => void;
  labelStyle?: "pill" | "callout";
}) {
  // Build segments based on annotation positions in text
  type Span = { start: number; end: number; label: string; signal: string; editIndex: number };
  const spans: Span[] = [];
  annotations.forEach((a) => {
    const idx = text.indexOf(a.phrase);
    if (idx === -1) return;
    // Trim leading/trailing whitespace from the tinted range. The model
    // sometimes returns new_phrase / original_phrase with a leading "\n\n"
    // for paragraph context; tinting the newline paints a stray chunk on
    // the line above the visible text.
    const leading = a.phrase.match(/^\s+/)?.[0].length ?? 0;
    const trailing = a.phrase.match(/\s+$/)?.[0].length ?? 0;
    const start = idx + leading;
    const end = idx + a.phrase.length - trailing;
    if (end <= start) return;
    spans.push({
      start,
      end,
      label: a.label,
      signal: a.signal,
      editIndex: a.editIndex,
    });
  });
  spans.sort((a, b) => a.start - b.start);
  const dedup: Span[] = [];
  spans.forEach((s) => {
    const last = dedup[dedup.length - 1];
    if (last && s.start < last.end) return;
    dedup.push(s);
  });

  type Segment =
    | { type: "text"; text: string }
    | {
        type: "phrase";
        text: string;
        label: string;
        signal: string;
        editIndex: number;
      };
  const segments: Segment[] = [];
  let cursor = 0;
  dedup.forEach((s) => {
    if (s.start > cursor) segments.push({ type: "text", text: text.slice(cursor, s.start) });
    segments.push({
      type: "phrase",
      text: text.slice(s.start, s.end),
      label: s.label,
      signal: s.signal,
      editIndex: s.editIndex,
    });
    cursor = s.end;
  });
  if (cursor < text.length) segments.push({ type: "text", text: text.slice(cursor) });

  const isGreenTone = tone === "moss";
  const tintBg = isGreenTone ? "rgba(118, 190, 91, 0.31)" : "rgba(255, 110, 35, 0.10)";
  const tintActiveBg = isGreenTone ? "rgba(118, 190, 91, 0.31)" : "rgba(255, 110, 35, 0.22)";
  const pillCls = isGreenTone
    ? "border-moss/50 bg-moss/12 text-moss"
    : "border-vermillion/40 bg-vermillion/8 text-vermillion-glow";

  return (
    <p className="whitespace-pre-line text-[14px] leading-[1.85] text-paper">
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.text}</span>;
        const tintDelay = (0.2 + seg.editIndex * 0.3).toFixed(2);
        const labelDelay = (0.5 + seg.editIndex * 0.3).toFixed(2);
        const isActive = activeEditIndex === seg.editIndex;
        return (
          <span key={i}>
            <span
              ref={(el) => {
                if (phraseRefs) phraseRefs.current.set(`${seg.editIndex}`, el);
              }}
              role="button"
              tabIndex={0}
              onMouseEnter={() => onActiveEdit?.(seg.editIndex)}
              onFocus={() => onActiveEdit?.(seg.editIndex)}
              onClick={() => onActiveEdit?.(seg.editIndex)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onActiveEdit?.(seg.editIndex);
                }
              }}
              className={`diff-phrase ${
                isGreenTone ? "diff-phrase-green" : "phrase-spotlight"
              } ${
                isActive ? "is-active" : ""
              }`}
              style={
                {
                  "--tint-bg": tintBg,
                  "--tint-active-bg": tintActiveBg,
                  animationDelay: `${tintDelay}s`,
                } as React.CSSProperties
              }
            >
              {seg.text}
            </span>
            {labelStyle === "callout" ? (
              <span
                role="button"
                tabIndex={0}
                onMouseEnter={() => onActiveEdit?.(seg.editIndex)}
                onFocus={() => onActiveEdit?.(seg.editIndex)}
                onClick={() => onActiveEdit?.(seg.editIndex)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onActiveEdit?.(seg.editIndex);
                  }
                }}
                className={`diff-callout ${isGreenTone ? "is-green" : ""} ${
                  isActive ? "is-active" : ""
                }`}
                style={{ animationDelay: `${labelDelay}s` }}
              >
                <span className="diff-callout-line" />
                <span className="diff-callout-badge">{seg.editIndex + 1}</span>
                <span className="diff-callout-label">{seg.label}</span>
              </span>
            ) : (
              <span
                className={`rw-label ml-1 inline-flex items-baseline gap-1 rounded-full border px-1.5 py-[1px] font-mono text-[8.5px] uppercase tracking-wider ${pillCls} ${
                  isActive ? "is-active" : ""
                }`}
                style={{ animationDelay: `${labelDelay}s` }}
              >
                <span className="tabular-nums">{seg.editIndex + 1}</span>
                {seg.label}
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────
// SuperpowersBridge — interactive middle column for the diff flow
// ─────────────────────────────────────────────────────────────

function SuperpowersBridge({
  edits,
  activeEditIndex,
  onActiveEdit,
}: {
  edits: DiffEdit[];
  activeEditIndex: number | null;
  onActiveEdit: (index: number) => void;
}) {
  const visibleEdits = edits.slice(0, 6);

  return (
    <aside className="rewrite-bridge relative flex min-h-[390px] flex-col rounded-2xl border border-ink-700 bg-ink-900/45 px-3 py-4 md:px-4">
      <div className="mb-3 text-center">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-vermillion-glow">
          <Sparkles size={10} strokeWidth={2.4} />
          Rewrite superpowers
        </div>
        <div className="mt-1 font-mono text-[10px] tabular-nums text-ink-400">
          {visibleEdits.length} upgrade{visibleEdits.length === 1 ? "" : "s"} mapped
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-3">
        {visibleEdits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-700 px-3 py-5 text-center text-[12px] text-ink-300">
            Final rewrite ready.
          </div>
        ) : (
          visibleEdits.map((edit, idx) => {
            const Icon = SIGNAL_ICONS[edit.signal] ?? MessageCircle;
            const isActive = activeEditIndex === edit.index;
            return (
              <button
                key={`${edit.index}-${edit.improvementLabel}`}
                onMouseEnter={() => onActiveEdit(edit.index)}
                onFocus={() => onActiveEdit(edit.index)}
                onClick={() => onActiveEdit(edit.index)}
                className={`rewrite-superpower-card group relative w-full rounded-xl border px-3 py-3 text-left transition-all ${
                  isActive
                    ? "is-active border-vermillion/45 bg-vermillion/[0.08] shadow-[0_18px_38px_-28px_rgba(214,58,0,0.45)]"
                    : "border-ink-700 bg-ink-950/45 hover:border-vermillion/30 hover:bg-vermillion/[0.035]"
                }`}
                style={{ animationDelay: `${0.12 + idx * 0.08}s` }}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold tabular-nums ${
                      isActive
                        ? "border-vermillion bg-vermillion text-white"
                        : "border-vermillion/35 bg-vermillion/10 text-vermillion-glow"
                    }`}
                  >
                    {edit.index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Icon
                          size={13}
                          strokeWidth={2.35}
                          className={isActive ? "shrink-0 text-vermillion-glow" : "shrink-0 text-ink-300"}
                        />
                        <h4 className="text-[13px] font-semibold leading-snug text-paper">
                          {edit.improvementLabel}
                        </h4>
                      </div>
                      <span className="shrink-0 rounded-full border border-ink-700 bg-ink-900/60 px-1.5 py-[1px] font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-300">
                        {edit.signal}
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-snug text-ink-300">
                      {edit.description}
                    </p>
                  </div>
                </div>

                {(edit.originalPhrase || edit.newPhrase) && (
                  <div className="mt-3 grid gap-1.5">
                    {edit.originalPhrase && (
                      <div className="flex items-start gap-2 rounded-lg border border-rust/25 bg-rust/[0.045] px-2.5 py-2 text-[11px] leading-snug text-ink-300">
                        <span className="font-mono text-rust">-</span>
                        <span>{shortenSnippet(edit.originalPhrase)}</span>
                      </div>
                    )}
                    {edit.newPhrase && (
                      <div className="flex items-start gap-2 rounded-lg border border-moss/25 bg-moss/[0.055] px-2.5 py-2 text-[11px] leading-snug text-paper">
                        <span className="font-mono text-moss">+</span>
                        <span>{shortenSnippet(edit.newPhrase)}</span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

function shortenSnippet(text: string, max = 92) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  const cut = normalized.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 48 ? lastSpace : max - 1).trim()}…`;
}

function formatCalloutLabel(label: string) {
  const words = label
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!words) return label;
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function originalCalloutFallback(label: string, signal: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("hook") || signal === "Click") return "Vague hook";
  if (normalized.includes("reply") || normalized.includes("question") || signal === "Reply") {
    return "No question";
  }
  if (normalized.includes("proof")) return "Missing proof";
  if (normalized.includes("payoff")) return "Missing payoff";
  return formatCalloutLabel(label);
}

function optimizedCalloutLabel(label: string, signal: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("hook") || signal === "Click") return "Hook written";
  if (normalized.includes("reply") || signal === "Reply") return "Reply trigger";
  if (normalized.includes("proof")) return "Proof added";
  if (normalized.includes("quote")) return "Quote sharpened";
  return formatCalloutLabel(label.replace(/rewritten/gi, "written"));
}

// ─────────────────────────────────────────────────────────────
// WHY CHANGED VIEW — 2 cards + bridge of transformations
// ─────────────────────────────────────────────────────────────

function WhyChangedView({
  draftText,
  originalAnnotations,
  primary,
}: {
  draftText: string;
  originalAnnotations: { phrase: string; label: string; signal?: string }[];
  primary: Rewrite;
}) {
  // Use the same aligned-diff data as Compare view — guarantees structural alignment
  const aligned = useMemo(() => buildAlignedDiff(draftText, primary), [draftText, primary]);
  const originalIssueLabels = useMemo(() => {
    const labels = new Map<string, string>();
    originalAnnotations.forEach((annotation) => {
      labels.set(annotation.phrase, formatCalloutLabel(annotation.label));
    });
    return labels;
  }, [originalAnnotations]);
  const whyOriginalAnnotations = useMemo(
    () =>
      aligned.originalAnnotations.map((annotation) => ({
        ...annotation,
        label: originalCalloutFallback(
          originalIssueLabels.get(annotation.phrase) ?? annotation.label,
          annotation.signal
        ),
      })),
    [aligned.originalAnnotations, originalIssueLabels]
  );
  const whyOptimizedAnnotations = useMemo(
    () =>
      aligned.optimizedAnnotations.map((annotation) => ({
        ...annotation,
        label: optimizedCalloutLabel(annotation.label, annotation.signal),
      })),
    [aligned.optimizedAnnotations]
  );
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);

  useEffect(() => {
    setActiveEditIndex(aligned.edits[0]?.index ?? null);
  }, [aligned]);

  // Refs for arrow measurement
  const containerRef = useRef<HTMLDivElement | null>(null);
  const origPhraseRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const newPhraseRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const bridgeCardRefs = useRef<(HTMLElement | null)[]>([]);
  const origCardRef = useRef<HTMLElement | null>(null);
  const newCardRef = useRef<HTMLElement | null>(null);

  type ArrowPath = { id: string; left: string; right: string };
  const [arrowPaths, setArrowPaths] = useState<ArrowPath[]>([]);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();

    const origCardRect = origCardRef.current?.getBoundingClientRect();
    const newCardRect = newCardRef.current?.getBoundingClientRect();

    const next: ArrowPath[] = aligned.edits
      .map((edit, idx) => {
        const card = bridgeCardRefs.current[idx];
        if (!card) return null;
        const cardRect = card.getBoundingClientRect();
        const cardLeftX = cardRect.left - cRect.left;
        const cardRightX = cardRect.right - cRect.left;
        const cardCenterY = cardRect.top - cRect.top + cardRect.height / 2;

        // LEFT segment: original phrase → bridge card. Anchor at the
        // rightmost same-line extent (past any inline callout pill), so the
        // line lives entirely in the gutter between the callout and the card.
        let leftPath = "";
        const origEl = origPhraseRefs.current.get(`${edit.index}`);
        if (origEl) {
          const phraseMaxRight = pickRectByMaxRight(origEl);
          const widest = widestSameLineRight(origEl);
          // Only shift to card-edge anchoring when there's real text content
          // on the SAME visual line as the phrase's widest extent.
          const hasTrailingText = origCardRect
            ? hasSameLineSiblingAfter(origEl, phraseMaxRight)
            : false;
          const sx = hasTrailingText
            ? origCardRect!.right - cRect.left + 4
            : widest.x - cRect.left + 4;
          const sy = widest.y - cRect.top;
          const ex = cardLeftX - 6;
          const ey = cardCenterY;
          const mx = (sx + ex) / 2;
          leftPath = `M ${sx},${sy} C ${mx},${sy} ${mx},${ey} ${ex},${ey}`;
        }

        // RIGHT segment: bridge card → optimized phrase
        let rightPath = "";
        const newEl = newPhraseRefs.current.get(`${edit.index}`);
        if (newEl) {
          // Mirror of the orange side: pick the leftmost-extent per-line rect.
          const r = pickRectByMinLeft(newEl);
          const hasLeadingText = newCardRect
            ? hasSameLineSiblingBefore(newEl, r)
            : false;
          const sx = cardRightX + 6;
          const sy = cardCenterY;
          const ex = hasLeadingText
            ? newCardRect!.left - cRect.left - 4
            : r.left - cRect.left - 4;
          const ey = r.top - cRect.top + r.height / 2;
          const mx = (sx + ex) / 2;
          rightPath = `M ${sx},${sy} C ${mx},${sy} ${mx},${ey} ${ex},${ey}`;
        }

        return { id: `${edit.index}`, left: leftPath, right: rightPath };
      })
      .filter((p): p is ArrowPath => p !== null);
    setArrowPaths(next);
  }, [aligned]);

  useLayoutEffect(() => {
    measure();
  }, [measure, draftText, primary]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    const t1 = setTimeout(measure, 350);
    const t2 = setTimeout(measure, 900);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [measure]);

  if (!aligned.hasEdits) {
    return (
      <div className="rounded-xl border border-dashed border-ink-700 bg-ink-900/30 px-6 py-8 text-center text-[13px] text-ink-300">
        No structural edits available. Switch to Final or Compare mode to view the rewrite.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px_1fr] lg:gap-5 lg:items-start"
    >
      <DiffCard
        tone="original"
        eyebrow="Original draft"
        text={draftText}
        annotations={whyOriginalAnnotations}
        phraseRefs={origPhraseRefs}
        cardRef={origCardRef}
        activeEditIndex={activeEditIndex}
        onActiveEdit={setActiveEditIndex}
        labelStyle="callout"
      />

      {/* BRIDGE */}
      <div className="flex w-full flex-col gap-3">
        <div className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-vermillion-glow">
          <Sparkles size={10} className="mb-0.5 mr-1 inline" strokeWidth={2.4} />
          {aligned.edits.length} key improvements
        </div>
        {aligned.edits.map((edit, idx) => {
          const Icon = SIGNAL_ICONS[edit.signal] ?? MessageCircle;
          const isActive = activeEditIndex === edit.index;
          return (
            <button
              type="button"
              key={edit.index}
              ref={(el) => {
                bridgeCardRefs.current[idx] = el;
              }}
              onMouseEnter={() => setActiveEditIndex(edit.index)}
              onFocus={() => setActiveEditIndex(edit.index)}
              onClick={() => setActiveEditIndex(edit.index)}
              className={`bridge-card why-chain-card rounded-xl border px-3 py-2.5 text-left ${
                isActive
                  ? "is-active border-vermillion/45 bg-vermillion/[0.08]"
                  : "border-vermillion/30 bg-vermillion/[0.05]"
              }`}
              style={{ animationDelay: `${0.3 + idx * 0.18}s` }}
            >
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-vermillion/15 text-vermillion-glow">
                  <Icon size={11} strokeWidth={2.2} />
                </span>
                <div className="font-mono text-[9.5px] uppercase tracking-wider text-vermillion-glow">
                  {edit.signal}
                </div>
              </div>
              <div className="mt-1 text-[12.5px] font-semibold leading-snug text-paper">
                {edit.improvementLabel}
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-300">{edit.description}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <DiffCard
          tone="optimized"
          eyebrow="Optimized version"
          text={aligned.optimizedText}
          annotations={whyOptimizedAnnotations}
          phraseRefs={newPhraseRefs}
          cardRef={newCardRef}
          activeEditIndex={activeEditIndex}
          onActiveEdit={setActiveEditIndex}
          labelStyle="callout"
        />
        <div className="flex justify-end">
          <CopyButton text={aligned.optimizedText} />
        </div>
      </div>

      {/* ARROW LAYER — absolute over the whole grid */}
      <svg
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        style={{ overflow: "visible" }}
        aria-hidden="true"
      >
        {arrowPaths.map((p, i) => (
          <g key={p.id}>
            {p.left && (
              <path
                d={p.left}
                stroke="rgb(var(--vermillion))"
                strokeWidth={activeEditIndex === Number(p.id) ? "2" : "1.5"}
                strokeOpacity={activeEditIndex === Number(p.id) ? "0.95" : "0.7"}
                fill="none"
                strokeDasharray="4 4"
                className={`bridge-arrow ${activeEditIndex === Number(p.id) ? "is-active" : ""}`}
                style={{ animationDelay: `${0.6 + i * 0.18}s` }}
              />
            )}
            {p.right && (
              <path
                d={p.right}
                stroke="rgb(var(--moss))"
                strokeWidth={activeEditIndex === Number(p.id) ? "2" : "1.5"}
                strokeOpacity={activeEditIndex === Number(p.id) ? "0.95" : "0.72"}
                fill="none"
                strokeDasharray="4 4"
                className={`bridge-arrow bridge-arrow-green ${activeEditIndex === Number(p.id) ? "is-active" : ""}`}
                style={{ animationDelay: `${0.85 + i * 0.18}s` }}
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DraftCard — used in both Compare and Why-changed views
// ─────────────────────────────────────────────────────────────

function DraftCard({
  tone,
  eyebrow,
  text,
  annotations,
  highlights,
  phraseRefs,
}: {
  tone: "original" | "optimized";
  eyebrow: string;
  text: string;
  annotations?: { phrase: string; label: string; tone: "rust" | "vermillion"; signal?: string }[];
  highlights?: RewriteHighlight[];
  phraseRefs?: React.MutableRefObject<Map<string, HTMLElement | null>>;
}) {
  const isOptimized = tone === "optimized";
  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-ink-900/40 px-4 py-4 md:px-5 md:py-5 ${
        isOptimized
          ? "border-vermillion/35 shadow-[0_18px_50px_-30px_rgba(214,58,0,0.3)]"
          : "border-ink-700"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isOptimized && <Award size={12} className="text-vermillion-glow" strokeWidth={2.4} />}
          <div
            className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
              isOptimized ? "text-vermillion-glow" : "text-ink-400"
            }`}
          >
            {eyebrow}
          </div>
        </div>
      </div>

      <div className="flex-1">
        {isOptimized && highlights && highlights.length > 0 ? (
          <HighlightedRewrite text={text} highlights={highlights} baseDelay={0.2} phraseRefs={phraseRefs} />
        ) : annotations && annotations.length > 0 ? (
          <AnnotatedComparisonText text={text} annotations={annotations} phraseRefs={phraseRefs} />
        ) : (
          <p className="whitespace-pre-line text-[14px] leading-[1.85] text-paper">{text}</p>
        )}
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────
// AnnotatedComparisonText — renders text with inline rust tags after weak phrases
// ─────────────────────────────────────────────────────────────

function AnnotatedComparisonText({
  text,
  annotations,
  phraseRefs,
}: {
  text: string;
  annotations: { phrase: string; label: string; tone: "rust" | "vermillion"; signal?: string }[];
  phraseRefs?: React.MutableRefObject<Map<string, HTMLElement | null>>;
}) {
  // Build segments with phrase ranges
  type Span = {
    start: number;
    end: number;
    label: string;
    tone: "rust" | "vermillion";
    signal?: string;
  };
  const spans: Span[] = [];
  annotations.forEach((a) => {
    const idx = text.indexOf(a.phrase);
    if (idx === -1) return;
    spans.push({
      start: idx,
      end: idx + a.phrase.length,
      label: a.label,
      tone: a.tone,
      signal: a.signal,
    });
  });
  spans.sort((a, b) => a.start - b.start);
  const dedup: Span[] = [];
  spans.forEach((s) => {
    const last = dedup[dedup.length - 1];
    if (last && s.start < last.end) return;
    dedup.push(s);
  });

  type Segment =
    | { type: "text"; text: string }
    | {
        type: "phrase";
        text: string;
        label: string;
        tone: "rust" | "vermillion";
        signal?: string;
        index: number;
      };
  const segments: Segment[] = [];
  let cursor = 0;
  dedup.forEach((s, i) => {
    if (s.start > cursor) segments.push({ type: "text", text: text.slice(cursor, s.start) });
    segments.push({
      type: "phrase",
      text: text.slice(s.start, s.end),
      label: s.label,
      tone: s.tone,
      signal: s.signal,
      index: i,
    });
    cursor = s.end;
  });
  if (cursor < text.length) segments.push({ type: "text", text: text.slice(cursor) });

  return (
    <p className="whitespace-pre-line text-[14px] leading-[1.85] text-paper">
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.text}</span>;
        const isRust = seg.tone === "rust";
        const pillCls = isRust
          ? "border-rust/45 bg-rust/10 text-rust"
          : "border-vermillion/45 bg-vermillion/10 text-vermillion-glow";
        const tintDelay = (0.2 + seg.index * 0.35).toFixed(2);
        const labelDelay = (0.55 + seg.index * 0.35).toFixed(2);
        return (
          <span key={i}>
            <span
              ref={(el) => {
                if (phraseRefs && seg.signal) phraseRefs.current.set(seg.signal, el);
              }}
              className="phrase-tint rounded-[4px]"
              style={
                {
                  "--tint-bg": isRust
                    ? "rgba(168, 58, 35, 0.16)"
                    : "rgba(255, 110, 35, 0.16)",
                  animationDelay: `${tintDelay}s`,
                  padding: "0.1em 0.35em",
                  boxDecorationBreak: "clone",
                  WebkitBoxDecorationBreak: "clone",
                } as React.CSSProperties
              }
            >
              {seg.text}
            </span>
            <span
              className={`rw-label ml-1 inline-flex items-baseline rounded-full border px-1.5 py-[1px] font-mono text-[8.5px] uppercase tracking-wider ${pillCls}`}
              style={{ animationDelay: `${labelDelay}s` }}
            >
              {seg.label}
            </span>
          </span>
        );
      })}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────
// WhyRail — right column with lift + reasons
// ─────────────────────────────────────────────────────────────

function WhyRail({
  lift,
  currentScore,
  projectedScore,
  addressesSignals,
  text,
}: {
  lift: number;
  currentScore: number;
  projectedScore: number;
  addressesSignals: string[];
  text: string;
}) {
  const reasonItems = addressesSignals.slice(0, 4).map((sig) => ({
    signal: sig,
    ...(SIGNAL_REASONS[sig] ?? {
      title: `Strengthened ${sig.toLowerCase()}`,
      body: "Signal strengthened.",
    }),
  }));

  return (
    <aside className="flex flex-col gap-3 rounded-2xl border border-ink-700 bg-ink-900/40 px-4 py-4 md:px-4">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-moss">
          <TrendingUp size={11} className="mr-1 inline" strokeWidth={2.4} />
          Why this wins
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-serif text-[36px] leading-none tracking-tight text-moss tabular-nums">
            +{lift}
          </span>
          <span className="font-mono text-[12px] text-moss">pts lift</span>
        </div>
        <p className="mt-1 text-[11.5px] leading-snug text-ink-300">
          {addressesSignals.length > 0
            ? `Strengthens ${addressesSignals.length} of X's ranking signals.`
            : "Optimizes for X's ranking signals."}
        </p>
      </div>

      {/* Score bar */}
      <div className="space-y-1.5">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-ink-800">
          <div
            className="absolute left-0 top-0 h-full bg-moss/35"
            style={{ width: `${currentScore}%` }}
          />
          <div
            className="absolute top-0 h-full bg-moss"
            style={{
              left: `${currentScore}%`,
              width: `${Math.max(0, projectedScore - currentScore)}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between font-mono text-[9.5px] tabular-nums text-ink-400">
          <span>{currentScore}</span>
          <span className="text-moss">→ {projectedScore}</span>
          <span>100</span>
        </div>
      </div>

      <div className="space-y-2 border-t border-ink-700/60 pt-3">
        {reasonItems.map((r, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-moss/15">
              <Check size={9} className="text-moss" strokeWidth={2.6} />
            </span>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold leading-snug text-paper">{r.title}</div>
              <p className="text-[11px] leading-snug text-ink-300">{r.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2 border-t border-ink-700/60 pt-3">
        <CopyButton text={text} compact />
        <PrimaryActionButton text={text} compact />
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// Action buttons (shared)
// ─────────────────────────────────────────────────────────────

function CopyButton({ text, compact }: { text: string; compact?: boolean }) {
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border border-ink-700 bg-ink-900/60 ${
        compact ? "px-2.5 py-1.5" : "px-3.5 py-2"
      } font-mono text-[10.5px] uppercase tracking-wider text-ink-200 transition-colors hover:border-ink-500 hover:text-paper`}
    >
      {copied ? <Check size={10} strokeWidth={2.6} /> : <Copy size={10} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function PrimaryActionButton({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).catch(() => {})}
      className={`group inline-flex items-center justify-center gap-1.5 rounded-full bg-paper text-ink-950 ${
        compact ? "px-2.5 py-1.5 text-[10.5px]" : "px-4 py-2 text-[12px]"
      } font-mono uppercase tracking-wider transition-colors hover:bg-paper-warm`}
    >
      Use this version
      <ArrowRight size={11} strokeWidth={2.4} className="transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
