// Client for SportSRC (api.sportsrc.org). They expose a JSON API
// with CORS open + no auth and they index a lot of the same matches
// streamed.pk does, but their per-match `sources` list sometimes
// contains alternate provider-id pairs we can use when dami-tv's
// curated list is just the decoy-prone `admin` provider.
//
// SportSRC uses the same source NAMES as streamed.pk (alpha, bravo,
// charlie, delta, echo, foxtrot, golf, admin) so we can feed the
// {source, id} pairs they hand us straight into our existing
// /live-hls/{source}/{id}/1/playlist.m3u8 path pattern.

const SPORTSRC_ORIGIN = "https://api.sportsrc.org";
const FETCH_TIMEOUT_MS = 2500;
const REACHABILITY_BACKOFF_MS = 5 * 60_000;
const CACHE_TTL_MS = 25_000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type SportSrcSourceRef = {
  source: string;
  id: string;
  streamNo?: number;
  language?: string;
  hd?: boolean;
  embedUrl?: string;
  viewers?: number;
};

export type SportSrcMatch = {
  id: string;
  title: string;
  category: string;
  date: number;
  popular?: boolean;
  poster?: string;
  teams?: {
    home?: { name?: string | null; badge?: string };
    away?: { name?: string | null; badge?: string };
  };
  sources?: SportSrcSourceRef[];
};

type Envelope<T> = { success: boolean; data?: T; error?: string };

let cachedAll: { result: SportSrcMatch[]; cachedAt: number } | null = null;
let unreachableAt: number | null = null;

function shouldSkip(): boolean {
  return Boolean(
    unreachableAt && Date.now() - unreachableAt < REACHABILITY_BACKOFF_MS,
  );
}

async function fetchEnvelope<T>(url: string): Promise<T | null> {
  if (shouldSkip()) return null;
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
      const env = (await r.json()) as Envelope<T>;
      if (!env.success) return null;
      return env.data ?? null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    unreachableAt = Date.now();
    return null;
  }
}

/**
 * Fetch every match SportSRC knows about. Cached for ~25s so a single
 * resolveStream call doesn't hammer them. Returns null on any error
 * or when we're inside the unreachability backoff window — callers
 * should treat that as "no enrichment available, move on".
 */
export async function fetchSportSrcMatches(): Promise<SportSrcMatch[] | null> {
  if (cachedAll && Date.now() - cachedAll.cachedAt < CACHE_TTL_MS) {
    return cachedAll.result;
  }
  const data = await fetchEnvelope<SportSrcMatch[]>(
    `${SPORTSRC_ORIGIN}/?data=matches&category=all`,
  );
  if (!Array.isArray(data)) return null;
  cachedAll = { result: data, cachedAt: Date.now() };
  return data;
}

/**
 * Look up the per-source detail for a given match. We need this when
 * we want SportSRC's `sources` array (it's only on the detail
 * response, not the matches list). Cached per-id within the same
 * fetch cycle via lookup of the cached match list when possible.
 */
export async function fetchSportSrcDetail(
  category: string,
  id: string,
): Promise<SportSrcMatch | null> {
  const data = await fetchEnvelope<SportSrcMatch>(
    `${SPORTSRC_ORIGIN}/?data=detail&category=${encodeURIComponent(category)}&id=${encodeURIComponent(id)}`,
  );
  return data ?? null;
}

/**
 * Cross-reference a dami-tv match (by id + title) against the SportSRC
 * feed. dami-tv and SportSRC use different id schemes, so we match
 * by normalised title first then fall through to id-equality.
 */
export async function findSportSrcMatch(
  damiTitle: string,
  damiCategory?: string,
): Promise<SportSrcMatch | null> {
  const all = await fetchSportSrcMatches();
  if (!all) return null;
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const target = norm(damiTitle);
  const candidates = all.filter((m) => norm(m.title) === target);
  if (candidates.length === 0) return null;
  // Prefer a category match when ambiguous.
  if (damiCategory) {
    const byCat = candidates.find((m) => m.category === damiCategory);
    if (byCat) return byCat;
  }
  return candidates[0];
}

/**
 * Resolve a SportSRC match's per-source list. The matches-list
 * endpoint omits `sources`; we have to call /detail to get them.
 */
export async function fetchSportSrcSources(
  category: string,
  id: string,
): Promise<SportSrcSourceRef[] | null> {
  const detail = await fetchSportSrcDetail(category, id);
  if (!detail?.sources) return null;
  return detail.sources;
}
