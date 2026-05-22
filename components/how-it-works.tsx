import { getTranslations } from "next-intl/server";
import { SectionEyebrow } from "./signals-strip";

const STEPS = [
  { id: "paste", number: "01" },
  { id: "grade", number: "02" },
  { id: "ship", number: "03" },
] as const;

export async function HowItWorks() {
  const t = await getTranslations("how_it_works");
  return (
    <section id="how" className="relative border-t border-ink-700/60">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow>{t("eyebrow")}</SectionEyebrow>
          <h2 className="mt-4 font-sans text-display-md font-medium text-paper">
            {t.rich("heading", {
              emph: (chunks) => <span className="serif-italic">{chunks}</span>,
            })}
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-ink-700 bg-ink-700 md:grid-cols-3">
          {STEPS.map(({ id, number }) => (
            <div key={id} className="bg-ink-950 p-7 md:p-9">
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-7xl leading-none text-paper">
                  <span className="serif-italic">{number}</span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
                  {t(`steps.${id}.detail`)}
                </span>
              </div>
              <h3 className="mt-6 font-sans text-2xl font-medium text-paper">
                {t(`steps.${id}.title`)}
              </h3>
              <p className="mt-3 max-w-xs text-[14.5px] leading-relaxed text-ink-200">
                {t(`steps.${id}.body`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
