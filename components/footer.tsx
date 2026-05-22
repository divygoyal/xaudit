import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("footer");
  return (
    <footer className="border-t border-ink-700/60">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center text-paper">
              <span className="serif-italic text-[1.6rem] leading-none tracking-tight">let</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-hero.svg"
                alt="x"
                width={48}
                height={48}
                className="-mx-1 block shrink-0"
              />
              <span className="serif-italic text-[1.6rem] leading-none tracking-tight">cook</span>
            </span>
            <span className="text-xs text-ink-400">{t("copyright")}</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-ink-300">
            <a
              href="https://github.com/xai-org/x-algorithm"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-paper"
            >
              xai-org/x-algorithm ↗
            </a>
            <a href="#faq" className="transition-colors hover:text-paper">{t("link_faq")}</a>
            <a href="/privacy" className="transition-colors hover:text-paper">{t("link_privacy")}</a>
            <a href="/terms" className="transition-colors hover:text-paper">{t("link_terms")}</a>
            <a href="mailto:letxcook@gmail.com" className="transition-colors hover:text-paper">{t("link_contact")}</a>
          </div>
        </div>

        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-ink-400">
          {t("disclaimer")}
        </p>
      </div>
    </footer>
  );
}
