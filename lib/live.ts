// Shared data fetching for the /live route. The matches feed comes from
// dami-tv.pro; we normalize the shape so the client board only deals with
// our own types. Used by both the page (SSR) and the /api/live/matches
// route (client refresh + revalidation).

export const DAMI_ORIGIN = "https://dami-tv.pro";
const MATCHES_UPSTREAM = `${DAMI_ORIGIN}/papi/matches/all`;

type UpstreamMatch = {
  id: string;
  title: string;
  category: string;
  league?: string;
  date: number;
  popular?: boolean;
  poster?: string | null;
  status?: string;
  viewers?: number;
  viewerCount?: number;
  teams?: {
    home?: { name?: string; badge?: string };
    away?: { name?: string; badge?: string };
  };
  sources?: Array<{ source: string; id: string }>;
};

export type MatchStatus = "live" | "upcoming" | "ended" | "unknown";

export type Match = {
  id: string;
  title: string;
  category: string;
  startsAt: number;
  status: MatchStatus;
  poster: string | null;
  popular: boolean;
  viewers: number;
  home: { name: string; badge: string };
  away: { name: string; badge: string };
  sources: Array<{ source: string; id: string }>;
};

function normalize(m: UpstreamMatch): Match {
  const raw = m.status ?? "unknown";
  const status: MatchStatus =
    raw === "live" || raw === "upcoming" || raw === "ended" ? raw : "unknown";
  return {
    id: m.id,
    title: m.title ?? "",
    category: m.category ?? m.league ?? "other",
    startsAt: m.date ?? 0,
    status,
    poster: m.poster ?? null,
    popular: Boolean(m.popular),
    viewers: m.viewerCount ?? m.viewers ?? 0,
    home: {
      name: m.teams?.home?.name ?? "",
      badge: m.teams?.home?.badge ?? "",
    },
    away: {
      name: m.teams?.away?.name ?? "",
      badge: m.teams?.away?.badge ?? "",
    },
    sources: Array.isArray(m.sources) ? m.sources : [],
  };
}

export type MatchesResult = {
  matches: Match[];
  fetchedAt: number;
};

export async function fetchMatches(): Promise<MatchesResult> {
  const res = await fetch(MATCHES_UPSTREAM, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; xaudit-live/1.0; +https://letxcook.com)",
      Accept: "application/json",
    },
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`upstream_error_${res.status}`);
  }
  const raw = (await res.json()) as UpstreamMatch[];
  const matches = raw.map(normalize).sort((a, b) => {
    const aLive = a.status === "live" ? 0 : 1;
    const bLive = b.status === "live" ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    return a.startsAt - b.startsAt;
  });
  return { matches, fetchedAt: Date.now() };
}

type ExtractResponse = {
  success: boolean;
  source?: string;
  hlsUrl?: string;
  embedUrl?: string;
};

type DlResponse = {
  success: boolean;
  stream?: string;
  channels?: Array<{ id: string; name: string }>;
};

type S3Response = {
  success: boolean;
  stream?: string;
  backup?: string;
};

// All playable URLs we know about for a match, ranked. The client picks
// the primary and keeps the others as fallbacks if playback stalls.
//
// - `embed`: a streamed.pk embed iframe (embed.st). Usually works but
//   their CDN sometimes blocks the manifest fetch from iframes that
//   aren't streamed.pk's own pages — hence the fallback list.
// - `hls`:   a raw HLS playlist proxied through dami-tv.pro/live-hls/*.
//   We hand it to dami-tv.pro/player/hls/ (their bundled hls.js player)
//   rather than rolling our own — their player handles their token chain.
export type StreamSource = {
  kind: "embed" | "hls";
  url: string;
  label: string;
};

export type ResolvedStream = {
  primary: StreamSource;
  fallbacks: StreamSource[];
  matchId: string;
};

function toAbsolute(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return DAMI_ORIGIN + url;
  return `${DAMI_ORIGIN}/${url}`;
}

async function tryJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: `${DAMI_ORIGIN}/`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

// Resolve a match id to one or more playable sources. We try every
// upstream resolver and stack the results so the client has fallbacks
// when one provider fails (embed.st sometimes refuses the manifest
// fetch; their /live-hls proxy is token-gated; etc.).
export async function resolveStream(
  matchId: string,
): Promise<ResolvedStream | null> {
  const sources: StreamSource[] = [];

  const ex = await tryJson<ExtractResponse>(
    `${DAMI_ORIGIN}/papi/extract-url/${encodeURIComponent(matchId)}`,
  );
  if (ex?.success) {
    if (ex.embedUrl) {
      sources.push({
        kind: "embed",
        url: ex.embedUrl,
        label: `Server 1 (${ex.source ?? "echo"})`,
      });
    }
    const hls = toAbsolute(ex.hlsUrl);
    if (hls) {
      sources.push({ kind: "hls", url: hls, label: "Server 2 (HLS)" });
    }
  }

  const dl = await tryJson<DlResponse>(
    `${DAMI_ORIGIN}/papi/dl/stream/${encodeURIComponent(matchId)}`,
  );
  if (dl?.success && dl.stream) {
    sources.push({ kind: "hls", url: dl.stream, label: "Server 3 (DL)" });
  }

  const s3 = await tryJson<S3Response>(
    `${DAMI_ORIGIN}/papi/s3/stream/${encodeURIComponent(matchId)}`,
  );
  if (s3?.success && s3.stream) {
    sources.push({ kind: "hls", url: s3.stream, label: "Server 4 (S3)" });
    if (s3.backup && s3.backup !== s3.stream) {
      sources.push({
        kind: "hls",
        url: s3.backup,
        label: "Server 5 (S3 backup)",
      });
    }
  }

  if (sources.length === 0) return null;
  const [primary, ...fallbacks] = sources;
  return { primary, fallbacks, matchId };
}
