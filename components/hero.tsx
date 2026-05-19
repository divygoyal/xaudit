import { HandwrittenUnderline } from "./handwritten-underline";
import { Button } from "./ui/button";

export function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-5xl px-6 pb-20 pt-16 text-center md:px-10 md:pb-28 md:pt-24">
        <div className="stagger flex flex-col items-center gap-7 md:gap-9">
          {/* status pill */}
          <a
            href="https://github.com/xai-org/x-algorithm"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 rounded-full border border-ink-700 bg-ink-900/60 px-3.5 py-1.5 text-[11px] tracking-wide text-ink-200 backdrop-blur transition-all hover:border-ink-500 hover:bg-ink-800/60"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vermillion opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-vermillion" />
            </span>
            <span className="font-mono uppercase">
              Built on <span className="text-paper">github.com/xai-org/x-algorithm</span>
            </span>
            <span className="text-ink-400">·</span>
            <span className="font-mono text-vermillion">v1 live</span>
            <span className="opacity-50 transition-transform group-hover:translate-x-0.5">↗</span>
          </a>

          {/* headline */}
          <h1 className="font-sans text-display-xl font-medium text-paper">
            <span className="block">Paste your X draft.</span>
            <span className="block">
              See if the{" "}
              <span className="relative inline-block">
                <span className="serif-italic text-paper">algorithm</span>
                <HandwrittenUnderline className="absolute -bottom-3 left-0 h-[18px] w-full md:-bottom-4 md:h-[22px]" />
              </span>{" "}
              will care.
            </span>
          </h1>

          {/* subhead */}
          <p className="max-w-2xl text-balance text-base leading-relaxed text-ink-200 md:text-lg">
            Drop your tweet, thread, or screenshot. We score it across the{" "}
            <span className="text-paper">13 engagement signals</span> X&apos;s own ranker tries to
            predict — and rewrite it stronger. Verdict in under 30 seconds.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <a href="#analyze">
              <Button variant="primary" className="text-[15px]">
                <span>Grade my post — free</span>
                <SparkIcon />
              </Button>
            </a>
            <a href="#sample">
              <Button variant="outline" className="text-[15px]">
                <PlayIcon />
                <span>See a sample</span>
              </Button>
            </a>
          </div>

          {/* trust microline */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-ink-300">
            <TrustItem>No signup</TrustItem>
            <span className="text-ink-600">·</span>
            <TrustItem>Drafts never stored</TrustItem>
            <span className="text-ink-600">·</span>
            <TrustItem>Free</TrustItem>
          </div>
        </div>

        {/* faint editorial cap line */}
        <div className="mt-24 flex items-center justify-center gap-4 text-[10px] uppercase tracking-[0.3em] text-ink-400 md:mt-32">
          <span className="h-px w-12 bg-ink-700" />
          <span className="font-mono">An honest grader · est. 2026</span>
          <span className="h-px w-12 bg-ink-700" />
        </div>
      </div>
    </section>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <CheckIcon />
      <span>{children}</span>
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M2.5 6.8 L5 9.2 L10.5 3.5"
        stroke="rgb(var(--vermillion))"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M7 1 L8 5 L12 6 L8 7 L7 11 L6 7 L2 6 L6 5 Z"
        fill="currentColor"
      />
      <circle cx="11" cy="2" r="0.8" fill="currentColor" />
      <circle cx="2" cy="11" r="0.6" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M2.5 1.5 L9 5.5 L2.5 9.5 Z" fill="currentColor" />
    </svg>
  );
}
