"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

/** Signal label/kind/icon. `descKey` maps to messages.signal_storm.<key>
 *  for the per-signal description line in the active-card. Labels stay
 *  English by design (they match X's own product labels and are part of
 *  the brand glossary). */
const SIGNALS: {
  id: string;
  label: string;
  kind: "rewarded" | "punished";
  descKey: string;
  Icon: LucideIcon;
}[] = [
  { id: "like", label: "Like", kind: "rewarded", descKey: "desc_like", Icon: Heart },
  { id: "reply", label: "Reply", kind: "rewarded", descKey: "desc_reply", Icon: MessageCircle },
  { id: "repost", label: "Repost", kind: "rewarded", descKey: "desc_repost", Icon: Repeat2 },
  { id: "quote", label: "Quote", kind: "rewarded", descKey: "desc_quote", Icon: Quote },
  { id: "follow", label: "Follow", kind: "rewarded", descKey: "desc_follow", Icon: UserPlus },
  { id: "profile-click", label: "Profile Click", kind: "rewarded", descKey: "desc_profile_click", Icon: UserRound },
  { id: "click", label: "Link Click", kind: "rewarded", descKey: "desc_click", Icon: MousePointerClick },
  { id: "video-view", label: "Video View", kind: "rewarded", descKey: "desc_video_view", Icon: PlayCircle },
  { id: "photo-expand", label: "Image View", kind: "rewarded", descKey: "desc_photo_expand", Icon: ImageIcon },
  { id: "dwell", label: "Dwell Time", kind: "rewarded", descKey: "desc_dwell", Icon: Timer },
  { id: "not-interested", label: "Expand", kind: "punished", descKey: "desc_not_interested", Icon: EyeOff },
  { id: "bookmark", label: "Bookmark", kind: "punished", descKey: "desc_bookmark", Icon: Ban },
  { id: "share", label: "Share", kind: "punished", descKey: "desc_share", Icon: VolumeX },
  { id: "report", label: "Report Risk", kind: "punished", descKey: "desc_report", Icon: Flag },
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
  const t = useTranslations("signal_storm");
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
      : draftText || t("draft_fallback");

  const current = SIGNALS[active];
  const graded = Math.min(active + 1, SIGNALS.length);
  const progressPct = (graded / SIGNALS.length) * 100;

  return (
    <section className="signal-engine relative mt-8 overflow-hidden rounded-2xl border border-vermillion/30 bg-ink-900/60">
      {/* HEADER */}
      <header className="relative flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:gap-4 md:px-8 md:py-6">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 lg:block lg:flex-initial">
          <div className="min-w-0">
            <h3 className="font-sans text-[19px] font-semibold leading-tight text-paper md:text-[26px]">
              {t.rich("title", {
                emph: (chunks) => (
                  <span className="serif-italic text-vermillion">{chunks}</span>
                ),
              })}
            </h3>
            <p className="mt-1 hidden items-center gap-1.5 text-[12.5px] text-ink-300 lg:flex">
              <Sparkles size={11} className="text-vermillion-glow" strokeWidth={2.4} />
              {t("subtitle")}
            </p>
          </div>
          <span className="signal-engine-mobile-count lg:hidden">
            {graded}<span className="text-ink-500">/14</span>
          </span>
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
            <span className="signal-engine-header-label">{t("signals_graded_label")}</span>
          </div>
        </div>
      </header>

      {/* 3-COLUMN GRID */}
      <div className="relative grid gap-4 px-5 pb-6 md:px-8 md:pb-8 lg:grid-cols-[1fr_1.6fr_1fr]">
        {/* LEFT — Original draft */}
        <article className="signal-engine-panel">
          <div className="signal-engine-kicker">
            <Clipboard size={11} strokeWidth={2.2} />
            {t("kicker_original_draft")}
          </div>
          <div className="signal-engine-draft-box">
            <DraftText text={display} />
            <span className="signal-engine-char-count">
              {t("char_count", { count: Math.min(draftText.length, 320) })}
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
            {t("kicker_awaiting_rewrite")}
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
            <span>{t("skeleton_foot")}</span>
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
  const t = useTranslations("signal_storm");
  const ActiveIcon = current.Icon;
  return (
    <div className="signal-engine-stage">
      {/* Header */}
      <div className="signal-engine-stage-head">
        <div className="signal-engine-stage-eyebrow">
          <Sparkles size={11} strokeWidth={2.4} />
          {t("stage_eyebrow")}
        </div>
        <div className="signal-engine-stage-sub">
          {t("stage_sub")}
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
              {current.kind === "rewarded" ? t("pill_rewarded") : t("pill_punished")}
            </span>
          </div>
          <div className="signal-engine-active-desc">{t(current.descKey)}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="signal-engine-progress">
        <div className="signal-engine-progress-meta">
          <span className="signal-engine-progress-num">
            {t("progress_label", { graded })}
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
