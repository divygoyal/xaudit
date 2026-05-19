import { notFound } from "next/navigation";
import { RecommendedRewrite } from "@/components/recommended-rewrite";
import { EmbedThemeBridge } from "@/components/embed-theme-bridge";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { computeScore } from "@/lib/score";
import type { AnalysisResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: { id: string };
  searchParams: { theme?: "light" | "dark" };
};

/**
 * Stripped-down comparison view designed to be embedded in an iframe —
 * specifically by the browser extension's in-page overlay. No navbar,
 * no footer, no banners, no CTA below — just the RecommendedRewrite.
 *
 * Accepts `?theme=light|dark` to override the user's stored theme
 * preference (useful when the embedding context wants to force one).
 */
export default async function EmbedPage({ params, searchParams }: Params) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("analyses")
    .select("id, draft_text, result")
    .eq("id", params.id)
    .single();
  if (error || !data) notFound();

  const result = data.result as AnalysisResult;
  const primary =
    result.rewrites?.find((r) => r.is_primary) ?? result.rewrites?.[0];
  if (!primary) notFound();

  const currentScore = computeScore(result);

  // Sync script that overrides the layout's theme as early as possible
  // when ?theme=… is provided. Runs before paint to avoid any flash.
  const themeOverride =
    searchParams.theme === "dark"
      ? `document.documentElement.classList.add('dark');`
      : searchParams.theme === "light"
        ? `document.documentElement.classList.remove('dark');`
        : null;

  return (
    <>
      {themeOverride && (
        <script
          dangerouslySetInnerHTML={{ __html: `try{${themeOverride}}catch(e){}` }}
        />
      )}
      <EmbedThemeBridge />
      <main className="bg-ink-950 px-3 py-2 md:px-4 md:py-3">
        <div className="mx-auto max-w-6xl">
          <RecommendedRewrite
            result={result}
            draftText={data.draft_text}
            primary={primary}
            currentScore={currentScore}
          />
        </div>
      </main>
    </>
  );
}
