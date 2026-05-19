import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

export default function AuthCodeErrorPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-[420px] rounded-[20px] border border-rust/35 bg-ink-950/80 px-6 py-8 text-center shadow-[0_28px_60px_-32px_rgba(168,58,35,0.3)] md:px-8 md:py-10">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rust/15">
          <AlertTriangle size={22} strokeWidth={2.2} className="text-rust" />
        </span>
        <h1 className="mt-5 font-sans text-[1.5rem] font-medium leading-tight tracking-tight text-paper">
          Sign-in link <span className="serif-italic text-rust">expired</span>.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-ink-300">
          Magic links work once and last for an hour. Send yourself a fresh one
          and try again.
        </p>
        <Link
          href="/login"
          className="group mt-7 inline-flex items-center gap-1.5 rounded-full bg-vermillion px-5 py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.18em] text-paper-warm shadow-[0_16px_34px_-18px_rgba(214,58,0,0.55)] transition hover:bg-vermillion-soft"
        >
          Send a new link
          <ArrowRight size={12} strokeWidth={2.6} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </main>
  );
}
