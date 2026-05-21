"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail, Sparkles } from "lucide-react";
import disposableDomains from "disposable-email-domains";
import { getSupabaseClient } from "@/lib/supabase-client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const disposableSet = new Set<string>(disposableDomains);

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "sent">("idle");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueWithGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const supabase = getSupabaseClient();
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthErr) {
      setError(oauthErr.message);
      setGoogleLoading(false);
    }
    // On success, browser is redirected to Google; no state to reset here.
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setError("That doesn't look like a valid email address.");
      return;
    }
    const domain = trimmed.split("@")[1];
    if (disposableSet.has(domain)) {
      setError("Please use a real email — we need to send you a sign-in link.");
      return;
    }

    setPhase("sending");
    const supabase = getSupabaseClient();
    const { error: authErr } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (authErr) {
      setError(authErr.message);
      setPhase("idle");
      return;
    }
    setPhase("sent");
  };

  if (phase === "sent") {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-moss/15">
          <CheckCircle2 size={28} strokeWidth={2.2} className="text-moss" />
        </span>
        <h1 className="mt-6 font-sans text-[1.7rem] font-medium leading-tight tracking-tight text-paper md:text-[2rem]">
          Check your <span className="serif-italic text-moss">inbox</span>.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-ink-300">
          We sent a sign-in link to{" "}
          <span className="font-medium text-paper">{email}</span>. Click it to
          finish signing in. The link expires in an hour.
        </p>
        <button
          type="button"
          onClick={() => {
            setPhase("idle");
            setEmail("");
          }}
          className="mt-7 inline-flex items-center gap-1.5 text-[12.5px] text-ink-300 transition-colors hover:text-paper"
        >
          <ArrowLeft size={12} strokeWidth={2.4} />
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-vermillion/30 bg-vermillion/[0.08] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-vermillion-glow">
          <Sparkles size={10} strokeWidth={2.4} />
          Sign in
        </div>
        <h1 className="mt-5 font-sans text-[1.7rem] font-medium leading-tight tracking-tight text-paper md:text-[2rem]">
          One <span className="serif-italic text-vermillion">link</span>, in your inbox.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-ink-300">
          No passwords. Drop your email and we&apos;ll send a one-time sign-in
          link. Click it and you&apos;re in.
        </p>
      </div>

      {/* Google one-click sign-in */}
      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={googleLoading}
        className="mt-7 flex w-full items-center justify-center gap-3 rounded-[10px] border border-ink-700 bg-paper px-5 py-3 text-[13.5px] font-semibold text-ink-950 shadow-[0_18px_38px_-22px_rgba(0,0,0,0.45)] transition hover:bg-paper-warm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {googleLoading ? (
          <Loader2 size={14} className="animate-spin text-ink-500" />
        ) : (
          <GoogleGlyph />
        )}
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-ink-700" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
          or
        </span>
        <div className="h-px flex-1 bg-ink-700" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
            Email address
          </span>
          <div className="mt-1.5 flex items-center gap-2 rounded-[10px] border border-ink-700 bg-ink-950/70 px-3 py-2.5 transition focus-within:border-vermillion/45">
            <Mail size={14} strokeWidth={2.1} className="shrink-0 text-ink-400" />
            <input
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-paper placeholder:text-ink-500 focus:outline-none"
            />
          </div>
        </label>

        {error && (
          <div className="rounded-lg border border-rust/40 bg-rust/10 px-3.5 py-2.5 text-[12.5px] text-rust">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={phase === "sending"}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-vermillion px-5 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-paper-warm shadow-[0_16px_34px_-18px_rgba(214,58,0,0.6)] transition hover:bg-vermillion-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {phase === "sending" ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Sending…
            </>
          ) : (
            <>
              Send sign-in link
              <ArrowRight size={13} strokeWidth={2.6} className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-[11.5px] leading-relaxed text-ink-400">
        We&apos;ll never email you marketing, never sell your data, and
        you can delete your account anytime.
      </p>
    </>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.75h3.55c2.08-1.92 3.28-4.74 3.28-8.08Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.75c-.98.66-2.24 1.05-3.73 1.05-2.87 0-5.3-1.94-6.16-4.54H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.61 6.61 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.46 2.1 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.7 7.32 9.13 5.38 12 5.38Z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px] opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(214,58,0,0.10) 0%, transparent 60%)",
        }}
      />

      <div className="relative w-full max-w-[420px]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-400 transition-colors hover:text-paper"
        >
          <ArrowLeft size={12} strokeWidth={2.4} />
          Back to letxcook
        </Link>

        <div className="mt-6 rounded-[20px] border border-ink-700 bg-ink-950/80 px-6 py-8 shadow-[0_28px_60px_-32px_rgba(214,58,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] md:px-8 md:py-10">
          <Suspense fallback={<div className="h-72" />}>
            <LoginInner />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
