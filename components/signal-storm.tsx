"use client";

import { useEffect, useState } from "react";
import {
  Ban,
  Check,
  Clipboard,
  Eye,
  Flag,
  Heart,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  MousePointerClick,
  PenLine,
  PlayCircle,
  Quote,
  Repeat2,
  Sparkles,
  Timer,
  UserPlus,
  UserRound,
  VolumeX,
  EyeOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const SIGNALS: {
  id: string;
  label: string;
  kind: "rewarded" | "punished";
  desc: string;
  Icon: LucideIcon;
}[] = [
  { id: "like", label: "Like", kind: "rewarded", desc: "Predicting like rate from text shape.", Icon: Heart },
  { id: "reply", label: "Reply", kind: "rewarded", desc: "Measuring reply-trigger strength.", Icon: MessageCircle },
  { id: "repost", label: "Repost", kind: "rewarded", desc: "Predicting amplification potential.", Icon: Repeat2 },
  { id: "quote", label: "Quote", kind: "rewarded", desc: "Measuring quote-tweet pull.", Icon: Quote },
  { id: "follow", label: "Follow", kind: "rewarded", desc: "Measuring follow conversion intent.", Icon: UserPlus },
  { id: "profile-click", label: "Profile Click", kind: "rewarded", desc: "Predicting profile-pull signal.", Icon: UserRound },
  { id: "click", label: "Link Click", kind: "rewarded", desc: "Predicting click-through intent.", Icon: MousePointerClick },
  { id: "video-view", label: "Video View", kind: "rewarded", desc: "Predicting video view-through.", Icon: PlayCircle },
  { id: "photo-expand", label: "Image View", kind: "rewarded", desc: "Predicting photo-expand rate.", Icon: ImageIcon },
  { id: "dwell", label: "Dwell Time", kind: "rewarded", desc: "Measuring reading dwell quality.", Icon: Timer },
  { id: "not-interested", label: "Expand", kind: "punished", desc: "Checking not-interested risk.", Icon: EyeOff },
  { id: "bookmark", label: "Bookmark", kind: "punished", desc: "Checking block-trigger risk.", Icon: Ban },
  { id: "share", label: "Share", kind: "punished", desc: "Checking mute risk.", Icon: VolumeX },
  { id: "report", label: "Report Risk", kind: "punished", desc: "Checking policy / spam risk.", Icon: Flag },
];

const SIGNAL_DURATION_MS = 2000;

// Skeleton widths for the "awaiting rewrite" placeholder
const SKELETON_WIDTHS = ["32%", "94%", "88%", "78%", "92%", "56%"];

// Phrase-by-phrase highlight delay. A phrase = a sentence (split on . ! ?)
// or a non-empty line. Larger units = no per-word box artifacts.
const PHRASE_STEP_MS = 600;

function DraftText({ text }: { text: string }) {
  // Tokenize into phrases interleaved with whitespace/newlines.
  // Sentences end at . ! ? — newlines also start a new phrase.
  type Token = { kind: "phrase" | "gap"; content: string };
  const tokens: Token[] = [];

  // Walk the text. A phrase ends at . ! ? followed by space/end OR at \n.
  let buf = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\n") {
      if (buf.trim()) tokens.push({ kind: "phrase", content: buf });
      else if (buf) tokens.push({ kind: "gap", content: buf });
      // collapse runs of newlines into one gap
      let nl = "";
      while (i < text.length && text[i] === "\n") {
        nl += text[i];
        i++;
      }
      i--;
      tokens.push({ kind: "gap", content: nl });
      buf = "";
      continue;
    }
    buf += c;
    if (/[.!?]/.test(c)) {
      // peek ahead for whitespace to confirm sentence end
      const next = text[i + 1];
      if (!next || /\s/.test(next)) {
        // include any trailing space in the phrase so the highlight wraps it
        tokens.push({ kind: "phrase", content: buf });
        buf = "";
      }
    }
  }
  if (buf.trim()) tokens.push({ kind: "phrase", content: buf });
  else if (buf) tokens.push({ kind: "gap", content: buf });

  let phraseIndex = 0;
  return (
    <p className="signal-engine-draft-text">
      {tokens.map((t, i) => {
        if (t.kind === "gap") return <span key={i}>{t.content}</span>;
        const delay = phraseIndex * PHRASE_STEP_MS;
        phraseIndex += 1;
        return (
          <span
            key={i}
            className="signal-engine-phrase"
            style={{ animationDelay: `${delay}ms` }}
          >
            {t.content}
          </span>
        );
      })}
    </p>
  );
}

export function SignalStorm({ draftText }: { draftText: string }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((i) => Math.min(i + 1, SIGNALS.length - 1));
    }, SIGNAL_DURATION_MS);
    return () => window.clearInterval(id);
  }, []);

  const display =
    draftText.length > 320
      ? `${draftText.slice(0, 320).trim()}…`
      : draftText || "Your draft";

  const current = SIGNALS[active];
  const graded = Math.min(active + 1, SIGNALS.length);
  const progressPct = (graded / SIGNALS.length) * 100;

  return (
    <section className="signal-engine relative mt-8 overflow-hidden rounded-2xl border border-vermillion/30 bg-ink-900/60">
      {/* HEADER */}
      <header className="relative flex flex-wrap items-center justify-between gap-4 px-5 py-5 md:px-8 md:py-6">
        <div className="min-w-0">
          <h3 className="font-sans text-[22px] font-semibold leading-tight text-paper md:text-[26px]">
            Grading your <span className="serif-italic text-vermillion">draft</span>
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-300">
            <Sparkles size={11} className="text-vermillion-glow" strokeWidth={2.4} />
            14 ranker signals · about 28 seconds
          </p>
        </div>
        <div className="signal-engine-header-bar">
          <div className="signal-engine-header-track">
            <div
              className="signal-engine-header-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="signal-engine-header-meta">
            <span className="signal-engine-header-num">
              {graded}<span className="text-ink-500"> / 14</span>
            </span>
            <span className="signal-engine-header-label">Signals graded</span>
          </div>
        </div>
      </header>

      {/* 3-COLUMN GRID */}
      <div className="relative grid gap-4 px-5 pb-6 md:px-8 md:pb-8 lg:grid-cols-[1fr_1.6fr_1fr]">
        {/* LEFT — Original draft */}
        <article className="signal-engine-panel">
          <div className="signal-engine-kicker">
            <Clipboard size={11} strokeWidth={2.2} />
            Original draft
          </div>
          <div className="signal-engine-draft-box">
            <DraftText text={display} />
            <span className="signal-engine-char-count">
              {Math.min(draftText.length, 320)} characters
            </span>
          </div>
        </article>

        {/* CENTER — Signal Processing Engine */}
        <ProcessingEngine
          current={current}
          activeIndex={active}
          graded={graded}
          progressPct={progressPct}
        />

        {/* RIGHT — Awaiting rewrite */}
        <article className="signal-engine-rewrite-panel">
          <div className="signal-engine-kicker">
            <PenLine size={11} strokeWidth={2.2} />
            Awaiting rewrite
          </div>
          <div className="signal-engine-skeleton">
            {SKELETON_WIDTHS.map((width, i) => (
              <span
                key={i}
                className="signal-engine-skeleton-line"
                style={{
                  width,
                  marginLeft:
                    i === SKELETON_WIDTHS.length - 1 ? "auto" : undefined,
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </div>
          <div className="signal-engine-rewrite-foot">
            <Lock size={11} strokeWidth={2.4} className="text-ink-400" />
            <span>Will appear when grading completes</span>
          </div>
        </article>
      </div>
    </section>
  );
}

function ProcessingEngine({
  current,
  activeIndex,
  graded,
  progressPct,
}: {
  current: typeof SIGNALS[number];
  activeIndex: number;
  graded: number;
  progressPct: number;
}) {
  const ActiveIcon = current.Icon;
  return (
    <div className="signal-engine-stage">
      {/* Header */}
      <div className="signal-engine-stage-head">
        <div className="signal-engine-stage-eyebrow">
          <Sparkles size={11} strokeWidth={2.4} />
          Signal Processing Engine
        </div>
        <div className="signal-engine-stage-sub">
          Analyzing 14 ranker signals step by step
        </div>
      </div>

      {/* 14-step indicator */}
      <div className="signal-engine-steps">
        {SIGNALS.map((_, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <div
              key={i}
              className={`signal-engine-step ${
                isDone ? "is-done" : ""
              } ${isActive ? "is-active" : ""}`}
            >
              {isDone ? (
                <Check size={11} strokeWidth={3} />
              ) : (
                <span className="signal-engine-step-num">{i + 1}</span>
              )}
              {isActive && (
                <span className="signal-engine-step-arrow" aria-hidden />
              )}
            </div>
          );
        })}
        {/* connector track behind the numbers */}
        <div className="signal-engine-steps-track" aria-hidden />
        <div
          className="signal-engine-steps-fill"
          aria-hidden
          style={{
            width: `${(activeIndex / (SIGNALS.length - 1)) * 100}%`,
          }}
        />
      </div>

      {/* 14 signal chips */}
      <div className="signal-engine-chips">
        {SIGNALS.map((signal, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          const ChipIcon = signal.Icon;
          return (
            <div
              key={signal.id}
              className={`signal-engine-chip ${
                isDone ? "is-done" : ""
              } ${isActive ? "is-active" : ""}`}
            >
              <ChipIcon size={11} strokeWidth={2.2} />
              {signal.label}
            </div>
          );
        })}
      </div>

      {/* Active signal detail card */}
      <div className="signal-engine-active-card" key={current.id}>
        <div className="signal-engine-active-icon">
          <ActiveIcon size={22} strokeWidth={2.2} />
        </div>
        <div className="signal-engine-active-body">
          <div className="signal-engine-active-head">
            <span className="signal-engine-active-name">
              {current.label.toUpperCase()}
            </span>
            <span
              className={`signal-engine-active-pill signal-engine-active-pill-${current.kind}`}
            >
              {current.kind === "rewarded" ? "Rewarded" : "Punished"}
            </span>
          </div>
          <div className="signal-engine-active-desc">{current.desc}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="signal-engine-progress">
        <div className="signal-engine-progress-meta">
          <span className="signal-engine-progress-num">
            Signal {graded} of 14 · grading against the open repo
          </span>
          <span className="signal-engine-progress-pct">
            {Math.round(progressPct)}%
          </span>
        </div>
        <div className="signal-engine-progress-bar">
          <div
            className="signal-engine-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
