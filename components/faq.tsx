import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SectionEyebrow } from "./signals-strip";

const FAQ_ITEMS = [
  "store_drafts",
  "vs_competitors",
  "viral_guarantee",
  "algorithm_basis",
  "secret_weights",
  "other_platforms",
] as const;

export async function FAQ() {
  const t = await getTranslations("faq");
  return (
    <section id="faq" className="relative border-t border-ink-700/60">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <div>
            <SectionEyebrow>{t("eyebrow")}</SectionEyebrow>
            <h2 className="mt-4 font-sans text-display-md font-medium text-paper">
              {t.rich("heading", {
                emph: (chunks) => <span className="serif-italic">{chunks}</span>,
              })}
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-200">
              {t("intro")}
            </p>
          </div>

          <div className="divide-y divide-ink-700/60 rounded-2xl border border-ink-700 bg-ink-900/30">
            {FAQ_ITEMS.map((id) => (
              <details key={id} className="group px-6 py-5 md:px-8">
                <summary className="flex cursor-pointer items-center justify-between gap-6">
                  <span className="text-[16px] font-medium text-paper">{t(`items.${id}.q`)}</span>
                  <span className="accordion-chevron flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-700 bg-ink-950 text-ink-200 group-hover:border-ink-500">
                    <Plus size={14} />
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-200">
                  {t(`items.${id}.a`)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
