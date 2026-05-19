import { SectionEyebrow } from "./signals-strip";

const STEPS = [
  {
    n: "01",
    title: "Paste",
    body: "Drop your draft, thread or a screenshot of someone else's tweet you want to learn from. Multimodal in.",
    detail: "TXT · PNG · JPG",
  },
  {
    n: "02",
    title: "Grade",
    body: "We score it across all 13 signals — 10 the ranker rewards, 4 it punishes — with the line that triggered each judgment.",
    detail: "~12 sec",
  },
  {
    n: "03",
    title: "Ship",
    body: "Three rewrites, each strengthening a different weak signal. Copy the one that fits the angle you want.",
    detail: "Copy → post",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative border-t border-ink-700/60">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow>How it works</SectionEyebrow>
          <h2 className="mt-4 font-sans text-display-md font-medium text-paper">
            Three steps. <span className="serif-italic">No fluff</span>.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-ink-700 bg-ink-700 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="bg-ink-950 p-7 md:p-9">
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-7xl leading-none text-paper">
                  <span className="serif-italic">{step.n}</span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
                  {step.detail}
                </span>
              </div>
              <h3 className="mt-6 font-sans text-2xl font-medium text-paper">{step.title}</h3>
              <p className="mt-3 max-w-xs text-[14.5px] leading-relaxed text-ink-200">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
