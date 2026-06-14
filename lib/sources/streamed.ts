// Client for streamed.pk's public API. streamed.pk is the UPSTREAM that
// dami-tv.pro proxies — going to it directly gives us a richer per-
// match source list (8 providers vs the 1-4 dami-tv usually exposes)
// and avoids dami-tv's habit of returning the `admin` provider first
// (admin is the one most often serving anti-leech tiktokcdn decoys).
//
// Reachability caveat: streamed.pk is regionally blocked by some ISPs
// (timeouts at the TCP level even though DNS resolves). We treat any
// network failure as "skip" and rely on the dami-tv path for matches
// data — the resolver pulls from BOTH, merges, and dedupes. On Vercel
// the edge is in datacentres that can reach streamed.pk fine, so in
// production this layer pays off; in local dev it harmlessly times
// out within FETCH_TIMEOUT_MS and we just use dami-tv.

const STREAMED_ORIGIN = "https://streamed.pk";
// Aggressive timeout: streamed.pk is region-blocked from many ISPs.
// When it's blocked, every resolver call would otherwise add this
// much latency on cold-start (until backoff sets). Keep it tight.
const FETCH_TIMEOUT_MS = 1500;
const REACHABILITY_TEST_TTL_MS = 5 * 60_000; // back-off if blocked
const CACHE_TTL_MS = 25_000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type StreamedSourceRef = { source: string; id: string };

export type StreamedMatch = {
  id: string;
  title: string;
  category: string;
  date: number;
  popular?: boolean;
  poster?: string;
  teams?: {
    home?: { name?: string; badge?: string };
    away?: { name?: string; badge?: string };
  };
  sources?: StreamedSourceRef[];
};

// One <video> playable derived from a streamed.pk source+id pair.
export type StreamedStream = {
  id: string;
  streamNo: number;
  language?: string;
  hd?: boolean;
  source: string;
  embedUrl?: string;
  // Some upstream entries also include a direct m3u8 — pass it through
  // if we get one so the playlist proxy can skip the embed scrape.
  m3u8?: string;
};

// Module-scope cache + reachability flag.
let cachedMatches: { result: StreamedMatch[]; cachedAt: number } | null = null;
let cachedReachableAt: number | null = null;
let cachedUnreachableAt: number | null = null;

function isCachedFresh(t: number) {
  return Date.now() - t < CACHE_TTL_MS;
}

function shouldSkipForReachability(): boolean {
  if (cachedReachableAt && Date.now() - cachedReachableAt < CACHE_TTL_MS)
    return false;
  if (
    cachedUnreachableAt &&
    Date.now() - cachedUnreachableAt < REACHABILITY_TEST_TTL_MS
  ) {
    return true;
  }
  return false;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!r.ok) return null;
      return (await r.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

/**
 * Fetch the full match list from streamed.pk. Returns null on any
 * error or when the endpoint is known-unreachable from our region —
 * the caller should fall back to dami-tv data.
 */
export async function fetchStreamedMatches(): Promise<StreamedMatch[] | null> {
  if (cachedMatches && isCachedFresh(cachedMatches.cachedAt)) {
    return cachedMatches.result;
  }
  if (shouldSkipForReachability()) {
    return null;
  }
  const data = await fetchJson<StreamedMatch[]>(
    `${STREAMED_ORIGIN}/api/matches/all`,
  );
  if (!Array.isArray(data)) {
    cachedUnreachableAt = Date.now();
    return null;
  }
  cachedReachableAt = Date.now();
  cachedMatches = { result: data, cachedAt: Date.now() };
  return data;
}

/**
 * Resolve a (source, id) pair to one or more playable streams via
 * streamed.pk's /api/stream endpoint. Returns null on failure so the
 * caller can fall through to the dami-tv path.
 */
export async function fetchStreamedStream(
  source: string,
  id: string,
): Promise<StreamedStream[] | null> {
  if (shouldSkipForReachability()) return null;
  const data = await fetchJson<StreamedStream[]>(
    `${STREAMED_ORIGIN}/api/stream/${encodeURIComponent(source)}/${encodeURIComponent(id)}`,
  );
  if (!Array.isArray(data)) return null;
  return data;
}

/**
 * Look up the streamed.pk match record (with its per-provider source
 * list) for a dami-tv match id / title. dami-tv and streamed.pk use
 * different ID schemes, so we match by exact id first then by title.
 */
export async function findStreamedMatch(
  damiMatchId: string,
  damiTitle: string,
): Promise<StreamedMatch | null> {
  const all = await fetchStreamedMatches();
  if (!all) return null;
  // Some dami-tv ids are direct passthroughs of streamed.pk match ids.
  const byId = all.find((m) => m.id === damiMatchId);
  if (byId) return byId;
  // Title fallback — normalise whitespace + case to dodge punctuation
  // mismatches between the two feeds.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const target = norm(damiTitle);
  return all.find((m) => norm(m.title) === target) ?? null;
}
