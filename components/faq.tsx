import { Plus } from "lucide-react";
import { SectionEyebrow } from "./signals-strip";

const FAQS = [
  {
    q: "Do you store my drafts?",
    a: "No. Drafts are sent to the grader and discarded after the response. We don't have an account system to store anything against. If we add accounts, storing drafts will be opt-in.",
  },
  {
    q: "How is this different from Hypefury / Tweet Hunter / Typefully analytics?",
    a: "Those tools optimize against folklore: post-time charts, hashtag counts, link-in-comments tricks — claims that aren't in X's open code. We only grade against the engagement signals X published themselves in xai-org/x-algorithm.",
  },
  {
    q: "Will this guarantee my post goes viral?",
    a: "No, and anyone who promises that is lying. We grade the signals the ranker tries to predict — that's the direction. Audience fit, timing and luck are still real. We surface what you can control.",
  },
  {
    q: "Why can you say it's based on X's algorithm?",
    a: "Because we only use the signals documented in X's open-source ranking repository at github.com/xai-org/x-algorithm. We do not have the numeric weights — nobody outside X does. We work on direction (which signals matter), not magnitude.",
  },
  {
    q: "What about the secret weights?",
    a: "They're proprietary. We never guess at them. That's why every grade is a band (Weak/Moderate/Strong) instead of a percentage — we refuse to fake precision.",
  },
  {
    q: "Can I use this for LinkedIn, Threads, or Bluesky?",
    a: "Not yet. letxcook is built on X's repo specifically. We'd rather be excellent on one platform than guess on five.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative border-t border-ink-700/60">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <div>
            <SectionEyebrow>FAQ</SectionEyebrow>
            <h2 className="mt-4 font-sans text-display-md font-medium text-paper">
              Honest <span className="serif-italic">answers</span>.
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-200">
              Tools in this category overpromise. We&apos;d rather underclaim, source everything,
              and let you decide.
            </p>
          </div>

          <div className="divide-y divide-ink-700/60 rounded-2xl border border-ink-700 bg-ink-900/30">
            {FAQS.map((f, i) => (
              <details key={i} className="group px-6 py-5 md:px-8">
                <summary className="flex cursor-pointer items-center justify-between gap-6">
                  <span className="text-[16px] font-medium text-paper">{f.q}</span>
                  <span className="accordion-chevron flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-700 bg-ink-950 text-ink-200 group-hover:border-ink-500">
                    <Plus size={14} />
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-200">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
