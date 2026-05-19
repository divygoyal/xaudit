"use client";

import { useMemo, useState } from "react";
import type { NegativeSignal, PositiveSignal } from "@/lib/types";

interface Props {
  text: string;
  positives: PositiveSignal[];
  negatives: NegativeSignal[];
}

type Span = { start: number; end: number; tone: "pos" | "neg"; signalName: string };

export function HighlightedDraft({ text, positives, negatives }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const segments = useMemo(() => buildSegments(text, positives, negatives), [text, positives, negatives]);
  const highlightCount = segments.filter((s) => s.span).length;

  if (!text.trim()) return null;

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900/30 px-5 py-5 md:px-6 md:py-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-400">
          Your draft
        </div>
        {highlightCount > 0 && (
          <div className="font-mono text-[10.5px] text-ink-300">
            <span className="text-paper">{highlightCount}</span> phrases tagged
          </div>
        )}
      </div>

      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-paper">
        {segments.map((seg, i) => {
          if (!seg.span) return <span key={i}>{seg.text}</span>;
          const tone = seg.span.tone;
          const isHovered = hovered === `${i}`;
          return (
            <span
              key={i}
              onMouseEnter={() => setHovered(`${i}`)}
              onMouseLeave={() => setHovered(null)}
              className={`relative inline cursor-help rounded-[3px] px-0.5 transition-colors ${
                tone === "pos"
                  ? "bg-moss/15 text-paper underline decoration-moss decoration-[1.5px] underline-offset-[3px]"
                  : "bg-vermillion/15 text-paper underline decoration-vermillion decoration-[1.5px] underline-offset-[3px]"
              }`}
            >
              {seg.text}
              {isHovered && (
                <span
                  className={`pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
                    tone === "pos"
                      ? "border-moss/40 bg-ink-950 text-moss"
                      : "border-vermillion/40 bg-ink-950 text-vermillion-glow"
                  }`}
                >
                  {seg.span.signalName}
                </span>
              )}
            </span>
          );
        })}
      </p>

      {/* legend */}
      {highlightCount > 0 && (
        <div className="mt-4 flex items-center gap-4 text-[11.5px] text-ink-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-3 bg-moss" />
            <span>strengths</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-3 bg-vermillion" />
            <span>weaknesses / risks</span>
          </span>
        </div>
      )}
    </div>
  );
}

function buildSegments(
  text: string,
  positives: PositiveSignal[],
  negatives: NegativeSignal[]
): { text: string; span?: Span }[] {
  // collect triggers w/ tone + signal name
  type Trigger = { phrase: string; tone: "pos" | "neg"; name: string };
  const triggers: Trigger[] = [];

  positives.forEach((p) => {
    if (p.trigger && p.trigger.trim().length > 1 && p.grade === "Strong") {
      triggers.push({ phrase: p.trigger, tone: "pos", name: `${p.name} · Strong` });
    }
  });
  negatives.forEach((n) => {
    if (n.trigger && n.trigger.trim().length > 1 && n.risk !== "Low") {
      triggers.push({ phrase: n.trigger, tone: "neg", name: `${n.name} · ${n.risk} risk` });
    }
  });
  // also include weak positives as "weakness" highlights (to show where signal is missing)
  positives.forEach((p) => {
    if (p.trigger && p.trigger.trim().length > 1 && p.grade === "Weak") {
      triggers.push({ phrase: p.trigger, tone: "neg", name: `${p.name} · Weak` });
    }
  });

  // find ranges
  const spans: Span[] = [];
  triggers.forEach((t) => {
    const idx = text.indexOf(t.phrase);
    if (idx === -1) return;
    spans.push({
      start: idx,
      end: idx + t.phrase.length,
      tone: t.tone,
      signalName: t.name,
    });
  });

  // sort by start, then end
  spans.sort((a, b) => a.start - b.start || a.end - b.end);

  // dedupe + collapse overlaps — keep the FIRST encountered for each range
  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) {
      // overlapping — skip (keep the earlier one)
      continue;
    }
    merged.push(s);
  }

  // build segments
  const segments: { text: string; span?: Span }[] = [];
  let cursor = 0;
  for (const s of merged) {
    if (s.start > cursor) segments.push({ text: text.slice(cursor, s.start) });
    segments.push({ text: text.slice(s.start, s.end), span: s });
    cursor = s.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}
