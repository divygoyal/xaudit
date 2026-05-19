"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ScanLine,
  Heart,
  MessageCircle,
  Repeat2,
  Image as ImageIcon,
  EyeOff,
  ShieldCheck,
  Check,
  Crosshair,
  Film,
  type LucideIcon,
} from "lucide-react";
import type { AnalysisResult, Grade } from "@/lib/types";

const MIN_DURATION_MS = 4500;

const STATUS_LINES = [
  { at: 0, text: "Reading the draft…" },
  { at: 900, text: "Tokenizing engagement signals…" },
  { at: 1900, text: "Scoring positive actions…" },
  { at: 2900, text: "Sweeping for negative signals…" },
  { at: 3700, text: "Cross-referencing the safety pipeline…" },
  { at: 4400, text: "Composing the verdict…" },
];

interface Props {
  draftText: string;
  hasImage: boolean;
  startedAt: number;
  result: AnalysisResult | null;
  onSettled: () => void;
}

export function AnalysisCockpit({ draftText, hasImage, startedAt, result, onSettled }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<"running" | "settling" | "exiting">("running");
  const [statusIdx, setStatusIdx] = useState(0);

  // tick elapsed
  useEffect(() => {
    const i = setInterval(() => {
      const t = Date.now() - startedAt;
      setElapsed(t);
      // advance status line
      let idx = 0;
      for (let k = 0; k < STATUS_LINES.length; k++) {
        if (t >= STATUS_LINES[k].at) idx = k;
      }
      setStatusIdx(idx);
    }, 100);
    return () => clearInterval(i);
  }, [startedAt]);

  // when result arrives, schedule settling + exit
  useEffect(() => {
    if (!result) return;
    const now = Date.now();
    const elapsedNow = now - startedAt;
    const remaining = Math.max(0, MIN_DURATION_MS - elapsedNow);

    const t1 = setTimeout(() => setPhase("settling"), remaining);
    const t2 = setTimeout(() => setPhase("exiting"), remaining + 950);
    const t3 = setTimeout(() => onSettled(), remaining + 1450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [result, startedAt, onSettled]);

  const progressPct = useMemo(() => {
    const cap = result ? MIN_DURATION_MS : 8500;
    return Math.min(100, Math.round((elapsed / cap) * 100));
  }, [elapsed, result]);

  const previewText = draftText.trim() || "(screenshot draft attached)";

  const find = (list: AnalysisResult["positive_signals"] | undefined, name: string) =>
    list?.find((x) => x.name === name);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/40 shadow-[0_20px_60px_-30px_rgba(75,40,15,0.25)] ${
        phase === "exiting" ? "cockpit-exit" : "cockpit-enter"
      }`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-ink-700/60 bg-ink-900/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full bg-vermillion ${
                phase === "running" ? "animate-ping opacity-70" : "opacity-0"
              }`}
            />
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                phase === "running" ? "bg-vermillion" : "bg-moss"
              }`}
            />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper">
            {phase === "running" ? "Analyzing" : phase === "settling" ? "Verdict ready" : "Done"}
          </span>
          <span className="text-ink-600">·</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">
            13 signals
          </span>
        </div>
        <div className="font-mono text-[10.5px] text-ink-300 tabular-nums">
          {formatTime(elapsed)}
        </div>
      </div>

      {/* DRAFT SCAN — compact */}
      <div className="border-b border-ink-700/60 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-400">
            <ScanLine size={11} className="text-vermillion" />
            <span>Text scan</span>
          </div>
          <div className="font-mono text-[9.5px] text-ink-400">
            {hasImage ? "TXT + IMG" : "TXT"}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-md border border-ink-700 bg-ink-950 px-3 py-2.5">
          {phase === "running" && (
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[28%] scan-sweep">
              <div className="h-full w-full bg-gradient-to-r from-transparent via-vermillion/35 to-transparent" />
            </div>
          )}
          <p className="relative z-0 line-clamp-2 text-[12.5px] leading-relaxed text-paper">
            {previewText}
          </p>
          <div className="mt-2 h-[2.5px] w-full overflow-hidden rounded-full bg-ink-800">
            <div
              className="progress-fill h-full rounded-full bg-vermillion"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* PANELS GRID — 3 cols × 2 rows */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        <HookPanel phase={phase} signal={find(result?.positive_signals, "Like")} />
        <ReplyPanel phase={phase} signal={find(result?.positive_signals, "Reply")} />
        <RepostPanel phase={phase} signal={find(result?.positive_signals, "Repost")} />
        <MediaPanel phase={phase} hasImage={hasImage} />
        <NegativePanel
          phase={phase}
          risk={result?.negative_signals?.find((s) => s.name === "Not interested")?.risk}
        />
        <SafetyPanel phase={phase} />
      </div>

      {/* FOOTER */}
      <div className="flex items-center gap-2.5 border-t border-ink-700/60 bg-ink-900/40 px-4 py-2.5">
        <div className="flex h-1.5 w-1.5 flex-none animate-pulse rounded-full bg-vermillion-glow" />
        <div key={statusIdx} className="status-line-enter font-mono text-[11px] text-ink-200">
          {phase === "settling" || phase === "exiting"
            ? "✓ Verdict composed. Locking signals."
            : STATUS_LINES[statusIdx].text}
        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number) {
  const sec = ms / 1000;
  return `${sec.toFixed(1)}s`;
}

// ─────────────────────────────────────────────────────────────
// Individual panel components
// ─────────────────────────────────────────────────────────────

type PanelPhase = "running" | "settling" | "exiting";

function PanelShell({
  Icon,
  label,
  phase,
  status,
  gradeBadge,
  children,
}: {
  Icon: LucideIcon;
  label: string;
  phase: PanelPhase;
  status: string;
  gradeBadge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const settled = phase !== "running";
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg border border-ink-700 bg-ink-950 p-2.5 transition-shadow ${
        settled ? "shadow-[0_0_0_1px_rgba(214,58,0,0.15)_inset]" : ""
      } ${settled ? "settle-bounce" : ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-ink-400">
          <Icon size={9} />
          {label}
        </div>
        {gradeBadge}
      </div>

      <div className="flex h-8 items-center justify-center">{children}</div>

      <div className="font-mono text-[9.5px] leading-tight text-ink-300">{status}</div>
    </div>
  );
}

function HookPanel({ phase, signal }: { phase: PanelPhase; signal?: { grade: Grade; reason: string } }) {
  const settled = phase !== "running";
  const heights: Record<Grade, number[]> = {
    Strong: [70, 95, 60, 85, 50],
    Moderate: [50, 65, 45, 60, 40],
    Weak: [25, 35, 20, 30, 25],
  };
  const finalHeights = signal ? heights[signal.grade] : [50, 70, 45, 60, 35];

  return (
    <PanelShell
      Icon={Heart}
      label="Hook / Like"
      phase={phase}
      status={settled && signal ? `Hook: ${signal.grade}` : "Scoring hook…"}
      gradeBadge={settled && signal ? <Pill grade={signal.grade} /> : null}
    >
      <div className="flex h-full items-end gap-1">
        {[1, 2, 3, 4, 5].map((i, idx) => (
          <span
            key={i}
            className={`w-1 rounded-sm bg-vermillion ${settled ? "" : `eq-bar eq-bar-${i}`}`}
            style={settled ? { height: `${finalHeights[idx]}%` } : { height: "100%" }}
          />
        ))}
      </div>
    </PanelShell>
  );
}

function ReplyPanel({ phase, signal }: { phase: PanelPhase; signal?: { grade: Grade; reason: string } }) {
  const settled = phase !== "running";
  return (
    <PanelShell
      Icon={MessageCircle}
      label="Reply pot."
      phase={phase}
      status={settled && signal ? `Reply: ${signal.grade}` : "Reply bait…"}
      gradeBadge={settled && signal ? <Pill grade={signal.grade} /> : null}
    >
      {settled ? (
        <div className="flex items-center justify-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-vermillion" />
          <span className="h-1.5 w-1.5 rounded-full bg-vermillion-glow" />
          <span className="h-1.5 w-1.5 rounded-full bg-vermillion-deep" />
        </div>
      ) : (
        <div className="flex items-end gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-vermillion typing-dot-1" />
          <span className="h-1.5 w-1.5 rounded-full bg-vermillion typing-dot-2" />
          <span className="h-1.5 w-1.5 rounded-full bg-vermillion typing-dot-3" />
        </div>
      )}
    </PanelShell>
  );
}

function RepostPanel({ phase, signal }: { phase: PanelPhase; signal?: { grade: Grade; reason: string } }) {
  const settled = phase !== "running";
  return (
    <PanelShell
      Icon={Repeat2}
      label="Repost pot."
      phase={phase}
      status={settled && signal ? `Repost: ${signal.grade}` : "Share intent…"}
      gradeBadge={settled && signal ? <Pill grade={signal.grade} /> : null}
    >
      <div className="relative h-6 w-6">
        <span
          className={`absolute inset-0 rounded-full border border-vermillion/50 ${
            settled ? "" : "orbit-spin"
          }`}
        />
        <span
          className={`absolute inset-[3px] rounded-full border border-dashed border-vermillion/30 ${
            settled ? "" : "orbit-spin"
          }`}
          style={settled ? {} : { animationDirection: "reverse", animationDuration: "3s" }}
        />
        <span className="absolute inset-[7px] rounded-full bg-vermillion" />
      </div>
    </PanelShell>
  );
}

function MediaPanel({ phase, hasImage }: { phase: PanelPhase; hasImage: boolean }) {
  const settled = phase !== "running";
  const items = [
    { label: "I", on: hasImage },
    { label: "V", on: false },
    { label: "T", on: false },
  ];
  return (
    <PanelShell
      Icon={Film}
      label="Media"
      phase={phase}
      status={
        settled ? `${items.filter((i) => i.on).length}/3 attached` : "Inspecting…"
      }
    >
      <div className="flex items-center gap-1.5">
        {items.map((it, idx) => (
          <span
            key={it.label}
            className={`flex h-5 w-5 items-center justify-center rounded border font-mono text-[9px] uppercase ${
              settled
                ? it.on
                  ? "border-moss/50 bg-moss/10 text-moss"
                  : "border-ink-700 bg-ink-900 text-ink-500"
                : "border-ink-700 bg-ink-900 text-ink-400"
            }`}
            style={settled ? { animationDelay: `${idx * 0.08}s` } : {}}
          >
            {settled ? (
              it.on ? (
                <Check size={9} strokeWidth={3} className="tick-pop" />
              ) : (
                <span>{it.label}</span>
              )
            ) : (
              <span className="h-1 w-1 animate-pulse rounded-full bg-ink-500" />
            )}
          </span>
        ))}
      </div>
    </PanelShell>
  );
}

function NegativePanel({ phase, risk }: { phase: PanelPhase; risk?: "Low" | "Moderate" | "High" }) {
  const settled = phase !== "running";
  const tone =
    risk === "High" ? "text-rust" : risk === "Moderate" ? "text-vermillion-glow" : "text-moss";
  return (
    <PanelShell
      Icon={EyeOff}
      label="Risk scan"
      phase={phase}
      status={settled && risk ? `Risk: ${risk}` : "Risk sweep…"}
      gradeBadge={
        settled && risk ? (
          <span className={`font-mono text-[8.5px] uppercase tracking-wider ${tone}`}>
            ● {risk}
          </span>
        ) : null
      }
    >
      <div className="relative h-7 w-7">
        <span
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${
            settled ? "" : "viewfinder-trace"
          }`}
        >
          <Crosshair
            size={15}
            strokeWidth={1.4}
            className={settled ? tone : "text-vermillion"}
          />
        </span>
      </div>
    </PanelShell>
  );
}

function SafetyPanel({ phase }: { phase: PanelPhase }) {
  const settled = phase !== "running";
  return (
    <PanelShell
      Icon={ShieldCheck}
      label="Safety"
      phase={phase}
      status={settled ? "Passes Grox" : "Checking…"}
      gradeBadge={
        settled ? (
          <span className="font-mono text-[8.5px] uppercase tracking-wider text-moss">
            ● Pass
          </span>
        ) : null
      }
    >
      <div className="relative h-7 w-7">
        <span className="absolute inset-0 rounded-full border border-vermillion/30" />
        <span className="absolute inset-1 rounded-full border border-vermillion/40" />
        {!settled && (
          <>
            <span className="absolute inset-0 rounded-full border border-vermillion radar-pulse" />
            <span
              className="absolute inset-0 radar-rotate"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(214,58,0,0) 0deg, rgba(214,58,0,0.45) 30deg, rgba(214,58,0,0) 60deg)",
                borderRadius: "9999px",
                maskImage: "radial-gradient(circle, black 0%, black 70%, transparent 72%)",
                WebkitMaskImage: "radial-gradient(circle, black 0%, black 70%, transparent 72%)",
              }}
            />
          </>
        )}
        {settled && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Check size={11} strokeWidth={3} className="tick-pop text-moss" />
          </span>
        )}
      </div>
    </PanelShell>
  );
}

function Pill({ grade }: { grade: Grade }) {
  const styles: Record<Grade, string> = {
    Weak: "border-rust/40 bg-rust/10 text-rust",
    Moderate: "border-vermillion/30 bg-vermillion/10 text-vermillion-glow",
    Strong: "border-moss/40 bg-moss/10 text-moss",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0 font-mono text-[8.5px] uppercase tracking-wider ${styles[grade]}`}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {grade}
    </span>
  );
}
