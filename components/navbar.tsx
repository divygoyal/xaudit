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
      <Link href="/" className="group flex items-center gap-2.5">
        <LogoMark />
        <span className="font-serif text-2xl tracking-tight">
          let<span className="serif-italic">x</span>cook
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
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="7" fill="rgb(var(--vermillion))" />
      <path
        d="M8.5 9.5 L13.5 14 L8.5 18.5 M14.5 18.5 H19.5"
        stroke="rgb(var(--ink-950))"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
