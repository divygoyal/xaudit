import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function Navbar() {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10 md:py-7">
      <Link href="/" className="group inline-flex items-center text-paper">
        {/* Wordmark with the logo embedded as the literal X letter.
            Reads "let [chef-X] cook" — the logo IS the X. */}
        <span className="serif-italic text-[2rem] leading-none tracking-tight md:text-[2.4rem]">
          let
        </span>
        <LogoMark />
        <span className="serif-italic text-[2rem] leading-none tracking-tight md:text-[2.4rem]">
          cook
        </span>
      </Link>

      <div className="hidden items-center gap-9 text-sm text-ink-200 md:flex">
        <a href="/#signals" className="transition-colors hover:text-paper">Signals</a>
        <a href="/#sample" className="transition-colors hover:text-paper">Sample</a>
        <a href="/#how" className="transition-colors hover:text-paper">How it works</a>
        <a href="/#faq" className="transition-colors hover:text-paper">FAQ</a>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {user?.email ? (
          <>
            <Link
              href="/dashboard"
              className="hidden items-center rounded-full border border-ink-700 bg-ink-900/70 px-4 py-2 text-sm text-paper backdrop-blur transition-all hover:border-vermillion hover:bg-ink-800 md:inline-flex"
            >
              Dashboard
            </Link>
            <UserMenu email={user.email} />
          </>
        ) : (
          <Link
            href="/login"
            className="group inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900/70 px-4 py-2 text-sm text-paper backdrop-blur transition-all hover:border-vermillion hover:bg-ink-800"
          >
            Sign in
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

function LogoMark() {
  // Logo sits INSIDE the wordmark as the literal X letter. Negative
  // horizontal margins pull "let" + "cook" closer so the logo tucks
  // into the word without ugly whitespace gaps. Sized to roughly match
  // the cap-height of the surrounding italic-serif text.
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/logo-hero.svg"
      alt="x"
      width={64}
      height={64}
      className="-mx-1 block shrink-0 md:-mx-1.5"
    />
  );
}
