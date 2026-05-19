import Link from "next/link";
import { ArrowUpRight, FileText, ExternalLink } from "lucide-react";
import { computeScore, bandFromScore } from "@/lib/score";
import type { AnalysisResult } from "@/lib/types";

export type AuditRow = {
  id: string;
  draft_text: string | null;
  result: AnalysisResult | null;
  created_at: string;
  tweet_url: string | null;
  tweet_author: string | null;
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

function bandPill(score: number) {
  const band = bandFromScore(score);
  const cls =
    band === "Strong"
      ? "border-moss/40 bg-moss/10 text-moss"
      : band === "Moderate"
        ? "border-vermillion/40 bg-vermillion/10 text-vermillion-glow"
        : "border-rust/40 bg-rust/10 text-rust";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${cls}`}
    >
      {band}
    </span>
  );
}

export function AuditsTable({
  rows,
  emptyHint = "Your first audit will appear here.",
}: {
  rows: AuditRow[];
  emptyHint?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/30 p-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-ink-700 bg-ink-900 text-ink-400">
          <FileText size={16} />
        </div>
        <p className="text-sm text-ink-300">{emptyHint}</p>
        <Link
          href="/#analyze"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-vermillion px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-paper-warm transition-colors hover:bg-vermillion-glow"
        >
          Run an audit
          <ArrowUpRight size={12} strokeWidth={2.4} />
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-ink-800 overflow-hidden rounded-2xl border border-ink-800 bg-ink-900/30">
      {rows.map((row) => {
        const score = row.result ? computeScore(row.result) : 0;
        const draft = (row.draft_text ?? "").trim();
        const preview = draft.length > 140 ? draft.slice(0, 140).trim() + "…" : draft || "(empty draft)";
        return (
          <li key={row.id} className="group">
            <Link
              href={`/v/${row.id}`}
              className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-ink-900/60"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  {bandPill(score)}
                  <span className="font-mono text-[11px] tabular-nums text-ink-300">
                    {score}/100
                  </span>
                  {row.tweet_author && (
                    <span className="font-mono text-[10.5px] text-ink-500">
                      · @{row.tweet_author}
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[10.5px] text-ink-500">
                    {relativeTime(row.created_at)}
                  </span>
                </div>
                <p className="text-[13.5px] leading-relaxed text-ink-200 line-clamp-2">{preview}</p>
              </div>
              <ExternalLink
                size={14}
                className="mt-1 shrink-0 text-ink-500 transition-colors group-hover:text-vermillion-glow"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
