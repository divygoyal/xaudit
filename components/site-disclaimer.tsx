import Link from "next/link";

// Site-wide legal disclaimer strip. Mounted in app/layout.tsx so it
// appears at the bottom of every route. Pages that also render the
// marketing <Footer /> will show that footer above this strip.
//
// NOTE: a disclaimer is a partial mitigation, not a legal shield —
// rights holders can still send DMCA notices or take action. The point
// here is to make a good-faith record of (a) we do not host or stream
// any content ourselves and (b) we'll act on takedown requests fast.
// If a rights holder reaches out, you must actually remove the link.
export function SiteDisclaimer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-zinc-800/60 bg-black/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-[11px] leading-relaxed text-zinc-500 sm:px-8">
        <p>
          &copy; {year} letxcook. All trademarks, team names, league logos and
          related media on this site are the property of their respective
          owners.
        </p>
        <p>
          <strong className="font-semibold text-zinc-400">
            No content is hosted on this website.
          </strong>{" "}
          Live streams, scores and match information are provided by publicly
          accessible third-party APIs and embed services. We act solely as a
          directory linking to publicly available URLs and do not upload,
          store, encode, decode, transcode, transmit, or modify any video
          stream. We are not affiliated with, endorsed by, or connected to the
          NFL, NBA, MLB, NHL, FIFA, UEFA, the Premier League, UFC, or any
          other rights holder, broadcaster, league, team, or athlete shown.
        </p>
        <p>
          <strong className="font-semibold text-zinc-400">
            DMCA / takedown requests:
          </strong>{" "}
          if you are a rights holder and believe a link surfaced through this
          site infringes your rights, email{" "}
          <a
            href="mailto:letxcook@gmail.com"
            className="text-zinc-300 underline-offset-2 hover:text-white hover:underline"
          >
            letxcook@gmail.com
          </a>{" "}
          with the URL and proof of ownership and we will remove it promptly.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-zinc-400">
          <Link
            href="/privacy"
            className="transition-colors hover:text-white"
          >
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-white">
            Terms
          </Link>
          <a
            href="mailto:letxcook@gmail.com"
            className="transition-colors hover:text-white"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
