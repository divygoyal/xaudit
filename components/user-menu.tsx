"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Loader2, Settings as SettingsIcon } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";

export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setSigningOut(false);
    setOpen(false);
    router.refresh();
  };

  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        aria-label="Account menu"
        title={email}
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-vermillion font-mono text-[13px] font-bold uppercase text-paper-warm shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_6px_-2px_rgba(0,0,0,0.3)] outline-none ring-offset-2 ring-offset-ink-950 transition-all hover:bg-vermillion-glow focus-visible:ring-2 focus-visible:ring-vermillion ${
          open ? "ring-2 ring-vermillion" : ""
        }`}
      >
        {initial}
      </button>

      {open && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-0 top-full z-50 mt-2 w-[240px] overflow-hidden rounded-[12px] border border-ink-700 bg-ink-950 shadow-[0_24px_50px_-22px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]"
        >
          <div className="flex items-center gap-2.5 border-b border-ink-700/70 px-3 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vermillion font-mono text-[12px] font-bold uppercase text-paper-warm">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">
                Signed in as
              </div>
              <div className="mt-0.5 truncate text-[12.5px] text-paper">{email}</div>
            </div>
          </div>
          <Link
            href="/dashboard"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[12.5px] text-ink-200 transition-colors hover:bg-ink-900 hover:text-paper"
          >
            <LayoutDashboard size={13} strokeWidth={2.2} className="text-ink-400" />
            Dashboard
          </Link>
          <Link
            href="/dashboard/settings"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 border-b border-ink-700/70 px-3 py-2.5 text-left text-[12.5px] text-ink-200 transition-colors hover:bg-ink-900 hover:text-paper"
          >
            <SettingsIcon size={13} strokeWidth={2.2} className="text-ink-400" />
            Settings
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[12.5px] text-ink-200 transition-colors hover:bg-ink-900 hover:text-paper disabled:opacity-60"
          >
            {signingOut ? (
              <Loader2 size={13} className="animate-spin text-ink-400" />
            ) : (
              <LogOut size={13} strokeWidth={2.2} className="text-ink-400" />
            )}
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
