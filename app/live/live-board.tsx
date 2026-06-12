"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  getCachedStream,
  prefetchStream,
} from "@/lib/live-prefetch";
import type {
  Match,
  MatchesResult,
  ResolvedStream,
  StreamSource,
} from "@/lib/live";

// hls.js is ~75 KB gzipped — only worth pulling in once the user has
// actually clicked a match. Loading via next/dynamic keeps the home
// page bundle tiny for the most common visit (browse, don't watch).
const HlsPlayer = dynamic(
  () => import("@/components/hls-player").then((m) => m.HlsPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
        Loading player…
      </div>
    ),
  },
);

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  football: "Football",
  basketball: "Basketball",
  "american-football": "NFL",
  hockey: "Hockey",
  baseball: "Baseball",
  fight: "Combat",
  tennis: "Tennis",
  cricket: "Cricket",
  rugby: "Rugby",
  "motor-sports": "Motorsport",
  golf: "Golf",
  darts: "Darts",
  afl: "AFL",
  other: "Other",
};

const SPORT_ORDER = [
  "football",
  "basketball",
  "american-football",
  "cricket",
  "baseball",
  "hockey",
  "afl",
  "fight",
  "motor-sports",
  "rugby",
  "tennis",
  "golf",
  "darts",
  "other",
];

type ApiResponse = {
  matches?: Match[];
  fetchedAt?: number;
  error?: string;
};

function StatusBadge({ status }: { status: Match["status"] }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-red-600/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        Live
      </span>
    );
  }
  if (status === "upcoming") {
    return (
      <span className="rounded-sm bg-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-200">
        Upcoming
      </span>
    );
  }
  if (status === "ended") {
    return (
      <span className="rounded-sm bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        Ended
      </span>
    );
  }
  return null;
}

function TeamRow({ team }: { team: { name: string; badge: string } }) {
  return (
    <div className="flex items-center gap-2">
      {team.badge ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.badge}
          alt=""
          className="h-5 w-5 shrink-0 object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="h-5 w-5 shrink-0 rounded-full bg-zinc-800" />
      )}
      <span className="truncate text-sm text-zinc-100">{team.name}</span>
    </div>
  );
}

function formatCountdown(deltaMs: number): string {
  if (deltaMs <= 0) return "starting soon";
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  if (hours < 24) return remMins ? `in ${hours}h ${remMins}m` : `in ${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `in ${days}d ${remHours}h` : `in ${days}d`;
}

function MatchCard({
  match,
  onPlay,
}: {
  match: Match;
  onPlay: (m: Match) => void;
}) {
  // useCallback used below for hover prefetch — declared before any
  // early returns so React's hook order stays stable.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (match.status !== "upcoming") return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [match.status]);

  const startLabel = useMemo(() => {
    if (!match.startsAt) return "";
    if (match.status === "upcoming") {
      return formatCountdown(match.startsAt - now);
    }
    const d = new Date(match.startsAt);
    return d.toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [match.startsAt, match.status, now]);

  // Streams aren't provisioned until kickoff, so only live matches are
  // actually playable. Upcoming cards show the countdown instead.
  const playable = match.status === "live";

  // Speculative prefetch: when the user hovers (or focuses, for
  // keyboard users) a live card, kick the stream resolver + playlist
  // warm-up in the background. The upstream caches the stream after
  // first hit — by the time the user actually clicks, the m3u8 is
  // usually already warm at both their browser and our edge.
  const handlePrefetch = useCallback(() => {
    if (!playable) return;
    void prefetchStream(match.id);
  }, [playable, match.id]);

  return (
    <button
      type="button"
      onClick={() => playable && onPlay(match)}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onTouchStart={handlePrefetch}
      disabled={!playable}
      className={`group relative flex flex-col gap-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left transition ${
        playable
          ? "cursor-pointer hover:border-orange-500/60 hover:bg-zinc-900"
          : "cursor-not-allowed opacity-60"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={match.status} />
        <span className="truncate text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {CATEGORY_LABELS[match.category] ?? match.category}
        </span>
      </div>

      {match.away.name ? (
        <div className="flex flex-col gap-1.5 py-1">
          <TeamRow team={match.home} />
          <TeamRow team={match.away} />
        </div>
      ) : (
        <div className="line-clamp-2 py-1 text-sm font-medium text-white">
          {match.title}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between text-[11px] text-zinc-500">
        <span>{startLabel}</span>
        {match.viewers > 0 ? <span>{match.viewers} watching</span> : null}
      </div>
    </button>
  );
}

// Build the URL we hand to <HlsPlayer> for an HLS-kind source. Goes
// through our own /api/live/playlist proxy so we can attach the right
// Referer header to dodge the upstream's anti-direct-fetch placeholder
// and serve the manifest with edge-cacheable headers. Adding a per-
// source `src` lets the same match's multiple HLS providers (extract-
// url vs dl/stream vs s3/stream) live behind the same proxy route.
function buildHlsProxyUrl(matchId: string, source: StreamSource): string {
  const base = `/api/live/playlist/${encodeURIComponent(matchId)}`;
  // For the primary "extract-url"-derived URL (Server 1), letting the
  // proxy run its own extract-url fetch is cheaper than passing the URL
  // round-trip — same result, and lets the proxy cache key match.
  return `${base}?src=${encodeURIComponent(source.url)}`;
}

// /embed/player wrapper, only used for the embed.st iframe fallback.
function buildEmbedWrapperSrc(url: string, title: string): string {
  return (
    "/embed/player" +
    `?src=${encodeURIComponent(url)}` +
    `&title=${encodeURIComponent(title)}`
  );
}

function PlayerOverlay({
  match,
  onClose,
}: {
  match: Match;
  onClose: () => void;
}) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; resolved: ResolvedStream; sourceIdx: number }
    | { kind: "error"; message: string }
  >({ kind: "loading" });
  // Bumping this remounts the iframe with a fresh src — used both when
  // the user picks another server and when we manually retry.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    setReloadKey(0);

    (async () => {
      try {
        // First check the hover-prefetch cache. If the user hovered
        // the card long enough for the resolver to complete, this
        // resolves to a finished promise and the overlay flips to
        // "ready" without paying any network cost on click.
        const cached = getCachedStream(match.id);
        const data = await (cached ?? prefetchStream(match.id));
        if (cancelled) return;
        if (!data) {
          setState({
            kind: "error",
            message: "Could not resolve stream",
          });
          return;
        }
        setState({ kind: "ready", resolved: data, sourceIdx: 0 });
      } catch (e) {
        if (cancelled) return;
        setState({ kind: "error", message: (e as Error).message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [match.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Two stall signals:
  //   - HlsPlayer's onFatalError (hls.js gave up on the current src)
  //   - dami-tv.pro/player/hls/'s postMessage (used by the embed.st
  //     iframe fallback to tell us its own player stalled)
  // Plus a wall-clock timer: if we never see a "playing" event from
  // HlsPlayer within ~12s of mount, treat that as a stall too — slow
  // upstreams sometimes hang indefinitely instead of erroring.
  const [stalled, setStalled] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  useEffect(() => {
    setStalled(false);
    setHasPlayed(false);
    const handler = (e: MessageEvent) => {
      const d = e.data as { type?: string; reason?: string } | null;
      if (!d || typeof d !== "object") return;
      if (d.type === "hls-stall") setStalled(true);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [match.id, reloadKey]);

  // Auto-advance to the next source if the CURRENT one never started
  // playing. We only do this BEFORE the first successful playing event
  // — if the stream worked then dropped, the user is mid-watch and
  // auto-switching them would be jarring. They get the manual button
  // in that case instead. Cycle stops once every source has been tried
  // so we never thrash forever on a dead match.
  const [autoTriedIdx, setAutoTriedIdx] = useState<Set<number>>(
    () => new Set(),
  );
  useEffect(() => {
    // Reset tried-set whenever the user opens a new match.
    setAutoTriedIdx(new Set([0]));
  }, [match.id]);

  const tryNextSource = useCallback(() => {
    setState((cur) => {
      if (cur.kind !== "ready") return cur;
      const total = 1 + cur.resolved.fallbacks.length;
      const next = (cur.sourceIdx + 1) % total;
      return { ...cur, sourceIdx: next };
    });
    setReloadKey((k) => k + 1);
    setStalled(false);
    setHasPlayed(false);
  }, []);

  const autoAdvanceIfFresh = useCallback(() => {
    setState((cur) => {
      if (cur.kind !== "ready") return cur;
      if (hasPlayed) return cur; // mid-watch — don't auto-swap
      const total = 1 + cur.resolved.fallbacks.length;
      if (total <= 1) return cur;
      // Pick the next index we haven't auto-tried yet. If all of them
      // have been auto-tried, give up — the user can still manually
      // click a server button.
      let next = (cur.sourceIdx + 1) % total;
      let scanned = 0;
      while (autoTriedIdx.has(next) && scanned < total) {
        next = (next + 1) % total;
        scanned++;
      }
      if (autoTriedIdx.has(next)) return cur;
      setAutoTriedIdx((s) => {
        const n = new Set(s);
        n.add(next);
        return n;
      });
      return { ...cur, sourceIdx: next };
    });
    setReloadKey((k) => k + 1);
    setStalled(false);
    setHasPlayed(false);
  }, [hasPlayed, autoTriedIdx]);

  useEffect(() => {
    if (state.kind !== "ready") return;
    if (hasPlayed) return;
    if (state.resolved.fallbacks.length === 0) return;
    // 14s budget for first frame on whatever source is selected. Bumped
    // from 12s to account for the upstream's cold-start curve.
    const t = setTimeout(() => {
      autoAdvanceIfFresh();
    }, 14_000);
    return () => clearTimeout(t);
  }, [state, hasPlayed, reloadKey, autoAdvanceIfFresh]);

  const handlePlayerFatal = useCallback(() => {
    setStalled(true);
    autoAdvanceIfFresh();
  }, [autoAdvanceIfFresh]);

  const allSources: StreamSource[] | null =
    state.kind === "ready"
      ? [state.resolved.primary, ...state.resolved.fallbacks]
      : null;
  const currentSource =
    state.kind === "ready" && allSources
      ? allSources[state.sourceIdx]
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-white">
              {match.title}
            </h2>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              {CATEGORY_LABELS[match.category] ?? match.category}
              {currentSource ? (
                <span className="ml-2 text-zinc-400 normal-case">
                  · {currentSource.label}
                </span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="aspect-video w-full overflow-hidden rounded-lg border border-zinc-800 bg-black">
          {state.kind === "loading" && (
            <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
              Loading stream…
            </div>
          )}
          {state.kind === "error" && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm text-red-400">Stream unavailable.</p>
              <p className="text-xs text-zinc-500">{state.message}</p>
            </div>
          )}
          {state.kind === "ready" && currentSource && currentSource.kind === "hls" && (
            <HlsPlayer
              // The key remounts the player when the user switches
              // sources or retries — otherwise hls.js keeps the old
              // session alive and we never actually swap streams.
              key={`hls-${state.sourceIdx}-${reloadKey}`}
              src={buildHlsProxyUrl(match.id, currentSource)}
              poster={match.poster}
              onFatalError={handlePlayerFatal}
              onPlaying={() => setHasPlayed(true)}
            />
          )}
          {state.kind === "ready" && currentSource && currentSource.kind === "embed" && (
            <iframe
              key={`embed-${state.sourceIdx}-${reloadKey}`}
              src={buildEmbedWrapperSrc(currentSource.url, match.title)}
              title={match.title}
              className="block h-full w-full"
              // Tight sandbox: scripts + same-origin (cookies for the
              // upstream player's token chain) + the minimum extras
              // playback needs. NO allow-popups (so aclib.runPop's
              // window.open returns null → popunder dies silently), NO
              // allow-top-navigation (so window.top.location = adUrl is
              // blocked). embed.st probes sandbox and may show "Remove
              // sandbox attributes" — a known trade-off the UI flags
              // by labelling this source as a fallback only.
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-presentation allow-pointer-lock"
              referrerPolicy="no-referrer"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
            />
          )}
        </div>

        {state.kind === "ready" && allSources && allSources.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
            <div className="flex flex-wrap items-center gap-1.5">
              {allSources.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setState((cur) =>
                      cur.kind === "ready" ? { ...cur, sourceIdx: i } : cur,
                    );
                    setReloadKey((k) => k + 1);
                    setStalled(false);
                  }}
                  className={`rounded-full border px-2.5 py-1 transition ${
                    i === state.sourceIdx
                      ? "border-orange-500 bg-orange-500/15 text-orange-300"
                      : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {stalled && (
              <button
                type="button"
                onClick={tryNextSource}
                className="rounded-md bg-orange-500 px-3 py-1.5 font-medium text-white hover:bg-orange-400"
              >
                Try next source →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function LiveBoard({
  initial,
  initialError,
}: {
  initial: MatchesResult | null;
  initialError: string | null;
}) {
  const [data, setData] = useState<MatchesResult | null>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [active, setActive] = useState("all");
  const [selected, setSelected] = useState<Match | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/live/matches", { cache: "no-store" });
        const j = (await r.json()) as ApiResponse;
        if (cancelled) return;
        if (!r.ok || j.error) {
          setError(j.error ?? `HTTP ${r.status}`);
        } else if (j.matches) {
          setData({ matches: j.matches, fetchedAt: j.fetchedAt ?? Date.now() });
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    // First client refresh happens after the SSR data is ~60s old.
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const matches = data?.matches ?? [];

  const liveByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of matches) {
      if (m.status === "live") {
        counts[m.category] = (counts[m.category] ?? 0) + 1;
      }
    }
    return counts;
  }, [matches]);

  const categories = useMemo(() => {
    const present = new Set(matches.map((m) => m.category));
    // Categories with live matches come first; then the configured sport
    // order, then any unrecognized categories.
    const withLive = SPORT_ORDER.filter(
      (c) => present.has(c) && (liveByCategory[c] ?? 0) > 0,
    );
    const withoutLive = SPORT_ORDER.filter(
      (c) => present.has(c) && !(liveByCategory[c] > 0),
    );
    const extra = [...present].filter((c) => !SPORT_ORDER.includes(c));
    return ["all", ...withLive, ...withoutLive, ...extra];
  }, [matches, liveByCategory]);

  const filtered = useMemo(() => {
    if (active === "all") return matches;
    return matches.filter((m) => m.category === active);
  }, [matches, active]);

  const liveCount = matches.filter((m) => m.status === "live").length;
  const liveInActive =
    active === "all" ? liveCount : liveByCategory[active] ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Live matches
        </h1>
        {liveCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/15 px-3 py-1 text-xs font-semibold text-red-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            {liveCount} live now
          </span>
        )}
      </div>

      <nav className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const live = c === "all" ? liveCount : liveByCategory[c] ?? 0;
          const isActive = active === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white"
              }`}
            >
              <span>{CATEGORY_LABELS[c] ?? c}</span>
              {live > 0 && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-red-600/20 text-red-400"
                  }`}
                >
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  {live}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {liveInActive === 0 && matches.length > 0 && active !== "all" && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
          <span>
            No live {CATEGORY_LABELS[active] ?? active} matches right now —
            upcoming games are listed below.
          </span>
          {liveCount > 0 && (
            <button
              type="button"
              onClick={() => setActive("all")}
              className="shrink-0 rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
            >
              See {liveCount} live →
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          Failed to load matches: {error}
        </div>
      )}

      {matches.length === 0 && !error && (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-400">
          No matches available right now.
        </div>
      )}

      {filtered.length === 0 && matches.length > 0 && (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-400">
          No matches in this category.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((m) => (
          <MatchCard key={m.id} match={m} onPlay={setSelected} />
        ))}
      </div>

      {selected && (
        <PlayerOverlay match={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
