import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  MinusCircle,
  ShieldCheck,
  Target,
  ThumbsUp,
  X,
  Zap,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SectionEyebrow } from "./signals-strip";

const FOLKLORE_CLAIM_KEYS = [
  "post_time",
  "hashtags",
  "link_comment",
  "end_question",
] as const;

const REPO_POSITIVE: string[] = [
  "like",
  "reply",
  "repost",
  "quote_tweet",
  "click",
  "profile_click",
  "photo_expand",
  "video_view",
  "dwell",
  "follow",
];

const REPO_NEGATIVE: string[] = ["not_interested", "block", "mute", "report"];

const VERIFICATION_TRAIL_KEYS = [
  { step: 1, key: "trail_step1" },
  { step: 2, key: "trail_step2" },
  { step: 3, key: "trail_step3" },
] as const;

export async function VsFolklore() {
  const t = await getTranslations("vs_folklore");
  return (
    <section id="folklore" className="relative overflow-hidden border-t border-ink-700/60">
      {/* Top-centered vermillion wash, anchors the eyeline */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[1080px] -translate-x-1/2 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(214,58,0,0.10) 0%, rgba(214,58,0,0.04) 35%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        {/* ─────────── HEADER ─────────── */}
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow>{t("eyebrow")}</SectionEyebrow>
          <h2 className="mt-4 font-sans text-[2.45rem] font-medium leading-[1.04] tracking-tight text-paper md:text-[3.4rem]">
            {t.rich("heading", {
              emph: (chunks) => (
                <span className="relative inline-block">
                  <span className="serif-italic">{chunks}</span>
                  <HandUnderline />
                </span>
              ),
            })}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-balance text-[15px] leading-relaxed text-ink-300">
            {t.rich("intro", {
              strong: (chunks) => (
                <span className="font-medium text-vermillion-glow">{chunks}</span>
              ),
            })}
          </p>
        </div>

        {/* ─────────── 3-COLUMN COMPARISON ─────────── */}
        <div className="mx-auto mt-14 grid max-w-[1280px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_200px_minmax(0,1.1fr)] lg:gap-0 lg:items-stretch">
          <FolklorePanel />
          <CenterFlow />
          <RepoPanel />
        </div>

        {/* ─────────── BOTTOM TAGLINE PILL ─────────── */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-vermillion/25 bg-ink-900/50 px-5 py-2.5 shadow-[0_18px_44px_-28px_rgba(214,58,0,0.4)] backdrop-blur-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-vermillion/15">
              <Zap size={11} strokeWidth={2.4} className="text-vermillion-glow" />
            </span>
            <span className="font-sans text-[13.5px] text-ink-200">
              {t("tagline_lead")}
            </span>
            <span className="serif-italic text-[15px] text-vermillion-glow">
              {t("tagline_emphasis")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// HAND-DRAWN UNDERLINE under "guess"
// ─────────────────────────────────────────────────────────────

function HandUnderline() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute -bottom-[6px] left-[-2%] h-[10px] w-[104%]"
      viewBox="0 0 200 10"
      preserveAspectRatio="none"
    >
      <path
        d="M 4 6 C 50 3, 100 8, 196 4"
        stroke="rgb(var(--vermillion))"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// LEFT · FOLKLORE — 4 paper-slip cards with hand-drawn underlines
// ─────────────────────────────────────────────────────────────

async function FolklorePanel() {
  const t = await getTranslations("vs_folklore");
  const rotations = [-1.8, 1.9, -1.35, 1.2];
  const offsets = [8, -8, 10, -3];
  const widths = ["92%", "88%", "95%", "91%"];

  return (
    <div className="relative flex h-full flex-col py-2 lg:py-4 lg:pr-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-2 left-2 right-6 top-[9.5rem] opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(var(--vermillion) / 0.12) 1px, transparent 0)",
          backgroundSize: "8px 8px",
          maskImage: "linear-gradient(to bottom, transparent, black 16%, black 84%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, black 16%, black 84%, transparent)",
        }}
      />

      <div className="relative flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-vermillion-glow">
        <span aria-hidden className="h-px w-9 bg-vermillion-glow/70" />
        {t("folklore_label")}
      </div>

      <h3 className="relative mt-7 max-w-[34rem] font-serif text-[3.15rem] font-normal leading-[0.98] tracking-normal text-paper md:text-[4rem] lg:text-[3.7rem]">
        {t.rich("folklore_heading", {
          br: () => <br />,
          emph: (chunks) => (
            <span className="serif-italic text-[1.1em] text-vermillion">{chunks}</span>
          ),
        })}
      </h3>

      <ul className="relative mt-10 flex flex-1 flex-col gap-6 md:mt-11 md:gap-7">
        {FOLKLORE_CLAIM_KEYS.map((key, i) => (
          <li
            key={key}
            className="relative border border-vermillion/24 px-6 py-5 shadow-[0_20px_36px_-24px_rgba(214,58,0,0.58),0_4px_16px_-10px_rgba(214,58,0,0.36),inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-[1px]"
            style={{
              width: widths[i % widths.length],
              transform: `translateX(${offsets[i % offsets.length]}px) rotate(${
                rotations[i % rotations.length]
              }deg)`,
              borderRadius: "8px",
              background:
                "linear-gradient(180deg, rgb(var(--ink-950) / 0.97), rgb(var(--ink-900) / 0.42)), radial-gradient(circle at 88% 20%, rgb(var(--vermillion) / 0.09), transparent 38%)",
            }}
          >
            <div className="flex items-center gap-4">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-vermillion/55 bg-ink-950 text-vermillion shadow-[0_5px_12px_-9px_rgba(214,58,0,0.8)]">
                <X size={10} strokeWidth={2.7} />
              </span>
              <div className="relative min-w-0 flex-1 py-1.5">
                <span className="block font-serif text-[1.22rem] italic leading-[1.16] tracking-normal text-paper md:text-[1.43rem]">
                  {t(`folklore_claims.${key}`)}
                </span>
                <UnderlineMark index={i} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UnderlineMark({ index }: { index: number }) {
  const paths = [
    "M 5 8 C 60 9, 126 2, 196 6",
    "M 4 7 C 68 10, 128 6, 196 5",
    "M 5 5 C 58 10, 135 3, 196 7",
    "M 4 8 C 78 5, 126 8, 196 4",
  ];
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-0 top-[62%] h-[13px] w-full -translate-y-1/2"
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
    >
      <path
        d={paths[index % paths.length]}
        stroke="rgb(var(--vermillion))"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
        opacity="0.96"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// CENTER · FLOW PILLAR
// ─────────────────────────────────────────────────────────────

async function CenterFlow() {
  const t = await getTranslations("vs_folklore");
  return (
    <div className="relative hidden flex-col items-center justify-between py-6 lg:flex">
      {/* dotted vertical line — vermillion top, fades to moss bottom */}
      <div
        aria-hidden
        className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgb(var(--vermillion) / 0.55) 0 4px, transparent 4px 9px)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 6%, black 50%, transparent 52%, transparent 58%, black 64%, black 94%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 6%, black 50%, transparent 52%, transparent 58%, black 64%, black 94%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgb(var(--moss) / 0.45) 0 4px, transparent 4px 9px)",
          maskImage:
            "linear-gradient(to bottom, transparent 60%, black 64%, black 96%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 60%, black 64%, black 96%, transparent 100%)",
        }}
      />

      {/* 13 signals scanned */}
      <FlowPill icon={<Activity size={11} className="text-vermillion-glow" strokeWidth={2.4} />}>
        <span className="font-sans text-[12.5px] text-paper">{t("center_signals_scanned")}</span>
      </FlowPill>

      {/* 0 folklore matches */}
      <div className="relative z-10 inline-flex items-center gap-2.5 rounded-2xl border border-ink-700 bg-ink-950/80 px-3.5 py-2 shadow-[0_18px_36px_-22px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <span className="font-sans text-[1.6rem] font-bold leading-none tabular-nums text-vermillion-glow">
          0
        </span>
        <span className="font-sans text-[12.5px] leading-tight text-paper">
          {t.rich("center_folklore_label", {
            br: () => <br />,
          })}
        </span>
      </div>

      {/* Glowing shield core */}
      <div className="relative z-10 flex items-center justify-center">
        {/* outer halo */}
        <div
          aria-hidden
          className="absolute h-[200px] w-[200px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(214,58,0,0.30) 0%, rgba(214,58,0,0.10) 35%, transparent 70%)",
          }}
        />
        {/* sparkle ring (decorative dots) */}
        <div aria-hidden className="absolute h-[120px] w-[120px]">
          {Array.from({ length: 10 }).map((_, i) => {
            const angle = (i / 10) * Math.PI * 2;
            const r = 60;
            const cx = 60 + Math.cos(angle) * r;
            const cy = 60 + Math.sin(angle) * r;
            return (
              <span
                key={i}
                className="absolute h-1 w-1 rounded-full bg-vermillion-glow"
                style={{
                  left: `${cx - 2}px`,
                  top: `${cy - 2}px`,
                  opacity: 0.55 + (i % 3) * 0.15,
                }}
              />
            );
          })}
        </div>
        {/* shield body */}
        <div className="relative flex h-[92px] w-[92px] items-center justify-center rounded-full border border-vermillion/45 bg-gradient-to-br from-vermillion to-vermillion-deep shadow-[0_0_44px_rgba(214,58,0,0.55),inset_0_2px_0_rgba(255,255,255,0.18)]">
          <ShieldCheck
            size={38}
            strokeWidth={2.4}
            className="text-paper drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
            style={{ color: "#fffaf2" }}
          />
        </div>
      </div>

      {/* Method checked */}
      <FlowPill
        tone="moss"
        icon={<CheckCircle2 size={12} className="text-moss" strokeWidth={2.6} />}
      >
        <span className="font-sans text-[12.5px] text-paper">{t("center_source_verified")}</span>
      </FlowPill>
    </div>
  );
}

function FlowPill({
  icon,
  children,
  tone = "vermillion",
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: "vermillion" | "moss";
}) {
  const borderClass =
    tone === "moss" ? "border-moss/40 bg-moss/[0.06]" : "border-ink-700 bg-ink-950/80";
  return (
    <div
      className={`relative z-10 inline-flex items-center gap-2 rounded-full border ${borderClass} px-3.5 py-1.5 shadow-[0_14px_28px_-18px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]`}
    >
      {icon}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RIGHT · SIGNAL-GROUNDED
// ─────────────────────────────────────────────────────────────

async function RepoPanel() {
  const t = await getTranslations("vs_folklore");
  return (
    <article className="relative overflow-hidden rounded-[20px] border border-moss/30 bg-ink-900/70 px-6 py-7 shadow-[0_24px_60px_-36px_rgba(93,143,77,0.25),inset_0_1px_0_rgba(255,255,255,0.05)] md:px-8 md:py-8">
      {/* HEADER */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-moss">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-moss/35 bg-moss/[0.10]">
            <ShieldCheck size={12} strokeWidth={2.4} />
          </span>
          {t("repo_label")}
        </div>
      </header>

      <h3 className="mt-5 font-sans text-[1.65rem] font-medium leading-[1.14] tracking-tight text-paper md:text-[1.85rem]">
        {t("repo_heading")}
      </h3>
      <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-ink-300">
        {t("repo_intro")}
      </p>

      {/* STAT CARDS */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <StatCard
          icon={<Target size={15} strokeWidth={2.4} className="text-moss" />}
          tone="moss"
          count={REPO_POSITIVE.length}
          label={t("repo_stat_rewarded")}
        />
        <StatCard
          icon={<AlertTriangle size={15} strokeWidth={2.4} className="text-vermillion" />}
          tone="vermillion"
          count={REPO_NEGATIVE.length}
          label={t("repo_stat_penalty")}
        />
      </div>

      {/* POSITIVE SIGNALS */}
      <div className="mt-6">
        <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-moss">
          <ThumbsUp size={12} strokeWidth={2.4} />
          {t("repo_positive_label")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {REPO_POSITIVE.map((sig) => (
            <span
              key={sig}
              className="rounded-md border border-moss/25 bg-moss/[0.06] px-2.5 py-1 font-mono text-[11.5px] text-moss"
            >
              {t(`repo_chip_${sig}`)}
            </span>
          ))}
        </div>
      </div>

      {/* NEGATIVE SIGNALS */}
      <div className="mt-5">
        <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-vermillion">
          <MinusCircle size={12} strokeWidth={2.4} />
          {t("repo_negative_label")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {REPO_NEGATIVE.map((sig) => (
            <span
              key={sig}
              className="rounded-md border border-vermillion/30 bg-vermillion/[0.05] px-2.5 py-1 font-mono text-[11.5px] text-vermillion"
            >
              {t(`repo_chip_${sig}`)}
            </span>
          ))}
        </div>
      </div>

      {/* VERIFICATION TRAIL */}
      <div className="mt-6 border-t border-ink-700/60 pt-5">
        <div className="mb-4 flex items-center gap-2 text-[12.5px] text-ink-200">
          <CheckCircle2 size={13} strokeWidth={2.4} className="text-moss" />
          {t("verified_from_prefix")}
        </div>
        <div className="flex items-start justify-between gap-1">
          {VERIFICATION_TRAIL_KEYS.map(({ step, key }, i) => (
            <div key={step} className="flex flex-1 items-start gap-1">
              <div className="min-w-0 flex-1 text-center">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-moss/40 bg-moss/[0.08] font-mono text-[12px] font-semibold text-moss">
                  {step}
                </span>
                <div className="mt-1.5 font-sans text-[12px] font-semibold leading-tight text-paper">
                  {t(`${key}_label`)}
                </div>
                <div className="mt-0.5 text-[10.5px] leading-snug text-ink-400">
                  {t(`${key}_detail`)}
                </div>
              </div>
              {i < VERIFICATION_TRAIL_KEYS.length - 1 && (
                <ArrowRight
                  size={12}
                  strokeWidth={2.2}
                  className="mt-1.5 shrink-0 text-ink-500"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function StatCard({
  icon,
  tone,
  count,
  label,
}: {
  icon: React.ReactNode;
  tone: "moss" | "vermillion";
  count: number;
  label: string;
}) {
  const styles =
    tone === "moss"
      ? "border-moss/25 bg-moss/[0.05]"
      : "border-vermillion/25 bg-vermillion/[0.04]";
  const iconBg = tone === "moss" ? "bg-moss/[0.12]" : "bg-vermillion/[0.12]";

  return (
    <div className={`rounded-2xl border px-4 py-4 ${styles}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${iconBg}`}>
          {icon}
        </span>
        <span className="font-sans text-[2.25rem] font-bold leading-none tabular-nums text-paper">
          {count}
        </span>
      </div>
      <div className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
        {label}
      </div>
    </div>
  );
}
