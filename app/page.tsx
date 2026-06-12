import { MinimalNavbar } from "@/components/minimal-navbar";
import { fetchMatches, type MatchesResult } from "@/lib/live";
import { LiveBoard } from "./live/live-board";

// Title/description/robots/OG all inherit from app/layout.tsx so the
// homepage uses the site-wide sports streaming metadata.

// Re-render the homepage at most every 30s so it stays fresh without
// hammering the upstream feed on every request.
export const revalidate = 30;

export default async function HomePage() {
  let initial: MatchesResult | null = null;
  let initialError: string | null = null;
  try {
    initial = await fetchMatches();
  } catch (err) {
    initialError = (err as Error).message;
  }

  return (
    <main className="flex min-h-screen flex-col bg-black">
      <MinimalNavbar />
      <section className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-2 sm:px-8">
        <LiveBoard initial={initial} initialError={initialError} />
      </section>
    </main>
  );
}
