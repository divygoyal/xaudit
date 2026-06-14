"use client";

import { DAMI_ORIGIN } from "@/lib/live";
import type { Match, ResolvedStream } from "@/lib/live";

// Same provider priority the server-side resolver uses. Defined here
// too so the client can pick the same "preferred" source as a
// resolveStream call WITHOUT making the resolver round-trip — useful
// for the page-load prewarm path below.
const PROVIDER_PRIORITY = [
  "echo",
  "delta",
  "bravo",
  "charlie",
  "foxtrot",
  "alpha",
  "golf",
  "admin",
];
function providerWeight(source: string): number {
  const idx = PROVIDER_PRIORITY.indexOf(source);
  return idx === -1 ? PROVIDER_PRIORITY.length : idx;
}

// Client-only cache + speculative prefetch for stream resolution and
// playlist warm-up. Two reasons it matters:
//
//   1. dami-tv.pro's /live-hls/ endpoint warms the stream on demand.
//      First fetch can take 5-30s; second fetch within a short window
//      is <1s. If we kick the warm-up off while the user is hovering
//      the card, the click-to-frame time drops drastically.
//
//   2. The resolver itself does three upstream lookups. Doing them on
//      hover means the response is already cached by the time the
//      overlay mounts.
//
// All caches are short-lived and process-local — no SSR concerns, no
// storage involved, nothing leaves the tab.

const STREAM_RESULT_TTL = 30_000; // /api/live/stream replies
const PLAYLIST_REQUEST_TTL = 12_000; // playlist warm-up dedup window

type StreamCacheEntry = {
  promise: Promise<ResolvedStream | null>;
  cachedAt: number;
};

const streamCache = new Map<string, StreamCacheEntry>();
const playlistWarming = new Map<string, number>();

function fresh(entry: { cachedAt: number }, ttl: number) {
  return Date.now() - entry.cachedAt < ttl;
}

/**
 * Kick off (or reuse) an `/api/live/stream/[id]` request. Safe to call
 * many times — the promise is shared across callers. Returns null on
 * any error so the UI can fall through to its on-click path.
 */
export function prefetchStream(
  matchId: string,
): Promise<ResolvedStream | null> {
  if (typeof window === "undefined")
    return Promise.resolve(null);
  const existing = streamCache.get(matchId);
  if (existing && fresh(existing, STREAM_RESULT_TTL)) {
    return existing.promise;
  }
  const promise = fetch(`/api/live/stream/${encodeURIComponent(matchId)}`, {
    cache: "no-store",
  })
    .then(async (r) => {
      if (!r.ok) return null;
      const data = (await r.json()) as ResolvedStream | { error?: string };
      if ("error" in data && data.error) return null;
      return data as ResolvedStream;
    })
    .catch(() => null);
  streamCache.set(matchId, { promise, cachedAt: Date.now() });
  // After the resolver returns, eagerly warm the primary playlist —
  // that's the actual slow upstream call we're trying to hide.
  promise.then((resolved) => {
    if (resolved?.primary?.kind === "hls") {
      warmPlaylist(matchId, resolved.primary.url);
    }
  });
  return promise;
}

/**
 * Fire a `GET /api/live/playlist/[id]?src=...` request and discard the
 * body. The point isn't the data — it's getting dami-tv's CDN to warm
 * its stream cache and getting Vercel's edge to remember the response.
 * Dedup'd by (matchId, src) within a short window so a panicked
 * hover-out/hover-in doesn't fan out.
 */
export function warmPlaylist(matchId: string, src: string): void {
  if (typeof window === "undefined") return;
  const key = `${matchId}::${src}`;
  const lastAt = playlistWarming.get(key);
  if (lastAt && Date.now() - lastAt < PLAYLIST_REQUEST_TTL) return;
  playlistWarming.set(key, Date.now());
  const url =
    `/api/live/playlist/${encodeURIComponent(matchId)}` +
    `?src=${encodeURIComponent(src)}`;
  // Intentionally cache: "default" — we want the response to land in
  // the HTTP cache so hls.js's first manifest fetch can be served
  // from the browser cache instead of paying the upstream cost again.
  fetch(url).catch(() => undefined);
}

/**
 * Pull a cached resolver result if it exists. Used by the overlay so
 * the click handler can render immediately when hover prefetch has
 * already completed.
 */
export function getCachedStream(
  matchId: string,
): Promise<ResolvedStream | null> | null {
  const entry = streamCache.get(matchId);
  if (!entry) return null;
  if (!fresh(entry, STREAM_RESULT_TTL)) {
    streamCache.delete(matchId);
    return null;
  }
  return entry.promise;
}

// --- Page-load prewarm helpers --------------------------------------
//
// Hover-prefetch only helps users with a mouse. Touch users can't
// hover, so by the time they click their first match we still have a
// cold cache. Page-load prewarm fixes that: as soon as LiveBoard has
// the list of live matches in hand, we kick off a warm-up fetch for
// every one of them in the background. By the time any single match
// is clicked, dami-tv has warmed the upstream stream AND our edge
// has the response cached, so the visible click-to-frame drops from
// 5-10s to ~1-2s.
//
// Three guards keep this from punishing the 5% of users it could
// otherwise hurt:
//   1. SKIP on slow connections (navigator.connection.effectiveType
//      slow-2g or 2g) so metered/2G users don't pay the bandwidth.
//   2. STAGGER beyond the first batch so a burst of 20+ fetches
//      doesn't saturate the browser's 6-connection-per-origin pool
//      and slow down a click that happens during the prewarm window.
//   3. ONLY live matches — upcoming/ended don't have streams yet, so
//      prewarming them is pure waste.

// Two-knob concurrency control:
//   - PREWARM_INITIAL_DELAY_MS: wait briefly after pageload before we
//     fire anything. Gives a same-second click (e.g. a returning user
//     who clicks fast) priority for the browser's connection pool.
//   - PREWARM_MAX_CONCURRENT: an in-process semaphore caps how many
//     prewarms can be in-flight to letxcook.com at once. Browsers
//     limit 6 connections per origin; we hold 2 of those for prewarm
//     and leave 4 free for user-triggered fetches (the click path,
//     matches refresh, etc.). Without this guard the prewarm wave
//     queued the user's click request behind 20 in-flight requests
//     and click-to-frame ballooned to >40s in dev.
const PREWARM_INITIAL_DELAY_MS = 800;
const PREWARM_MAX_CONCURRENT = 2;

function isSlowConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  // NetworkInformation API is not in the official typings.
  const conn = (
    navigator as unknown as {
      connection?: { effectiveType?: string; saveData?: boolean };
    }
  ).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
}

function pickPreferredStreamedSource(
  streamedSources: Array<{ source: string; id: string }>,
): { source: string; id: string } | null {
  if (streamedSources.length === 0) return null;
  // Same provider-weight order the server-side resolver uses. We
  // pick the lowest-weighted (most preferred) source so the prewarm
  // hits the URL the user is most likely to actually play.
  return [...streamedSources].sort(
    (a, b) => providerWeight(a.source) - providerWeight(b.source),
  )[0];
}

/**
 * Build the canonical dami-tv playlist URL for a single match and fire
 * an awaitable warm-up fetch. Returns the in-flight promise so the
 * caller can throttle concurrency. Resolves regardless of HTTP result
 * — the goal is just to populate caches, not to surface errors.
 */
export async function warmMatchPlaylist(match: Match): Promise<void> {
  const ss = pickPreferredStreamedSource(match.streamedSources);
  if (!ss) return;
  const url =
    `${DAMI_ORIGIN}/live-hls/streamed/` +
    `${encodeURIComponent(ss.source)}/${encodeURIComponent(ss.id)}` +
    `/1/playlist.m3u8`;
  const key = `${match.id}::${url}`;
  const last = playlistWarming.get(key);
  if (last && Date.now() - last < PLAYLIST_REQUEST_TTL) return;
  playlistWarming.set(key, Date.now());
  const target =
    `/api/live/playlist/${encodeURIComponent(match.id)}` +
    `?src=${encodeURIComponent(url)}`;
  try {
    await fetch(target, {
      // Hint to the browser that this is background work — chromium
      // (and a couple of others) actually de-prioritise it in the
      // connection pool when this is set. Safe to ignore elsewhere.
      ...({ priority: "low" } as object),
    });
  } catch {
    /* swallow — prewarm is best-effort */
  }
}

// Track active prewarm to abort pending warm-ups when the user opens
// a player overlay (their click needs the connection pool slots more
// than the prewarm does).
let activePrewarmAbort: AbortController | null = null;

/**
 * Fan out warmMatchPlaylist across every live match in the list, with
 * all three guards.
 *
 * Safe to call on every render — warmPlaylist itself dedupes within a
 * 12s window so re-invoking after a refresh is harmless. The previous
 * implementation fired all 20+ requests at once and ate every slot in
 * the browser's per-origin connection pool, which blocked the user's
 * click for the duration. This rewrite (a) waits a beat first,
 * (b) caps in-flight prewarms at PREWARM_MAX_CONCURRENT, and
 * (c) exposes cancelLivePrewarm so a click can preempt the queue.
 */
// Categories that get the priority-prewarm treatment: as soon as the
// matches list arrives we fire BOTH resolver + playlist warm-up for
// these (no initial delay, no concurrency cap among them) so the
// click-to-frame on the most-likely landing match is near-instant.
// Today this is football — the user's primary funnel — but we keep
// it as a configurable list so we can add WC group games / specific
// teams later without touching the queue logic.
const PRIORITY_CATEGORIES = new Set(["football"]);

export function prewarmLiveMatches(matches: Match[]): void {
  if (typeof window === "undefined") return;
  if (isSlowConnection()) return;

  const live = matches.filter((m) => m.status === "live");
  if (live.length === 0) return;

  // Cancel any in-flight wave from the previous render before
  // queueing a new one.
  activePrewarmAbort?.abort();
  const abort = new AbortController();
  activePrewarmAbort = abort;

  const priority = live.filter((m) => PRIORITY_CATEGORIES.has(m.category));
  const others = live.filter((m) => !PRIORITY_CATEGORIES.has(m.category));

  // PRIORITY MATCHES: fire IMMEDIATELY without the initial delay, and
  // call prefetchStream (which populates the resolver cache AND
  // triggers the playlist warm via its .then handler). By click time
  // the overlay's `getCachedStream` lookup hits the cached promise,
  // skipping the entire `/api/live/stream` round-trip — that's the
  // single biggest contributor to perceived click-to-frame latency.
  for (const m of priority) {
    if (abort.signal.aborted) break;
    void prefetchStream(m.id);
  }

  // EVERYTHING ELSE: the existing throttled queue. Delay 800ms,
  // 2 concurrent at a time, just playlist warm-up (no resolver call).
  const queue = [...others];
  let active = 0;
  const pump = () => {
    if (abort.signal.aborted) return;
    while (active < PREWARM_MAX_CONCURRENT && queue.length > 0) {
      const next = queue.shift()!;
      active++;
      warmMatchPlaylist(next)
        .catch(() => undefined)
        .finally(() => {
          active--;
          if (!abort.signal.aborted) pump();
        });
    }
  };
  setTimeout(() => {
    if (abort.signal.aborted) return;
    pump();
  }, PREWARM_INITIAL_DELAY_MS);
}

/**
 * Abort any in-flight prewarm queue. Call this when the user opens a
 * player overlay so their click's network requests get the open
 * connection slots first.
 */
export function cancelLivePrewarm(): void {
  activePrewarmAbort?.abort();
  activePrewarmAbort = null;
}
