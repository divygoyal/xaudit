export function Footer() {
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
            <span className="text-xs text-ink-400">© 2026</span>
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
            <a href="#faq" className="transition-colors hover:text-paper">FAQ</a>
            <a href="mailto:hi@letxcook.com" className="transition-colors hover:text-paper">Contact</a>
          </div>
        </div>

        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-ink-400">
          letxcook grades drafts using only the engagement signals documented in X&apos;s open-source ranking
          repository. Numeric weights and the production model are proprietary and not used. This is a
          coaching tool — no result guarantees reach.
        </p>
      </div>
    </footer>
  );
}
