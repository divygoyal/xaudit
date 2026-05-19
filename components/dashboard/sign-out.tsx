"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/60 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.10em] text-paper transition-colors hover:border-vermillion disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <LogOut size={12} strokeWidth={2.4} />
      )}
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
