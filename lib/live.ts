// Shared data fetching for the /live route. We pull from two upstreams:
//
//   - dami-tv.pro     — the matches feed + /live-hls/* HLS proxy that
//                       supplies real Referer-gated playlist URLs we
//                       can re-emit via /api/live/playlist.
//   - streamed.pk     — the actual upstream that dami-tv proxies. It
//                       exposes a richer source list per match (the
//                       full 8 provider variants) which we mine for
//                       playable alternatives when dami-tv's curated
//                       set is just `admin` (the decoy-prone one).
//
// streamed.pk is regionally blocked from some ISPs; the streamed
// client (lib/sources/streamed.ts) is best-effort with timeouts +
// backoff. dami-tv is treated as the always-available source.

import { findStreamedMatch } from "@/lib/sources/streamed";
import {
  findSportSrcMatch,
  fetchSportSrcSources,
} from "@/lib/sources/sportsrc";
import {
  extractDlhdM3u8,
  findDlhdChannels,
} from "@/lib/sources/daddylive";

export const DAMI_ORIGIN = "https://dami-tv.pro";
const MATCHES_UPSTREAM = `${DAMI_ORIGIN}/papi/matches/all`;

// Provider preference order. Higher index = lower priority. `admin` sits
// at the bottom because it's the provider that most often returns the
// anti-leech tiktokcdn decoy manifest — we still keep it as a last-
// resort so we have *something* to offer on matches where it's the only
// provider listed at all.
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

// Resolve a match id to one or more playable sources.
//
// Source pool comes from four places, fanned-out in parallel:
//   - dami-tv extract-url    — their default provider pick + embed
//   - dami-tv dl/stream      — DaddyLive (rarely populated)
//   - dami-tv s3/stream      — S3-hosted streams (rare)
//   - dami-tv matches feed   — the match's _streamedSources list
//   - streamed.pk matches    — the upstream's RICHER source list (8
//                              providers vs dami-tv's curated 1-4)
//
// All providers go through dami-tv's /live-hls/{provider}/{id}/1/
// playlist.m3u8 pattern — that's still the URL our playlist proxy
// knows how to fetch with the right Referer. streamed.pk just gives
// us extra provider-id pairs to feed into that pattern.
//
// Sources are then sorted by PROVIDER_PRIORITY so the decoy-heavy
// `admin` provider sits LAST in the auto-fallback walk, not first.
export async function resolveStream(
  matchId: string,
): Promise<ResolvedStream | null> {
  const [ex, dl, s3, damiMatches] = await Promise.all([
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

  const damiMatch = damiMatches?.matches.find((m) => m.id === matchId);

  // Short-circuit enrichment when dami-tv already exposes a healthy
  // multi-provider source list. Hitting streamed.pk + SportSRC adds
  // 2-7s to the resolve and only meaningfully helps the LONG TAIL of
  // matches where dami-tv only knows about admin (the decoy). For
  // matches like Brazil vs Morocco — admin + delta + echo + golf
  // already in dami's _streamedSources — none of the alternative
  // feeds would surface anything we don't already have. Skipping them
  // takes the football click-to-resolve from ~25s → ~3s in dev.
  const ENRICHMENT_SOURCE_THRESHOLD = 2;
  const damiHasGoodSources =
    (damiMatch?.streamedSources.length ?? 0) >= ENRICHMENT_SOURCE_THRESHOLD;

  const [streamedMatch, sportSrcMatch, dlhdChannels] =
    damiMatch && !damiHasGoodSources
      ? await Promise.all([
          findStreamedMatch(matchId, damiMatch.title).catch(() => null),
          findSportSrcMatch(damiMatch.title, damiMatch.category).catch(
            () => null,
          ),
          findDlhdChannels(damiMatch.title).catch(() => null),
        ])
      : [null, null, null];
  // SportSRC's matches list omits the sources array; pull detail only
  // when we matched a record AND the dami short-circuit didn't trigger.
  const sportSrcSources = sportSrcMatch
    ? await fetchSportSrcSources(sportSrcMatch.category, sportSrcMatch.id).catch(
        () => null,
      )
    : null;
  // For DLHD we have to extract the m3u8 per channel via their PHP
  // pipeline. extractDlhdM3u8 currently returns null (Phase 3b TODO)
  // — once it lands this loop will start producing URLs for every
  // matched DLHD channel. Limited to 4 candidates per match so we
  // don't bloat the player's source picker on broadcast-heavy events.
  const dlhdHls: Array<{ url: string; channelName: string }> = [];
  if (dlhdChannels && dlhdChannels.length > 0) {
    const top = dlhdChannels.slice(0, 4);
    const extracted = await Promise.all(
      top.map((ch) =>
        extractDlhdM3u8(ch.channelId)
          .then((url) => (url ? { url, channelName: ch.channelName } : null))
          .catch(() => null),
      ),
    );
    for (const r of extracted) if (r) dlhdHls.push(r);
  }

  // Pre-rank candidates by provider weight, NOT by upstream order —
  // dami-tv hands us admin first; we want admin last.
  type Candidate = {
    kind: "embed" | "hls";
    url: string;
    providerLabel: string;
    weight: number;
  };
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  const addCandidate = (
    kind: "embed" | "hls",
    rawUrl: string | undefined | null,
    providerLabel: string,
    weightOverride?: number,
  ) => {
    const url = toAbsolute(rawUrl);
    if (!url) return;
    const key = `${kind}::${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({
      kind,
      url,
      providerLabel,
      weight: weightOverride ?? providerWeight(providerLabel),
    });
  };

  // dami-tv extract-url's pick. Don't trust its primacy — its provider
  // (often `admin`) is rated through providerWeight below like any
  // other candidate.
  if (ex?.success) {
    addCandidate("hls", ex.hlsUrl, ex.source ?? "primary");
  }

  // Per-provider variants from dami-tv's matches feed.
  if (damiMatch) {
    for (const ss of damiMatch.streamedSources) {
      addCandidate("hls", streamedHlsUrl(ss.source, ss.id), ss.source);
    }
  }
  // …and the richer set from streamed.pk itself.
  if (streamedMatch?.sources) {
    for (const ss of streamedMatch.sources) {
      addCandidate("hls", streamedHlsUrl(ss.source, ss.id), ss.source);
    }
  }
  // …and SportSRC's per-source entries. They use the same source
  // names (alpha/bravo/.../golf/admin), so each (source, id) pair
  // feeds straight into the existing dami-tv proxy URL pattern.
  // We don't grab their embedUrl directly here — that points at
  // embed.streamapi.cc which we haven't whitelisted in the playlist
  // proxy yet (Phase 2 of testing); the HLS path is the fast win.
  if (sportSrcSources) {
    for (const ss of sportSrcSources) {
      addCandidate("hls", streamedHlsUrl(ss.source, ss.id), ss.source);
    }
  }

  // Other dami-tv resolvers. DaddyLive/S3 don't fit the provider
  // priority table cleanly, so weight them above admin but below the
  // strmd.pk-family providers.
  if (dl?.success && dl.stream) {
    addCandidate("hls", dl.stream, "DaddyLive", PROVIDER_PRIORITY.length - 1);
  }
  if (s3?.success && s3.stream) {
    addCandidate("hls", s3.stream, "S3", PROVIDER_PRIORITY.length - 1);
    if (s3.backup && s3.backup !== s3.stream) {
      addCandidate("hls", s3.backup, "S3 backup", PROVIDER_PRIORITY.length);
    }
  }
  // DLHD-direct candidates (when extractDlhdM3u8 starts returning
  // URLs — currently always empty). Weighted just above admin so
  // they only come into play after the strmd.pk-family providers.
  for (const { url, channelName } of dlhdHls) {
    addCandidate("hls", url, `DLHD ${channelName}`, PROVIDER_PRIORITY.length - 2);
  }

  // embed.st iframes — always sit BELOW every HLS candidate (penalised
  // weight) because they trip the anti-sandbox probe and only work
  // when the user clicks them manually.
  const embedWeight = PROVIDER_PRIORITY.length + 10;
  if (ex?.success && ex.embedUrl) {
    addCandidate("embed", ex.embedUrl, "iframe", embedWeight);
  }
  if (damiMatch) {
    for (const ss of damiMatch.streamedSources) {
      addCandidate(
        "embed",
        `https://embed.st/embed/${encodeURIComponent(ss.source)}/${encodeURIComponent(ss.id)}/1`,
        `${ss.source} iframe`,
        embedWeight + providerWeight(ss.source),
      );
    }
  }
  if (streamedMatch?.sources) {
    for (const ss of streamedMatch.sources) {
      addCandidate(
        "embed",
        `https://embedsports.top/embed/${encodeURIComponent(ss.source)}/${encodeURIComponent(ss.id)}/1`,
        `${ss.source} iframe`,
        embedWeight + providerWeight(ss.source),
      );
    }
  }

  if (candidates.length === 0) return null;

  // Stable sort by weight (lower = higher priority). Among the same
  // weight, preserve insertion order so re-runs are deterministic.
  candidates.sort((a, b) => a.weight - b.weight);

  const sources: StreamSource[] = candidates.map((c, i) => ({
    kind: c.kind,
    url: c.url,
    label: `Server ${i + 1} (${c.providerLabel})`,
  }));
  const [primary, ...fallbacks] = sources;
  return { primary, fallbacks, matchId };
}
