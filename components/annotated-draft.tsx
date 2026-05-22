"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Crosshair,
  MessageCircle,
  MousePointerClick,
  UserPlus,
  Heart,
  Repeat2,
  Quote as QuoteIcon,
  EyeOff,
  PencilLine,
  Sparkles,
  CheckCircle2,
  Flag,
  Ban,
  VolumeX,
  Image as ImageIcon,
  PlayCircle,
  Timer,
  TrendingUp,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type {
  AnalysisResult,
  Grade,
  LeakAnalysis,
  Risk,
} from "@/lib/types";

const isMeaningful = (s: string | undefined) => !!s && s.trim().length > 1;

const SIGNAL_ICONS: Record<string, LucideIcon> = {
  Like: Heart,
  Reply: MessageCircle,
  Repost: Repeat2,
  Quote: QuoteIcon,
  Click: MousePointerClick,
  "Profile click": UserRound,
  "Photo expand": ImageIcon,
  "Video view": PlayCircle,
  Dwell: Timer,
  Follow: UserPlus,
  "Not interested": EyeOff,
  Block: Ban,
  Mute: VolumeX,
  Report: Flag,
};

type AnnotationStyle = "spotlight" | "underline";

function pickAnnotationStyle(_idx: number, leak: LeakAnalysis, _total: number): AnnotationStyle {
  // Multi-line phrases (containing explicit \n) get underline — spotlight breaks ugly across line breaks
  if (leak.phrase.includes("\n")) return "underline";
  // Everything else → spotlight (rust-tinted bg box, works for any phrase, any post)
  return "spotlight";
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: MarkedUpDraft
// ─────────────────────────────────────────────────────────────

interface MarkedUpProps {
  result: AnalysisResult;
  draftText: string;
}

export function MarkedUpDraft({ result, draftText }: MarkedUpProps) {
  const userText = draftText?.trim() ?? "";
  const fromScreenshot = !userText && !!result.draft_text?.trim();
  const draft = (userText || result.draft_text?.trim() || "").trim();

  const leaks = useMemo<LeakAnalysis[]>(() => {
    if (result.leaks && result.leaks.length > 0) return resolveLeaks(result.leaks, draft);
    return deriveLeaksFromSignals(result, draft);
  }, [result, draft]);

  // Sort by reading order (first occurrence in draft text), not by impact —
  // so badges read ① top, ② middle, ③ bottom naturally.
  const sortedLeaks = useMemo(
    () =>
      [...leaks].sort((a, b) => {
        const aPos = draft.indexOf(a.phrase);
        const bPos = draft.indexOf(b.phrase);
        // unfound phrases go to the end
        if (aPos === -1) return 1;
        if (bPos === -1) return -1;
        return aPos - bPos;
      }),
    [leaks, draft]
  );

  // Highest-impact leak — used for the "biggest:" header indicator
  const biggestImpact = useMemo(
    () => [...leaks].sort((a, b) => b.impact_lift - a.impact_lift)[0],
    [leaks]
  );

  const supportingPhrases = useMemo(() => {
    const leakPhrases = new Set(sortedLeaks.map((l) => l.phrase));
    const out: string[] = [];
    result.positive_signals.forEach((p) => {
      if (p.grade !== "Weak") return;
      if (!isMeaningful(p.trigger)) return;
      if (leakPhrases.has(p.trigger!)) return;
      if (!draft.includes(p.trigger!)) return;
      out.push(p.trigger!);
    });
    return [...new Set(out)].slice(0, 2);
  }, [result, draft, sortedLeaks]);

  const [activeIdx, setActiveIdx] = useState<number>(0);

  if (!draft) return null;

  if (sortedLeaks.length === 0) {
    return (
      <div className="mt-10">
        <Header leakCount={0} biggestSignal={null} fromScreenshot={fromScreenshot} />
        <div className="rounded-2xl border border-moss/30 bg-moss/[0.06] px-6 py-7 md:px-8">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-paper">{draft}</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-moss/40 bg-moss/10 px-3 py-1 font-mono text-[10.5px] uppercase tracking-wider text-moss">
            <span>●</span>
            No major leaks found
          </div>
        </div>
      </div>
    );
  }

  const totalLift = sortedLeaks.reduce((acc, l) => acc + l.impact_lift, 0);
  const liftRange = `+${Math.round(totalLift * 0.75)} to +${totalLift} pts`;

  // Biggest leak = highest impact_lift leak (same as biggestImpact computed above)
  const biggestLeak = biggestImpact
    ? {
        title: biggestImpact.short_label,
        subtitle: biggestImpact.why_it_leaks
          ? shortTrigger(biggestImpact.why_it_leaks, 70)
          : `Weakens the ${biggestImpact.signal.toLowerCase()} signal.`,
      }
    : null;

  // Quickest win = highest impact_lift WEAK positive signal whose fix is friendly + actionable
  const quickestWinSig = useMemo(() => {
    const weakWithLift = result.positive_signals
      .filter((s) => s.grade === "Weak")
      .map((s) => {
        const matchingLeak = sortedLeaks.find((l) => l.signal === s.name);
        return { signal: s.name, lift: matchingLeak?.impact_lift ?? 10 };
      })
      .sort((a, b) => b.lift - a.lift);
    return weakWithLift[0];
  }, [result, sortedLeaks]);

  const quickestWin = quickestWinSig
    ? {
        title: WEAKNESS_TITLES[quickestWinSig.signal] ?? `Strengthen ${quickestWinSig.signal.toLowerCase()}`,
        subtitle: `One ${quickestWinSig.signal.toLowerCase()} edit can unlock more engagement.`,
      }
    : null;

  return (
    <div className="mt-10">
      <Header
        leakCount={sortedLeaks.length}
        biggestSignal={biggestImpact?.signal ?? null}
        fromScreenshot={fromScreenshot}
      />

      {/* Progression nav is the 3-step Draft → Diagnosis → Signal Check meta
          narrative. On mobile we hide the Draft + Working columns, so the
          3-step framing no longer applies — only show on md+. */}
      <div className="hidden md:block">
        <ProgressionNav />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-4">
        {/* COL 1 — Draft. Hidden on mobile: the draft is already shown in the
            HeroCompareMobile comparison above this section. */}
        <div className="hidden md:block col-reveal" style={{ animationDelay: "0.1s" }}>
          <DraftCanvas
            draft={draft}
            leaks={sortedLeaks}
            supportingPhrases={supportingPhrases}
            activeIdx={activeIdx}
            onSetActive={setActiveIdx}
          />
        </div>

        {/* COL 2 — What's Working. Hidden on mobile: this is reassurance, not
            action — mobile users come here to fix leaks, not be reassured. */}
        <div className="hidden md:block col-reveal" style={{ animationDelay: "0.3s" }}>
          <WhatsWorkingColumn result={result} />
        </div>

        {/* COL 3 — What To Strengthen. The only column kept on mobile —
            actionable fix list, with each fix anchored to a trigger phrase
            from the draft. */}
        <div className="col-reveal" style={{ animationDelay: "0.5s" }}>
          <WhatToStrengthenColumn result={result} liftRange={liftRange} />
        </div>
      </div>

      {/* BOTTOM SUMMARY STRIP — Biggest leak · Quickest win · Potential lift */}
      <div className="col-reveal" style={{ animationDelay: "0.7s" }}>
        <BottomSummaryStrip
          biggestLeak={biggestLeak}
          quickestWin={quickestWin}
          liftRange={liftRange}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────

function Header({
  leakCount,
  biggestSignal,
  fromScreenshot,
}: {
  leakCount: number;
  biggestSignal: string | null;
  fromScreenshot: boolean;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-vermillion">
          Your draft, marked up
        </div>
        <h3 className="mt-1.5 font-serif text-3xl tracking-tight text-paper md:text-[38px] md:leading-[1.05]">
          Where the{" "}
          <span className="serif-italic relative inline-block">
            algorithm
            <svg
              className="pointer-events-none absolute -bottom-1.5 left-0 h-2.5 w-full overflow-visible"
              viewBox="0 0 400 12"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M 4,7 C 80,3 200,10 396,5"
                stroke="rgb(var(--vermillion))"
                strokeWidth="2.8"
                strokeLinecap="round"
                className="confident-underline"
                style={{ animationDelay: "0.2s" }}
              />
              <path
                d="M 10,9 C 110,7 230,12 392,8"
                stroke="rgb(var(--vermillion))"
                strokeOpacity="0.4"
                strokeWidth="1.4"
                strokeLinecap="round"
                className="confident-underline-soft"
                style={{ animationDelay: "0.4s" }}
              />
            </svg>
          </span>{" "}
          leaks<span className="text-vermillion">.</span>
        </h3>
      </div>
      <div className="hidden items-center gap-3 sm:flex">
        {fromScreenshot && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900/60 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-300">
            <span className="h-1 w-1 rounded-full bg-vermillion-glow" />
            Read from screenshot
          </span>
        )}
        {leakCount > 0 && (
          <span className="font-mono text-[11px] text-ink-300">
            <span className="text-paper tabular-nums">{leakCount}</span> leak
            {leakCount === 1 ? "" : "s"}
            {biggestSignal && (
              <>
                <span className="mx-1.5 text-ink-500">·</span>
                biggest: <span className="text-vermillion-glow">{biggestSignal}</span>
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PROGRESSION NAV — ① DRAFT → ② DIAGNOSIS → ③ SIGNAL CHECK
// ─────────────────────────────────────────────────────────────

function ProgressionNav() {
  const steps = ["Draft", "Diagnosis", "Signal Check"];
  return (
    <div className="flex items-center justify-center gap-3 md:gap-5">
      {steps.map((label, idx) => (
        <div key={label} className="flex items-center gap-3 md:gap-5">
          <div className="prog-step flex items-center gap-2" style={{ animationDelay: `${idx * 0.15}s` }}>
            <span className="ring-badge h-6 w-6 rounded-full border-vermillion text-[11px] text-vermillion-glow">
              {idx + 1}
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-300">
              {label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <svg
              className="h-2 w-[60px] overflow-visible md:w-[90px]"
              viewBox="0 0 90 4"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M 2,2 L 80,2"
                stroke="rgb(var(--ink-600))"
                strokeWidth="1.2"
                strokeLinecap="round"
                className="prog-connector"
                style={{ animationDelay: `${idx * 0.15 + 0.15}s` }}
              />
              <path
                d={`M 80,2 L 75,-0.5 M 80,2 L 75,4.5`}
                stroke="rgb(var(--ink-500))"
                strokeWidth="1.2"
                strokeLinecap="round"
                className="prog-step"
                style={{ animationDelay: `${idx * 0.15 + 0.55}s` }}
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DRAFT CANVAS — col 1
// ─────────────────────────────────────────────────────────────

type IssueConnector = {
  idx: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  noteX: number;
  noteY: number;
};

function DraftCanvas({
  draft,
  leaks,
  supportingPhrases,
  activeIdx,
  onSetActive,
}: {
  draft: string;
  leaks: LeakAnalysis[];
  supportingPhrases: string[];
  activeIdx: number;
  onSetActive: (i: number) => void;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const markRefs = useRef<(HTMLElement | null)[]>([]);
  const [connectors, setConnectors] = useState<IssueConnector[]>([]);

  type Seg =
    | { type: "text"; text: string }
    | { type: "leak"; text: string; index: number; leak: LeakAnalysis }
    | { type: "support"; text: string };

  const segments = useMemo<Seg[]>(() => {
    type Match = {
      start: number;
      end: number;
      kind: "leak" | "support";
      index?: number;
      leak?: LeakAnalysis;
    };
    const matches: Match[] = [];

    leaks.forEach((l, idx) => {
      const i = draft.indexOf(l.phrase);
      if (i === -1) return;
      matches.push({
        start: i,
        end: i + l.phrase.length,
        kind: "leak",
        index: idx,
        leak: l,
      });
    });
    supportingPhrases.forEach((phrase) => {
      const i = draft.indexOf(phrase);
      if (i === -1) return;
      matches.push({ start: i, end: i + phrase.length, kind: "support" });
    });

    matches.sort((a, b) => a.start - b.start);
    const dedup: Match[] = [];
    matches.forEach((m) => {
      const last = dedup[dedup.length - 1];
      if (last && m.start < last.end) {
        if (m.kind === "leak" && last.kind === "support") dedup[dedup.length - 1] = m;
        return;
      }
      dedup.push(m);
    });

    const out: Seg[] = [];
    let cur = 0;
    dedup.forEach((m) => {
      if (m.start > cur) out.push({ type: "text", text: draft.slice(cur, m.start) });
      if (m.kind === "leak") {
        out.push({
          type: "leak",
          text: draft.slice(m.start, m.end),
          index: m.index!,
          leak: m.leak!,
        });
      } else {
        out.push({ type: "support", text: draft.slice(m.start, m.end) });
      }
      cur = m.end;
    });
    if (cur < draft.length) out.push({ type: "text", text: draft.slice(cur) });
    return out;
  }, [draft, leaks, supportingPhrases]);

  type DraftLinePart = {
    segment: Seg;
    segmentIndex: number;
    text: string;
  };

  type DraftLine = {
    parts: DraftLinePart[];
    hasIssue: boolean;
    isBlank: boolean;
  };

  const draftLines = useMemo<DraftLine[]>(() => {
    const lines: DraftLine[] = [{ parts: [], hasIssue: false, isBlank: false }];

    segments.forEach((segment, segmentIndex) => {
      segment.text.split("\n").forEach((text, chunkIndex) => {
        if (chunkIndex > 0) lines.push({ parts: [], hasIssue: false, isBlank: false });
        if (!text) return;

        const line = lines[lines.length - 1];
        line.parts.push({ segment, segmentIndex, text });
        if (segment.type === "leak") line.hasIssue = true;
      });
    });

    return lines.map((line) => ({
      ...line,
      isBlank: line.parts.length === 0,
    }));
  }, [segments]);

  const measureConnectors = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const NOTE_WIDTH = 126;
    const NOTE_DOT_RADIUS = 11;
    const noteX = Math.max(0, canvasRect.width - NOTE_WIDTH);
    const lineEndX = noteX - 10;
    const safeLineStartX = noteX - 48;

    type DraftLayout = {
      idx: number;
      noteY: number;
      startX: number;
      startY: number;
    };

    const drafts = leaks.flatMap((leak, idx): DraftLayout[] => {
      const mark = markRefs.current[idx];
      if (!mark) return [];

      const markRect = mark.getBoundingClientRect();
      if (!markRect.width) return [];

      const phraseStart = draft.indexOf(leak.phrase);
      const phraseEnd = phraseStart + leak.phrase.length;
      const nextBreak = phraseStart === -1 ? -1 : draft.indexOf("\n", phraseEnd);
      const lineTail =
        phraseStart === -1 ? "" : draft.slice(phraseEnd, nextBreak === -1 ? draft.length : nextBreak);
      const endsTextLine = lineTail.trim().length === 0;

      const markRight = markRect.right - canvasRect.left;
      const markY = markRect.top - canvasRect.top + markRect.height / 2;
      const startsAtPhrase = endsTextLine || markRight >= safeLineStartX - 18;
      const rawStartX = startsAtPhrase ? markRight + 10 : safeLineStartX;
      const startX = Math.max(8, Math.min(rawStartX, lineEndX - 22));

      return [
        {
          idx,
          noteY: Math.max(0, markY - NOTE_DOT_RADIUS),
          startX,
          startY: markY,
        },
      ];
    });

    const next = drafts
      .sort((a, b) => a.idx - b.idx)
      .map((item) => ({
        idx: item.idx,
        startX: item.startX,
        startY: item.startY,
        endX: lineEndX,
        endY: item.startY,
        noteX,
        noteY: item.noteY,
      }));

    setConnectors(next);
  }, [draft, leaks]);

  useLayoutEffect(() => {
    measureConnectors();
  }, [measureConnectors, draftLines]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver(measureConnectors);
    ro.observe(canvas);
    window.addEventListener("resize", measureConnectors);
    const t = window.setTimeout(measureConnectors, 420);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureConnectors);
      window.clearTimeout(t);
    };
  }, [measureConnectors]);

  return (
    <div
      className={`draft-canvas-card relative flex h-[520px] min-h-[460px] flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/40 px-4 py-5 md:px-5 ${
        activeIdx >= 0 && activeIdx < leaks.length ? "has-active" : ""
      }`}
      style={{
        backgroundImage: "radial-gradient(rgba(255,110,35,0.022) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-px left-0 h-px w-full bg-gradient-to-r from-transparent via-rust/50 to-transparent"
      />

      {/* eyebrow */}
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
        <PencilLine size={11} />
        Your draft (marked up)
      </div>

      {/* Draft text */}
      <div className="draft-markup-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        <div className="w-full pb-2">
          <div ref={canvasRef} className="relative min-h-full">
            <IssueAnnotationLayer
              connectors={connectors}
              leaks={leaks}
              activeIdx={activeIdx}
              onSetActive={onSetActive}
            />
            <div className="marked-draft-copy relative z-[2] text-[15.5px] text-paper">
              {draftLines.map((line, lineIndex) => (
                <span
                  key={`line-${lineIndex}`}
                  className={`marked-draft-line ${line.hasIssue ? "has-issue" : ""} ${
                    line.isBlank ? "is-blank" : ""
                  }`}
                >
                  {line.parts.map((part, partIndex) => {
                    const seg = part.segment;
                    const key = `${lineIndex}-${partIndex}-${part.segmentIndex}`;

                    if (seg.type === "text") return <span key={key}>{part.text}</span>;
                    if (seg.type === "support") {
                      return (
                        <SupportingMark
                          key={key}
                          text={part.text}
                          drawDelay={(1.4 + part.segmentIndex * 0.1).toFixed(2)}
                        />
                      );
                    }

                    const drawDelay = (0.3 + seg.index * 0.3).toFixed(2);
                    const style = pickAnnotationStyle(seg.index, seg.leak, leaks.length);
                    return (
                      <LeakMark
                        key={key}
                        text={part.text}
                        index={seg.index}
                        leak={seg.leak}
                        style={style}
                        isActive={activeIdx === seg.index}
                        drawDelay={drawDelay}
                        innerRef={(el) => (markRefs.current[seg.index] = el)}
                        onClick={() => onSetActive(seg.index)}
                      />
                    );
                  })}
                </span>
              ))}
            </div>
          </div>

          <IssueLegend leaks={leaks} activeIdx={activeIdx} onSetActive={onSetActive} />
        </div>
      </div>

      <div className="mt-3 flex shrink-0 items-center gap-2.5 border-t border-ink-700/60 pt-3 text-[11.5px] text-ink-300">
        <Sparkles size={12} className="text-vermillion-glow" />
        <span>
          {leaks.length} {leaks.length === 1 ? "issue" : "issues"} reduce reply intent, clarity, and
          perceived value.
        </span>
      </div>
    </div>
  );
}

function IssueAnnotationLayer({
  connectors,
  leaks,
  activeIdx,
  onSetActive,
}: {
  connectors: IssueConnector[];
  leaks: LeakAnalysis[];
  activeIdx: number;
  onSetActive: (i: number) => void;
}) {
  return (
    <>
      <svg className="issue-connector-overlay" aria-hidden="true">
        {connectors.map((connector) => {
          const isActive = activeIdx === connector.idx;
          return (
            <g key={connector.idx} className={isActive ? "is-active" : ""}>
              <path
                d={`M ${connector.startX},${connector.startY} L ${connector.endX},${connector.endY}`}
                className="issue-connector-path"
              />
              <circle cx={connector.endX} cy={connector.endY} r={2.6} className="issue-connector-dot" />
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 z-[3] hidden sm:block">
        {connectors.map((connector) => {
          const leak = leaks[connector.idx];
          if (!leak) return null;
          const isActive = activeIdx === connector.idx;
          return (
            <button
              key={`note-${connector.idx}`}
              type="button"
              onClick={() => onSetActive(connector.idx)}
              onMouseEnter={() => onSetActive(connector.idx)}
              className={`issue-note-card pointer-events-auto absolute text-left ${isActive ? "is-active" : ""}`}
              style={{
                left: `${connector.noteX}px`,
                top: `${connector.noteY}px`,
                animationDelay: `${0.35 + connector.idx * 0.09}s`,
              }}
              title={`Issue ${connector.idx + 1}: ${leak.short_label}`}
            >
              <span className={`issue-note-badge ${isActive ? "is-active" : ""}`}>
                {connector.idx + 1}
              </span>
              <span className="issue-note-label">{leak.short_label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function IssueLegend({
  leaks,
  activeIdx,
  onSetActive,
}: {
  leaks: LeakAnalysis[];
  activeIdx: number;
  onSetActive: (i: number) => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2 rounded-xl border border-ink-700/60 bg-ink-950/35 p-2 sm:hidden">
      {leaks.map((leak, idx) => {
        const isActive = activeIdx === idx;
        return (
          <button
            key={`${leak.short_label}-${idx}`}
            type="button"
            onClick={() => onSetActive(idx)}
            onMouseEnter={() => onSetActive(idx)}
            className={`issue-map-chip flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-left ${
              isActive
                ? "is-active border-vermillion/65 bg-vermillion/[0.12] text-paper"
                : "border-ink-700 bg-ink-900/70 text-ink-300 hover:border-vermillion/45 hover:text-paper"
            }`}
            title={`Issue ${idx + 1}: ${leak.short_label}`}
          >
            <span
              className={`ring-badge h-5 w-5 shrink-0 rounded-full text-[10px] ${
                isActive ? "border-vermillion text-vermillion-glow" : "border-ink-600 text-ink-300"
              }`}
            >
              {idx + 1}
            </span>
            <span className="truncate text-[11.5px] font-medium">{leak.short_label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SupportingMark({ text, drawDelay }: { text: string; drawDelay: string }) {
  const lines = text.split("\n");
  return (
    <span className="inline opacity-80">
      {lines.map((line, idx) => (
        <span key={idx} className="relative inline-block align-baseline">
          <span>{line}</span>
          <svg
            className="pointer-events-none absolute left-0 right-0 -bottom-[5px] h-[10px] w-full overflow-visible"
            viewBox="0 0 400 14"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M 5,8 C 80,4 200,11 395,5"
              stroke="rgb(var(--vermillion))"
              strokeOpacity="0.65"
              strokeWidth="2"
              strokeLinecap="round"
              className="thick-underline"
              style={{ animationDelay: `${drawDelay}s` }}
            />
          </svg>
          {idx < lines.length - 1 && "\n"}
        </span>
      ))}
    </span>
  );
}

function LeakMark({
  text,
  index,
  leak,
  style,
  isActive,
  drawDelay,
  innerRef,
  onClick,
}: {
  text: string;
  index: number;
  leak: LeakAnalysis;
  style: AnnotationStyle;
  isActive: boolean;
  drawDelay: string;
  innerRef: (el: HTMLElement | null) => void;
  onClick: () => void;
}) {
  // unified orange palette — no severity differentiation in color (severity shown in tag text)
  const stroke = "rgb(var(--vermillion))";
  const lines = text.split("\n");

  const stateClasses = `leak-mark ${isActive ? "is-active" : ""}`;

  const interactiveProps = {
    onClick,
    role: "button" as const,
    tabIndex: 0 as const,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
    title: `Leak #${index + 1} — ${leak.short_label}`,
    "aria-label": `Issue ${index + 1}: ${leak.short_label}`,
  };

  if (style === "spotlight") {
    return (
      <span
        ref={innerRef as any}
        data-leak-idx={index}
        className={`${stateClasses} issue-anchor phrase-spotlight cursor-pointer`}
        {...interactiveProps}
      >
        {text}
        <InlineIssueBadge index={index} isActive={isActive} />
      </span>
    );
  }

  return (
    <span
      ref={innerRef as any}
      data-leak-idx={index}
      className={`${stateClasses} issue-anchor cursor-pointer`}
      {...interactiveProps}
    >
      {lines.map((line, idx) => (
        <span key={idx} className="relative inline-block align-baseline">
          <span>{line}</span>
          <ThickUnderline stroke={stroke} delay={drawDelay} />
          {idx < lines.length - 1 && "\n"}
        </span>
      ))}
      <InlineIssueBadge index={index} isActive={isActive} />
    </span>
  );
}

function InlineIssueBadge({
  index,
  isActive,
}: {
  index: number;
  isActive: boolean;
}) {
  return (
    <span className={`issue-anchor-badge ${isActive ? "is-active" : ""}`} aria-hidden="true">
      {index + 1}
    </span>
  );
}

function ThickUnderline({ stroke, delay }: { stroke: string; delay: string }) {
  return (
    <svg
      className="pointer-events-none absolute left-0 right-0 -bottom-[6px] h-[10px] w-full overflow-visible"
      viewBox="0 0 400 14"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M 3,7 C 90,3 155,11 240,5 C 320,2 360,9 397,4"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        className="thick-underline"
        style={{ animationDelay: `${delay}s` }}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// SIGNAL BOARD — shared language for What's Working / What To Strengthen
// ─────────────────────────────────────────────────────────────

type SignalBoardTone = "working" | "strengthen";

type SignalBoardItem = {
  key: string;
  signal: string;
  title: string;
  description: string;
  trigger?: string;
  grade?: Grade;
  /** Right-side block content: stat (for working) or suggestion (for strengthen). */
  rightBlock?: { label: string; body: string; italic?: boolean };
};

const POSITIVE_RANK: Record<Grade, number> = {
  Strong: 0,
  Moderate: 1,
  Weak: 2,
};

const NEGATIVE_RANK: Record<Risk, number> = {
  High: 0,
  Moderate: 1,
  Low: 2,
};

const SIGNAL_TAG_LABELS: Record<string, string> = {
  "Profile click": "Profile click",
  "Photo expand": "Photo expand",
  "Video view": "Video view",
  "Not interested": "Not interested",
};

function signalTagLabel(signal: string) {
  return SIGNAL_TAG_LABELS[signal] ?? signal;
}

// ─────────────────────────────────────────────────────────────
// Per-signal color identity (icon + tag pill share the same hue)
// ─────────────────────────────────────────────────────────────

type SignalHue = { hue: string; Icon: LucideIcon };

const SIGNAL_VISUALS: Record<string, SignalHue> = {
  Like:             { hue: "236, 90, 130",  Icon: Heart },
  Reply:            { hue: "236, 90, 130",  Icon: MessageCircle },
  Repost:           { hue: "232, 130, 50",  Icon: Repeat2 },
  Quote:            { hue: "232, 130, 50",  Icon: QuoteIcon },
  Click:            { hue: "80, 130, 220",  Icon: MousePointerClick },
  "Profile click":  { hue: "140, 100, 220", Icon: UserPlus },
  "Photo expand":   { hue: "220, 80, 80",   Icon: ImageIcon },
  "Video view":     { hue: "90, 175, 110",  Icon: PlayCircle },
  Dwell:            { hue: "70, 170, 195",  Icon: Timer },
  Follow:           { hue: "140, 100, 220", Icon: Sparkles },
  "Not interested": { hue: "200, 80, 80",   Icon: EyeOff },
  Block:            { hue: "200, 80, 80",   Icon: Ban },
  Mute:             { hue: "200, 80, 80",   Icon: VolumeX },
  Report:           { hue: "200, 80, 80",   Icon: Flag },
};

function signalStyle(name: string) {
  const v = SIGNAL_VISUALS[name] ?? { hue: "150, 150, 150", Icon: MessageCircle };
  return {
    iconBoxStyle: { backgroundColor: `rgba(${v.hue}, 0.14)` },
    iconColorStyle: { color: `rgb(${v.hue})` },
    pillStyle: {
      borderColor: `rgba(${v.hue}, 0.45)`,
      color: `rgb(${v.hue})`,
    },
    accentColor: `rgba(${v.hue}, 0.7)`,
    Icon: v.Icon,
  };
}

// ─────────────────────────────────────────────────────────────
// Titles + generic descriptions per signal
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
  Dwell: "High dwell time",
  Follow: "Clear follow signal",
};

const STRENGTH_DESCRIPTIONS: Record<string, string> = {
  Like: "Clear utility framing invites lightweight approval.",
  Reply: "A direct prompt opens the door to discussion.",
  Repost: "Concise, benefit-forward copy is easy to repost.",
  Quote: "Quotable phrasing invites people to amplify with their own take.",
  Click: "Concrete features and benefits drive curiosity and clicks.",
  "Profile click": "Unique position and product build profile trust and follows.",
  "Photo expand": "Image-supported content earns longer attention.",
  "Video view": "Native video format drives higher attention and completion.",
  Dwell: "Detailed specifics give people a reason to read closely.",
  Follow: "Distinctive POV signals there's more worth following.",
};

const WEAKNESS_TITLES: Record<string, string> = {
  Like: "Add explicit like intent",
  Reply: "Add a reply trigger",
  Repost: "Make it more shareable",
  Quote: "Make it more quotable",
  Click: "Stronger click motivation",
  "Profile click": "Add a profile nudge",
  "Photo expand": "Add a visual",
  "Video view": "Add native video",
  Dwell: "Reward more dwell",
  Follow: "Sharpen the hook",
};

const WEAKNESS_DESCRIPTIONS: Record<string, string> = {
  Like: "Add a clear benefit or stance to invite explicit approval.",
  Reply: "Pose a direct question to unlock more replies.",
  Repost: "Make the value easier to share in one line.",
  Quote: "Add a short, punchy line worth quoting.",
  Click: "Lead with a concrete hook that pulls people in.",
  "Profile click": "Invite curiosity to drive profile visits.",
  "Photo expand": "Visual posts earn 2.3x more engagement.",
  "Video view": "Embed a short native video to boost dwell.",
  Dwell: "Add a specific detail people will pause to read.",
  Follow: "Lead with a specific benefit or surprising claim.",
};

const NEG_TITLES: Record<string, string> = {
  "Not interested": "Reduce perceived risk",
  Block: "Soften abrasive tone",
  Mute: "Trim repetitive patterns",
  Report: "Review policy concerns",
};

const NEG_DESCRIPTIONS: Record<string, string> = {
  "Not interested": "Tighten relevance and trim filler so viewers don't tap away.",
  Block: "Soften aggressive or polarizing tone.",
  Mute: "Avoid repetitive patterns that fatigue feeds.",
  Report: "Review against platform safety guidelines.",
};

// Generic micro-stats per signal — used in WHAT'S WORKING right-side EVIDENCE block.
// Handcrafted from public-pattern observations; not from the open repo.
const EVIDENCE_BY_SIGNAL: Record<string, string> = {
  Like: "Utility posts earn more likes than opinion posts.",
  Reply: "Question-led posts unlock 4x more replies.",
  Repost: "Short, scannable posts are reposted 1.8x more.",
  Quote: "Quotable lines get amplified 1.5x more often.",
  Click: "Feature-led posts drive 1.6x more profile clicks.",
  "Profile click": "Distinctive POV drives 3x more profile visits.",
  "Photo expand": "Image-supported posts hold attention 30% longer.",
  "Video view": "Videos get 2.3x more engagement on average.",
  Dwell: "Detailed posts hold attention 2x longer.",
  Follow: "Recurring POV posts earn 2x more follows.",
};

// Fallback "TRY THIS" suggestions per signal — used in WHAT TO STRENGTHEN right-side block
// when the model didn't return a matching leak's suggested_rewrite.
const TRY_THIS_BY_SIGNAL: Record<string, string> = {
  Like: "Make the benefit explicit and easy to agree with.",
  Reply: "Pose a direct question your audience would actually answer.",
  Repost: "Strip filler so the takeaway fits in 1–2 lines.",
  Quote: "Distill the insight into one quotable line.",
  Click: "Add a concrete hook or specific number.",
  "Profile click": "Tease a follow-up: \"see example on my profile.\"",
  "Photo expand": "Add a 10–15s demo clip or before/after image.",
  "Video view": "Embed a 15s native video clip.",
  Dwell: "Add a specific data point or surprising detail.",
  Follow: "Lead with a recurring POV like \"every week I…\".",
  "Not interested": "Lead with a specific claim, not a saturated trope.",
  Block: "Soften absolute statements to invite discussion.",
  Mute: "Vary your topic angles to avoid feeling repetitive.",
  Report: "Review against platform safety guidelines.",
};

// ─────────────────────────────────────────────────────────────
// WHAT'S WORKING COLUMN — col 2
// ─────────────────────────────────────────────────────────────

const VISIBLE_LIMIT = 4;

function WhatsWorkingColumn({ result }: { result: AnalysisResult }) {
  const items = useMemo<SignalBoardItem[]>(() => {
    return [...result.positive_signals]
      .filter((s) => s.grade !== "Weak")
      .sort((a, b) => POSITIVE_RANK[a.grade] - POSITIVE_RANK[b.grade])
      .map((s) => ({
        key: `working-${s.name}`,
        signal: s.name,
        title: STRENGTH_TITLES[s.name] ?? s.name,
        description: STRENGTH_DESCRIPTIONS[s.name] ?? s.reason,
        grade: s.grade,
      }));
  }, [result]);

  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, VISIBLE_LIMIT);
  const hiddenCount = Math.max(0, items.length - VISIBLE_LIMIT);

  return (
    <SignalBoardFrame
      tone="working"
      icon={CheckCircle2}
      label="What's working"
      subtitle="Signals already helping this post perform"
      count={items.length}
      footer={
        hiddenCount > 0 ? (
          <ShowMoreToggle
            tone="working"
            expanded={expanded}
            hiddenCount={hiddenCount}
            onToggle={() => setExpanded((v) => !v)}
          />
        ) : null
      }
    >
      {items.length === 0 ? (
        <EmptySignalState tone="working" text="No strong signals yet." />
      ) : (
        visible.map((item) => <SignalBoardRow key={item.key} tone="working" item={item} />)
      )}
    </SignalBoardFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// WHAT TO STRENGTHEN COLUMN — col 3
// ─────────────────────────────────────────────────────────────

function WhatToStrengthenColumn({
  result,
  liftRange,
}: {
  result: AnalysisResult;
  liftRange: string;
}) {
  const items = useMemo<SignalBoardItem[]>(() => {
    // Substitute-signal mutex: if one media signal is already strong, hide weakness
    // recommendations for its substitute. A video covers the visual need.
    const videoStrong = result.positive_signals.some(
      (s) => s.name === "Video view" && s.grade !== "Weak"
    );
    const photoStrong = result.positive_signals.some(
      (s) => s.name === "Photo expand" && s.grade !== "Weak"
    );
    const suppressed = new Set<string>();
    if (videoStrong) suppressed.add("Photo expand");
    if (photoStrong) suppressed.add("Video view");

    const weak = result.positive_signals
      .filter((s) => s.grade === "Weak")
      .filter((s) => !suppressed.has(s.name))
      .map((s): SignalBoardItem => ({
        key: `w-${s.name}`,
        signal: s.name,
        title: WEAKNESS_TITLES[s.name] ?? `Boost ${s.name.toLowerCase()}`,
        description: WEAKNESS_DESCRIPTIONS[s.name] ?? s.reason,
      }));
    const risks = result.negative_signals
      .filter((n) => n.risk !== "Low")
      .sort((a, b) => NEGATIVE_RANK[a.risk] - NEGATIVE_RANK[b.risk])
      .map((n): SignalBoardItem => ({
        key: `n-${n.name}`,
        signal: n.name,
        title: NEG_TITLES[n.name] ?? `Reduce ${n.name.toLowerCase()} risk`,
        description: NEG_DESCRIPTIONS[n.name] ?? n.reason,
      }));
    return [...weak, ...risks];
  }, [result]);

  const [showFullReport, setShowFullReport] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, VISIBLE_LIMIT);
  const hiddenCount = Math.max(0, items.length - VISIBLE_LIMIT);

  return (
    <SignalBoardFrame
      tone="strengthen"
      icon={Flag}
      label="What to strengthen"
      subtitle="Small edits that could improve replies + clicks"
      count={items.length}
      footer={
        <div className="space-y-3 pt-1">
          {hiddenCount > 0 && (
            <ShowMoreToggle
              tone="strengthen"
              expanded={expanded}
              hiddenCount={hiddenCount}
              onToggle={() => setExpanded((v) => !v)}
            />
          )}
          <div className="flex items-end justify-between gap-3 border-t border-ink-700/60 pt-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
                Potential lift:
              </div>
              <div className="mt-0.5 font-mono text-[16px] tabular-nums text-moss">
                {liftRange}
              </div>
            </div>
            <button
              onClick={() => setShowFullReport((v) => !v)}
              className="inline-flex items-center gap-1 text-[12px] text-ink-300 transition-colors hover:text-paper"
            >
              View full signal report
              <ChevronDown
                size={12}
                className={`transition-transform duration-300 ${showFullReport ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          {showFullReport && <FullSignalReport result={result} />}
        </div>
      }
    >
      {items.length === 0 ? (
        <EmptySignalState tone="strengthen" text="No weak signals found." />
      ) : (
        visible.map((item) => <SignalBoardRow key={item.key} tone="strengthen" item={item} />)
      )}
    </SignalBoardFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// SHOW MORE / FEWER TOGGLE
// ─────────────────────────────────────────────────────────────

function ShowMoreToggle({
  tone,
  expanded,
  hiddenCount,
  onToggle,
}: {
  tone: SignalBoardTone;
  expanded: boolean;
  hiddenCount: number;
  onToggle: () => void;
}) {
  const accent = tone === "working" ? "text-moss" : "text-vermillion-glow";
  const accentBorder = tone === "working" ? "border-moss/35" : "border-vermillion/40";
  const accentBgHover = tone === "working" ? "hover:bg-moss/5" : "hover:bg-vermillion/5";
  return (
    <button
      onClick={onToggle}
      className={`group flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed ${accentBorder} py-2 font-mono text-[10.5px] uppercase tracking-[0.15em] ${accent} transition-colors ${accentBgHover}`}
    >
      <span>
        {expanded ? "Show fewer" : `Show ${hiddenCount} more`}
      </span>
      <ChevronDown
        size={11}
        className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""} group-hover:translate-y-[1px]`}
      />
    </button>
  );
}

function SignalBoardFrame({
  tone,
  icon: Icon,
  label,
  subtitle,
  count,
  footer,
  children,
}: {
  tone: SignalBoardTone;
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  count: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isWorking = tone === "working";
  return (
    <section
      className={`signal-board-card flex h-full min-h-0 flex-col rounded-2xl border px-4 py-4 md:px-5 ${
        isWorking ? "is-working border-moss/25" : "is-strengthen border-vermillion/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3 pb-3">
        <div className="flex items-start gap-2.5">
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-black/[0.04] ${
              isWorking ? "bg-moss/15 text-moss" : "bg-vermillion/15 text-vermillion-glow"
            }`}
          >
            <Icon size={13} strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <div
              className={`signal-board-kicker ${
                isWorking ? "text-moss" : "text-vermillion-glow"
              }`}
            >
              {label}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-300">{subtitle}</p>
            )}
          </div>
        </div>
        <span className="shrink-0 pt-1 font-mono text-[10.5px] tabular-nums text-ink-400">
          {count} signal{count === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">{children}</div>

      {footer && <div className="mt-3 border-t border-ink-700/60 pt-3">{footer}</div>}
    </section>
  );
}

function EmptySignalState({ tone, text }: { tone: SignalBoardTone; text: string }) {
  return (
    <div
      className={`flex min-h-[84px] items-center rounded-xl border border-dashed px-3 text-[12.5px] ${
        tone === "working"
          ? "border-moss/25 bg-moss/[0.035] text-moss"
          : "border-vermillion/25 bg-vermillion/[0.035] text-vermillion-glow"
      }`}
    >
      {text}
    </div>
  );
}


function FullSignalReport({ result }: { result: AnalysisResult }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-ink-700/60 pt-3">
      {result.positive_signals.map((p, i) => (
        <div
          key={p.name}
          className="full-report-row flex items-center justify-between gap-2 text-[10.5px]"
          style={{ animationDelay: `${i * 0.03}s` }}
        >
          <span className="truncate text-ink-300">{p.name}</span>
          <span className={`font-mono tabular-nums ${statusTextClass(p.grade)}`}>
            {p.grade.slice(0, 3).toUpperCase()}
          </span>
        </div>
      ))}
      {result.negative_signals.map((n, i) => (
        <div
          key={n.name}
          className="full-report-row flex items-center justify-between gap-2 text-[10.5px]"
          style={{ animationDelay: `${(i + 10) * 0.03}s` }}
        >
          <span className="truncate text-ink-300">{n.name}</span>
          <span className={`font-mono tabular-nums ${statusTextClass(n.risk)}`}>
            {n.risk.slice(0, 3).toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

function statusTextClass(status: string) {
  if (status === "Strong" || status === "Low") return "text-moss";
  if (status === "Moderate") return "text-vermillion-glow";
  return "text-rust";
}

function SignalBoardRow({
  tone,
  item,
}: {
  tone: SignalBoardTone;
  item: SignalBoardItem;
}) {
  const { iconBoxStyle, iconColorStyle, pillStyle, accentColor, Icon } = signalStyle(item.signal);
  const hasTrigger = !!item.trigger && item.trigger.trim().length > 1;
  const isWorking = tone === "working";

  return (
    <article
      className={`signal-board-row group relative overflow-hidden rounded-xl border px-3.5 py-3.5 transition-all hover:-translate-y-[1px] hover:shadow-[0_10px_22px_-14px_rgba(0,0,0,0.35)] ${
        isWorking ? "is-working" : "is-strengthen"
      }`}
    >
      {/* TOP: icon + title + signal pill */}
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-black/[0.04] transition-transform group-hover:scale-105"
          style={iconBoxStyle}
        >
          <Icon size={18} strokeWidth={2} style={iconColorStyle} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[14px] font-semibold leading-snug text-paper">
              {item.title}
            </h4>
            <span
              className="mt-[1px] inline-flex shrink-0 items-center rounded-full border bg-transparent px-2 py-[1px] font-mono text-[9px] uppercase tracking-wider"
              style={pillStyle}
            >
              {signalTagLabel(item.signal)}
            </span>
          </div>
          {item.description && (
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-300">
              {item.description}
            </p>
          )}
          {hasTrigger && !isWorking && (
            <div className="mt-2 flex items-start gap-2.5">
              <span
                className="mt-[5px] h-3 w-[2.5px] shrink-0 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <span className="font-serif text-[12.5px] italic leading-snug text-ink-300">
                &ldquo;{shortTrigger(item.trigger!)}&rdquo;
              </span>
            </div>
          )}
          {item.grade === "Moderate" && (
            <span className="mt-2 inline-flex items-center rounded-full border border-ink-600 bg-ink-900/40 px-1.5 py-[1px] font-mono text-[8.5px] uppercase tracking-wider text-ink-400">
              moderate
            </span>
          )}
        </div>
      </div>

    </article>
  );
}

function shortTrigger(s: string, max = 92): string {
  if (s.length <= max) return s;
  const trunc = s.slice(0, max - 1);
  const lastSpace = trunc.lastIndexOf(" ");
  return trunc.slice(0, lastSpace > 60 ? lastSpace : max - 1).trim() + "…";
}

// ─────────────────────────────────────────────────────────────
// BOTTOM SUMMARY STRIP — Biggest leak · Quickest win · Potential lift
// ─────────────────────────────────────────────────────────────

function BottomSummaryStrip({
  biggestLeak,
  quickestWin,
  liftRange,
}: {
  biggestLeak: { title: string; subtitle: string } | null;
  quickestWin: { title: string; subtitle: string } | null;
  liftRange: string;
}) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-3 rounded-2xl border border-ink-700 bg-ink-900/40 px-5 py-4 shadow-[0_18px_50px_-30px_rgba(75,40,15,0.18)] md:grid-cols-3 md:items-center md:gap-6">
      {/* BIGGEST LEAK */}
      <SummaryItem
        icon={Crosshair}
        iconTone="vermillion"
        eyebrow="Biggest leak"
        title={biggestLeak?.title ?? "None"}
        subtitle={biggestLeak?.subtitle ?? "Your draft has no major leaks."}
      />

      {/* QUICKEST WIN */}
      <SummaryItem
        icon={Zap}
        iconTone="moss"
        eyebrow="Quickest win"
        title={quickestWin?.title ?? "Ship it"}
        subtitle={quickestWin?.subtitle ?? "Nothing urgent to fix."}
      />

      {/* POTENTIAL LIFT */}
      <SummaryItem
        icon={TrendingUp}
        iconTone="vermillion"
        eyebrow="Potential lift"
        title={<span className="font-mono tabular-nums text-moss">{liftRange}</span>}
        subtitle="Replies + clicks combined"
      />
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  iconTone,
  eyebrow,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  iconTone: "moss" | "vermillion";
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
}) {
  const iconStyles =
    iconTone === "moss"
      ? "border-moss/35 bg-moss/12 text-moss"
      : "border-vermillion/35 bg-vermillion/12 text-vermillion-glow";
  return (
    <div className="flex items-start gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${iconStyles}`}
      >
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-400">
          {eyebrow}
        </div>
        <div className="mt-0.5 text-[14px] font-semibold leading-snug text-paper">
          {title}
        </div>
        <p className="mt-0.5 text-[11.5px] leading-snug text-ink-300">{subtitle}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function resolveLeaks(leaks: LeakAnalysis[], draft: string): LeakAnalysis[] {
  return leaks.filter((l) => isMeaningful(l.phrase) && draft.includes(l.phrase));
}

function deriveLeaksFromSignals(result: AnalysisResult, draft: string): LeakAnalysis[] {
  const out: LeakAnalysis[] = [];
  result.positive_signals.forEach((p) => {
    if (p.grade !== "Weak") return;
    if (!isMeaningful(p.trigger) || !draft.includes(p.trigger!)) return;
    out.push({
      phrase: p.trigger!,
      short_label: isMeaningful(p.fix_label) ? capitalize(p.fix_label!) : `Weak ${p.name.toLowerCase()}`,
      signal: p.name,
      severity: "Weak",
      why_it_leaks: p.reason,
      ranker_assumes: `Reads like a weak ${p.name.toLowerCase()} signal.`,
      fix_strategy: `Strengthen the ${p.name.toLowerCase()} signal in this phrase.`,
      suggested_rewrite: p.trigger!,
      impact_lift: 12,
    });
  });
  result.negative_signals.forEach((n) => {
    if (n.risk === "Low") return;
    if (!isMeaningful(n.trigger) || !draft.includes(n.trigger!)) return;
    out.push({
      phrase: n.trigger!,
      short_label: isMeaningful(n.fix_label) ? capitalize(n.fix_label!) : `${n.name} risk`,
      signal: n.name,
      severity: "Risk",
      why_it_leaks: n.reason,
      ranker_assumes: `Pattern-matches to ${n.name.toLowerCase()} signal.`,
      fix_strategy: `Soften or rephrase this part to lower ${n.name.toLowerCase()} risk.`,
      suggested_rewrite: n.trigger!,
      impact_lift: n.risk === "High" ? 15 : 8,
    });
  });
  return out;
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const AnnotatedDraft = MarkedUpDraft;
