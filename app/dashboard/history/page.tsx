import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { AuditsTable, type AuditRow } from "@/components/dashboard/audits-table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const admin = getSupabaseAdmin();
  const { data, count } = await admin
    .from("analyses")
    .select("id, draft_text, result, created_at, tweet_url, tweet_author", {
      count: "exact",
    })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  const rows = (data ?? []) as AuditRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
          History
        </div>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-paper md:text-4xl">
          Every <span className="serif-italic text-vermillion">audit</span> you've run
        </h1>
        <p className="mt-1.5 text-sm text-ink-300">
          {total === 0
            ? "Nothing here yet — your audits will show up after your first run."
            : `${total} audit${total === 1 ? "" : "s"} total.`}
        </p>
      </header>

      <AuditsTable rows={rows} emptyHint="Run your first audit to see it here." />

      {totalPages > 1 && (
        <nav className="flex items-center justify-between border-t border-ink-800 pt-4 text-[12.5px] text-ink-300">
          <span>
            Page <span className="font-mono tabular-nums text-paper">{page}</span> of{" "}
            <span className="font-mono tabular-nums">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <PageLink page={page - 1} disabled={page <= 1}>
              <ChevronLeft size={14} />
              Prev
            </PageLink>
            <PageLink page={page + 1} disabled={page >= totalPages}>
              Next
              <ChevronRight size={14} />
            </PageLink>
          </div>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-full border border-ink-800 px-3 py-1.5 text-ink-600">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={`/dashboard/history?page=${page}`}
      className="inline-flex items-center gap-1 rounded-full border border-ink-700 px-3 py-1.5 transition-colors hover:border-vermillion hover:text-paper"
    >
      {children}
    </Link>
  );
}
