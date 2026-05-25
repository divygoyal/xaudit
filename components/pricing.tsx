import Link from "next/link";
import { ArrowUpRight, Check, CreditCard, Infinity, ShieldCheck, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SectionEyebrow } from "./signals-strip";

const FEATURES = [
  "unlimited",
  "rewrites",
  "inputs",
  "history",
  "priority",
] as const;

export async function Pricing() {
  const t = await getTranslations("pricing");

  return (
    <section id="pricing" className="relative border-t border-ink-700/60">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div>
            <SectionEyebrow>{t("eyebrow")}</SectionEyebrow>
            <h2 className="mt-4 max-w-2xl font-sans text-display-md font-medium text-paper">
              {t.rich("heading", {
                emph: (chunks) => <span className="serif-italic text-vermillion">{chunks}</span>,
              })}
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-200">
              {t("intro")}
            </p>

            <div className="mt-7 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              <ProofPoint Icon={Infinity} label={t("proof.unlimited")} />
              <ProofPoint Icon={ShieldCheck} label={t("proof.private")} />
              <ProofPoint Icon={Zap} label={t("proof.fast")} />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-vermillion/35 bg-ink-950/80 p-6 shadow-[0_24px_70px_-42px_rgba(214,58,0,0.55)] md:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-vermillion/70 to-transparent"
            />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-vermillion/40 bg-vermillion/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-vermillion-glow">
                  <Sparkles size={10} strokeWidth={2.4} />
                  {t("badge")}
                </div>
                <h3 className="mt-4 font-serif text-3xl text-paper">
                  letxcook <span className="serif-italic text-vermillion">Pro</span>
                </h3>
                <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-ink-300">
                  {t("description")}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="flex items-baseline gap-1 sm:justify-end">
                  <span className="font-serif text-5xl text-paper tabular-nums">$9</span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">
                    {t("per_month")}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
                  {t("cancel")}
                </div>
              </div>
            </div>

            <ul className="mt-7 grid grid-cols-1 gap-3 text-[13.5px] text-ink-100 sm:grid-cols-2">
              {FEATURES.map((id) => (
                <li key={id} className="flex items-start gap-2.5">
                  <Check
                    size={14}
                    strokeWidth={2.6}
                    className="mt-0.5 shrink-0 text-vermillion-glow"
                  />
                  <span>{t(`features.${id}`)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-vermillion px-5 py-3 text-sm font-semibold text-paper-warm shadow-[0_18px_36px_-20px_rgba(214,58,0,0.72)] transition hover:bg-vermillion-glow"
              >
                {t("cta")}
                <ArrowUpRight size={15} strokeWidth={2.4} />
              </Link>
              <div className="inline-flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500 sm:justify-end">
                <CreditCard size={12} strokeWidth={2.2} />
                {t("powered_by")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProofPoint({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-ink-700 bg-ink-900/40 px-3 py-2 text-[12px] text-ink-200">
      <Icon size={14} strokeWidth={2.3} className="shrink-0 text-vermillion-glow" />
      <span>{label}</span>
    </div>
  );
}
