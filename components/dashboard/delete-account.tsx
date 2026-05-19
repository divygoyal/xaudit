"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    if (phrase !== "DELETE") return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Couldn't delete account.");
      }
      // Hard navigate so middleware / server components don't keep stale auth state.
      window.location.assign("/");
    } catch (e: any) {
      setError(e?.message ?? "Couldn't delete account.");
      setLoading(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 rounded-full border border-rust/40 bg-rust/10 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.10em] text-rust transition-colors hover:bg-rust/20"
      >
        <Trash2 size={12} strokeWidth={2.4} />
        Delete account
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-rust/30 bg-rust/[0.05] p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rust" strokeWidth={2.4} />
        <div className="text-[13px] leading-relaxed text-paper">
          This permanently deletes your account, every audit you've run, and any bonus credits.
          Friends you've referred keep theirs. <span className="text-rust">This cannot be undone.</span>
        </div>
      </div>
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
          Type DELETE to confirm
        </label>
        <input
          type="text"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          autoFocus
          className="mt-1.5 w-full rounded-[10px] border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-[13px] text-paper outline-none focus:border-rust"
          placeholder="DELETE"
        />
      </div>
      {error && <p className="text-[12px] text-rust">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={phrase !== "DELETE" || loading}
          className="inline-flex items-center gap-2 rounded-full bg-rust px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.10em] text-paper-warm transition-colors hover:bg-rust/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Trash2 size={12} strokeWidth={2.4} />
          )}
          {loading ? "Deleting…" : "Permanently delete"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setPhrase("");
            setError(null);
          }}
          disabled={loading}
          className="rounded-full border border-ink-700 px-4 py-2 text-[12px] text-ink-200 transition-colors hover:border-ink-600 hover:text-paper disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
