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
  // dami-tv stores 4 stream-provider variants per match here (admin /
  // delta / echo / golf typically). Their /papi/extract-url endpoint
  // returns only one — usually the "admin" one — and for some matches
  // (notably football PPV) that one serves anti-leech decoy segments
  // pointing at tiktokcdn instead of real video. Keep the alternates
  // so resolveStream can hand them to the player as fallbacks.
  _streamedSources?: Array<{ source: string; id: string }>;
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
  streamedSources: Array<{ source: string; id: string }>;
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
    streamedSources: Array.isArray(m._streamedSources)
      ? m._streamedSources.filter(
          (s) =>
            s &&
            typeof s.source === "string" &&
            typeof s.id === "string" &&
            s.source &&
            s.id,
        )
      : [],
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

// Build the canonical dami-tv `/live-hls/streamed/{source}/{id}/{n}/`
// playlist URL we can hand to our playlist proxy. The path format is
// stable across providers (admin/delta/echo/golf) — only the slug in
// the `id` changes per source. Stream number 1 is what dami-tv's own
// site loads on initial play.
function streamedHlsUrl(source: string, id: string): string {
  return (
    `${DAMI_ORIGIN}/live-hls/streamed/${encodeURIComponent(source)}` +
    `/${encodeURIComponent(id)}/1/playlist.m3u8`
  );
}

// Resolve a match id to one or more playable sources. We try every
// upstream resolver in parallel and stack the results so the client
// has fallbacks when one provider fails. Crucially we also expand the
// match's _streamedSources list — extract-url alone often returns the
// upstream's "admin" provider which serves anti-leech decoy segments
// (tiktokcdn URLs) for some matches (football PPV in particular).
// The alternate providers (delta/echo/golf) hosted at the same path
// pattern usually have real video — including them as fallbacks lets
// auto-fallback walk past the decoy to a working stream.
export async function resolveStream(
  matchId: string,
): Promise<ResolvedStream | null> {
  // Run the slow paths in parallel:
  //   - extract-url tells us which provider dami-tv's own site picks
  //     for this match, plus the embed-iframe fallback URL.
  //   - dl/stream + s3/stream cover non-PPV matches (DaddyLive / S3).
  //   - fetchMatches gives us the match's _streamedSources list, which
  //     is the only place per-provider IDs live.
  const [ex, dl, s3, matches] = await Promise.all([
    tryJson<ExtractResponse>(
      `${DAMI_ORIGIN}/papi/extract-url/${encodeURIComponent(matchId)}`,
    ),
    tryJson<DlResponse>(
      `${DAMI_ORIGIN}/papi/dl/stream/${encodeURIComponent(matchId)}`,
    ),
    tryJson<S3Response>(
      `${DAMI_ORIGIN}/papi/s3/stream/${encodeURIComponent(matchId)}`,
    ),
    fetchMatches().catch(() => null),
  ]);

  // Build a deduped, ordered list of (kind, url, providerLabel) tuples
  // first; assign sequential "Server N" labels at the end so the UI
  // never shows two of the same number after dedup.
  type Candidate = {
    kind: "embed" | "hls";
    url: string;
    providerLabel: string;
  };
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  const addCandidate = (
    kind: "embed" | "hls",
    rawUrl: string | undefined | null,
    providerLabel: string,
  ) => {
    const url = toAbsolute(rawUrl);
    if (!url) return;
    const key = `${kind}::${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ kind, url, providerLabel });
  };

  // Slot 1: extract-url's chosen provider — what dami-tv's own site
  // hands their players. For some matches (football PPV) this is the
  // anti-leech decoy; the alternates below cover that case.
  if (ex?.success) {
    addCandidate("hls", ex.hlsUrl, ex.source ?? "primary");
  }

  // Per-provider _streamedSources variants (admin / delta / echo /
  // golf). These reuse the upstream /live-hls/{source}/{id}/1/playlist
  // URL pattern — different `id` per provider, real m3u8s when the
  // primary is decoyed.
  const match = matches?.matches.find((m) => m.id === matchId);
  if (match) {
    for (const ss of match.streamedSources) {
      addCandidate("hls", streamedHlsUrl(ss.source, ss.id), ss.source);
    }
  }

  if (dl?.success && dl.stream) {
    addCandidate("hls", dl.stream, "DaddyLive");
  }
  if (s3?.success && s3.stream) {
    addCandidate("hls", s3.stream, "S3");
    if (s3.backup && s3.backup !== s3.stream) {
      addCandidate("hls", s3.backup, "S3 backup");
    }
  }

  // embed iframe at the very bottom — anti-sandbox probe means it can't
  // be auto-fallen-to safely; user has to pick it manually.
  if (ex?.success && ex.embedUrl) {
    addCandidate("embed", ex.embedUrl, "iframe");
  }

  if (candidates.length === 0) return null;

  const sources: StreamSource[] = candidates.map((c, i) => ({
    kind: c.kind,
    url: c.url,
    label: `Server ${i + 1} (${c.providerLabel})`,
  }));
  const [primary, ...fallbacks] = sources;
  return { primary, fallbacks, matchId };
}
