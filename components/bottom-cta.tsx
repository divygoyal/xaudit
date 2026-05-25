import { getTranslations } from "next-intl/server";
import { Button } from "./ui/button";
import { HandwrittenUnderline } from "./handwritten-underline";

export async function BottomCTA() {
  const t = await getTranslations("bottom_cta");
  return (
    <section className="relative border-t border-ink-700/60">
      <div className="relative mx-auto max-w-5xl px-6 py-24 text-center md:px-10 md:py-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-[500px] -translate-y-1/2 bg-glow-cta"
        />

        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-vermillion-glow">
          {t("eyebrow")}
        </div>
        <h2 className="mt-5 font-sans text-display-lg font-medium text-paper">
          {t("heading_prefix")}<br />
          <span className="relative inline-block">
            <span className="serif-italic">{t("heading_emphasis")}</span>
            <HandwrittenUnderline className="absolute -bottom-2 left-0 h-3 w-full md:-bottom-3 md:h-4" />
          </span>{" "}
          {t("heading_suffix")}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-balance text-[15px] leading-relaxed text-ink-200">
          {t("body")}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <a href="#analyze">
            <Button variant="primary" className="px-7 py-4 text-[15px]">
              {t("cta_primary")}
              <span>→</span>
            </Button>
          </a>
          <a href="#pricing">
            <Button variant="ghost" className="px-5 py-4 text-[14px]">
              {t("cta_secondary")}
            </Button>
          </a>
        </div>

        <div className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          {t("trust_line")}
        </div>
      </div>
    </section>
  );
}
