"use client";

import { useMemo } from "react";
import type { RewriteHighlight } from "@/lib/types";

interface Props {
  text: string;
  highlights: RewriteHighlight[];
  /** Base delay in seconds before the first highlight starts revealing. */
  baseDelay?: number;
  /**
   * Optional map ref to register each highlight span by signal-ish key for
   * external positioning (e.g., bridge-arrow targeting). Keyed by phrase.
   */
  phraseRefs?: React.MutableRefObject<Map<string, HTMLElement | null>>;
  /** Color tone for the highlight. Defaults to vermillion. */
  tone?: "vermillion" | "moss" | "rust";
}

type Segment =
  | { type: "text"; text: string }
  | { type: "highlight"; text: string; label: string; index: number };

/**
 * Renders rewrite text with vermillion BG highlights over each highlight phrase
 * + a small inline label pill explaining what the phrase does. Highlights + labels
 * stagger-reveal on mount.
 */
export function HighlightedRewrite({
  text,
  highlights,
  baseDelay = 0,
  phraseRefs,
  tone = "vermillion",
}: Props) {
  const segments = useMemo(() => buildSegments(text, highlights), [text, highlights]);

  return (
    <p className="whitespace-pre-line text-[14px] leading-[1.85] text-paper">
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.text}</span>;
        const tintDelay = (baseDelay + seg.index * 0.4).toFixed(2);
        const labelDelay = (baseDelay + seg.index * 0.4 + 0.45).toFixed(2);
        return (
          <HighlightSpan
            key={i}
            text={seg.text}
            label={seg.label}
            tintDelay={tintDelay}
            labelDelay={labelDelay}
            tone={tone}
            registerRef={(el) => {
              if (phraseRefs) phraseRefs.current.set(seg.text, el);
            }}
          />
        );
      })}
    </p>
  );
}

function HighlightSpan({
  text,
  label,
  tintDelay,
  labelDelay,
  tone,
  registerRef,
}: {
  text: string;
  label: string;
  tintDelay: string;
  labelDelay: string;
  tone: "vermillion" | "moss" | "rust";
  registerRef: (el: HTMLElement | null) => void;
}) {
  const toneClasses =
    tone === "moss"
      ? {
          bg: "rgba(93, 143, 77, 0.16)",
          activeBg: "rgba(93, 143, 77, 0.28)",
          pill: "border-moss/45 bg-moss/12 text-moss",
        }
      : tone === "rust"
      ? {
          bg: "rgba(168, 58, 35, 0.16)",
          activeBg: "rgba(168, 58, 35, 0.28)",
          pill: "border-rust/45 bg-rust/12 text-rust",
        }
      : {
          bg: "rgba(255, 110, 35, 0.16)",
          activeBg: "rgba(255, 110, 35, 0.28)",
          pill: "border-vermillion/45 bg-vermillion/12 text-vermillion-glow",
        };

  return (
    <>
      <span
        ref={registerRef as any}
        className="phrase-tint rounded-[4px]"
        style={
          {
            "--tint-bg": toneClasses.bg,
            "--tint-active-bg": toneClasses.activeBg,
            animationDelay: `${tintDelay}s`,
            padding: "0.1em 0.35em",
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
          } as React.CSSProperties
        }
      >
        {text}
      </span>
      <span
        className={`rw-label ml-1.5 inline-flex items-baseline gap-0.5 rounded-full border px-1.5 py-[1px] align-baseline font-mono text-[9px] uppercase tracking-[0.12em] ${toneClasses.pill}`}
        style={{ animationDelay: `${labelDelay}s` }}
      >
        <span className="text-[7px] leading-none">↑</span>
        {label}
      </span>
    </>
  );
}

function buildSegments(text: string, highlights: RewriteHighlight[]): Segment[] {
  type Span = { start: number; end: number; label: string; index: number };
  const spans: Span[] = [];

  highlights.forEach((h) => {
    const phrase = h.phrase;
    if (!phrase || phrase.length < 2) return;
    const idx = text.indexOf(phrase);
    if (idx === -1) return;
    spans.push({ start: idx, end: idx + phrase.length, label: h.label, index: 0 });
  });

  spans.sort((a, b) => a.start - b.start);
  const merged: Span[] = [];
  spans.forEach((s) => {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) return;
    merged.push(s);
  });
  merged.forEach((s, i) => (s.index = i));

  const segments: Segment[] = [];
  let cursor = 0;
  merged.forEach((s) => {
    if (s.start > cursor) segments.push({ type: "text", text: text.slice(cursor, s.start) });
    segments.push({
      type: "highlight",
      text: text.slice(s.start, s.end),
      label: s.label,
      index: s.index,
    });
    cursor = s.end;
  });
  if (cursor < text.length) segments.push({ type: "text", text: text.slice(cursor) });

  return segments;
}
