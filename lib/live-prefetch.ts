"use client";

import type { ResolvedStream } from "@/lib/live";

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
