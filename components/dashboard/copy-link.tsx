"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Older browsers / non-secure contexts — fall back to select+exec.
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } finally {
        ta.remove();
      }
    }
  };

  return (
    <div className="flex items-stretch gap-0 overflow-hidden rounded-[12px] border border-ink-700 bg-ink-900/60">
      <input
        readOnly
        value={url}
        onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
        className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 font-mono text-[12.5px] text-paper outline-none"
        aria-label="Your invite link"
      />
      <button
        type="button"
        onClick={copy}
        className={`inline-flex shrink-0 items-center gap-1.5 border-l border-ink-700 px-3.5 text-[12px] font-semibold uppercase tracking-[0.10em] transition-colors ${
          copied
            ? "bg-moss/15 text-moss"
            : "bg-vermillion text-paper-warm hover:bg-vermillion-glow"
        }`}
      >
        {copied ? <Check size={13} strokeWidth={2.6} /> : <Copy size={13} strokeWidth={2.4} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
