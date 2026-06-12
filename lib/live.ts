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

export type ResolvedStream =
  | {
      kind: "embed";
      url: string;
      source: string;
    }
  | {
      kind: "hls";
      url: string;
      source: string;
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

// Resolve a match id to a playable URL. Prefers the streamed.pk embed
// (embed.st) since dami-tv.pro's /live-hls/ proxy returns a token-gated
// placeholder ({"status":"ok","browserReady":false}) until an ad-verify
// token is presented — we'd rather skip their ad pipeline and go straight
// to the upstream embed.
export async function resolveStream(
  matchId: string,
): Promise<ResolvedStream | null> {
  const ex = await tryJson<ExtractResponse>(
    `${DAMI_ORIGIN}/papi/extract-url/${encodeURIComponent(matchId)}`,
  );
  if (ex?.success) {
    if (ex.embedUrl) {
      return { kind: "embed", url: ex.embedUrl, source: ex.source ?? "echo" };
    }
    const hls = toAbsolute(ex.hlsUrl);
    if (hls) return { kind: "hls", url: hls, source: ex.source ?? "echo" };
  }

  const dl = await tryJson<DlResponse>(
    `${DAMI_ORIGIN}/papi/dl/stream/${encodeURIComponent(matchId)}`,
  );
  if (dl?.success && dl.stream) {
    return { kind: "hls", url: dl.stream, source: "dl" };
  }

  const s3 = await tryJson<S3Response>(
    `${DAMI_ORIGIN}/papi/s3/stream/${encodeURIComponent(matchId)}`,
  );
  if (s3?.success && s3.stream) {
    return { kind: "hls", url: s3.stream, source: "s3" };
  }

  return null;
}
