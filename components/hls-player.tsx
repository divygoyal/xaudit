"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

type HlsPlayerProps = {
  src: string;
  poster?: string | null;
  className?: string;
  onFatalError?: (err: { type: string; details: string }) => void;
  onPlaying?: () => void;
  // Triggered by the in-overlay "Reload" button. Lets the parent bump
  // its reloadKey so we get a brand-new <HlsPlayer> mount instead of
  // hls.js trying to recover on a stale instance.
  onReloadRequest?: () => void;
};

// Low-latency live config. Picked to bias hard toward "show frame fast"
// over "buffer ahead of time":
//   - liveSyncDurationCount: 2  → join the stream ~8s behind live edge
//     instead of the upstream default 3-4 segments. Each segment in our
//     feed is ~4s, so first frame is reachable after fetching 1 segment.
//   - lowLatencyMode: true      → enables CMAF/LL-HLS optimisations the
//     library picks up when the playlist supports it; harmless otherwise.
//   - startFragPrefetch: true   → start fetching segments before MANIFEST
//     PARSED finishes the metadata pass.
//   - manifestLoadingTimeOut: 5000, manifestLoadingMaxRetry: 2 — fail
//     fast and surface the error UI rather than spinning the way the
//     upstream player's defaults do (10 retries × 1s).
const HLS_CONFIG: Partial<Hls["config"]> = {
  enableWorker: true,
  lowLatencyMode: true,
  liveSyncDurationCount: 2,
  liveMaxLatencyDurationCount: 6,
  liveDurationInfinity: true,
  maxBufferLength: 15,
  maxMaxBufferLength: 30,
  backBufferLength: 10,
  maxBufferSize: 30 * 1000 * 1000,
  startFragPrefetch: true,
  // hls.js 1.6 wired retry behaviour into policy objects; setting only
  // the legacy manifestLoading* / levelLoading* / fragLoading* flags
  // leaves their defaults active (errorRetry.maxNumRetry: 1 with a
  // 1-8s exponential backoff). That kept the player in a silent retry
  // loop for ~10s before firing the ERROR event, which made our 502
  // decoy fast-fail useless. Set the policies explicitly + zero out
  // the manifest retries: if our proxy returned 5xx, retrying it
  // immediately won't help — we want the auto-fallback to advance.
  manifestLoadPolicy: {
    default: {
      // Real-world cold-start variance: 4-22s observed on streamed.pk-
      // family providers (echo can spike to 22s on the very first
      // request before any cache warms up). 28s ceiling so we don't
      // bail on a slow-but-eventually-good upstream. Decoy responses
      // come back as 502 within <500ms via our proxy's tiktokcdn
      // detector, so this ceiling only applies to legitimate slow
      // responses.
      maxTimeToFirstByteMs: 20_000,
      maxLoadTimeMs: 28_000,
      timeoutRetry: { maxNumRetry: 0, retryDelayMs: 0, maxRetryDelayMs: 0 },
      errorRetry: { maxNumRetry: 0, retryDelayMs: 0, maxRetryDelayMs: 0 },
    },
  },
  manifestLoadingTimeOut: 28_000,
  manifestLoadingMaxRetry: 0,
  manifestLoadingRetryDelay: 0,
  // Ongoing live-playlist polls (mid-stream) should keep retrying
  // through transient blips — only the initial manifest fast-fails.
  playlistLoadPolicy: {
    default: {
      maxTimeToFirstByteMs: 5000,
      maxLoadTimeMs: 10_000,
      timeoutRetry: { maxNumRetry: 1, retryDelayMs: 500, maxRetryDelayMs: 2000 },
      errorRetry: { maxNumRetry: 2, retryDelayMs: 500, maxRetryDelayMs: 2000 },
    },
  },
  levelLoadingTimeOut: 6000,
  levelLoadingMaxRetry: 2,
  levelLoadingRetryDelay: 500,
  fragLoadingTimeOut: 12000,
  fragLoadingMaxRetry: 3,
  fragLoadingRetryDelay: 500,
  // Auto-recover from minor network blips without going through the
  // full error UI; only fatal errors after recovery attempts bubble up.
  nudgeMaxRetry: 5,
};

export function HlsPlayer({
  src,
  poster,
  className,
  onFatalError,
  onPlaying,
  onReloadRequest,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setPhase("loading");
    setErrorDetail(null);

    // Player selection. hls.js is far more reliable than browser-native
    // HLS on every browser EXCEPT desktop / mobile Safari (and iOS, full
    // stop — iOS WebKit blocks MSE entirely). Microsoft Edge on Windows
    // also reports canPlayType("application/vnd.apple.mpegurl") as
    // truthy because of their Streams integration, but its native HLS
    // implementation flakes on unbranded streams like the ones we
    // proxy — falling through to native there caused the "Native
    // player failed" we're seeing in production. So: hls.js whenever
    // it's supported, native HLS only as a last resort for Safari.
    const ua = navigator.userAgent;
    const isAppleSafari =
      /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua) ||
      /iPhone|iPad|iPod/.test(ua);

    if (Hls.isSupported() && !isAppleSafari) {
      const hls = new Hls(HLS_CONFIG);
      hlsRef.current = hls;

      // Wall-clock safety net: if MANIFEST_PARSED hasn't fired and
      // hls.js hasn't fired an ERROR either, force-fire onFatal
      // ourselves. Set BEYOND the hls.js maxLoadTimeMs so a slow-but-
      // working upstream (the streamed.pk admin/echo/delta cold-start
      // can be 4-15s) gets a real chance before we bail. 22s is the
      // sweet spot: long enough to swallow that, short enough that
      // truly dead sources don't keep the user staring at a spinner.
      const manifestDeadline = setTimeout(() => {
        if (!hlsRef.current) return;
        setPhase("error");
        setErrorDetail("Manifest load timed out");
        onFatalError?.({ type: "wallclock", details: "manifest-timeout" });
        if (typeof window !== "undefined") {
          const trace = (window as unknown as { __hlsTrace?: string[] })
            .__hlsTrace;
          trace?.push("WALLCLOCK_TIMEOUT");
        }
      }, 30_000);
      hls.on(Hls.Events.MANIFEST_PARSED, () => clearTimeout(manifestDeadline));
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) clearTimeout(manifestDeadline);
      });

      // Validation hook — the e2e player test (scripts/validate-player.mjs)
      // reads this to see exactly which hls.js phase the player gets
      // stuck on. Cheap and harmless in production.
      if (typeof window !== "undefined") {
        (window as unknown as { __hlsTrace?: string[] }).__hlsTrace = [];
        const trace = (window as unknown as { __hlsTrace: string[] }).__hlsTrace;
        const T = (e: string, extra?: unknown) => {
          trace.push(extra === undefined ? e : `${e}:${JSON.stringify(extra)}`);
        };
        hls.on(Hls.Events.MEDIA_ATTACHED, () => T("MEDIA_ATTACHED"));
        hls.on(Hls.Events.MANIFEST_LOADING, () => T("MANIFEST_LOADING"));
        hls.on(Hls.Events.MANIFEST_LOADED, () => T("MANIFEST_LOADED"));
        hls.on(Hls.Events.MANIFEST_PARSED, (_e, d) =>
          T("MANIFEST_PARSED", { levels: d.levels?.length ?? null }),
        );
        hls.on(Hls.Events.LEVEL_LOADED, (_e, d) =>
          T("LEVEL_LOADED", {
            details: d.details?.fragments?.length ?? null,
            live: d.details?.live,
          }),
        );
        hls.on(Hls.Events.FRAG_LOADING, (_e, d) =>
          T("FRAG_LOADING", { sn: d.frag.sn, url: d.frag.url.slice(0, 60) }),
        );
        hls.on(Hls.Events.FRAG_LOADED, (_e, d) =>
          T("FRAG_LOADED", { sn: d.frag.sn }),
        );
        hls.on(Hls.Events.BUFFER_APPENDED, () => T("BUFFER_APPENDED"));
      }

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setPhase("ready");
      });

      let recoverAttempts = 0;
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (typeof window !== "undefined") {
          const trace = (window as unknown as { __hlsTrace?: string[] })
            .__hlsTrace;
          trace?.push(
            `ERROR:${data.fatal ? "FATAL " : ""}${data.type}/${data.details}`,
          );
        }
        if (!data.fatal) return;

        // Read the upstream HTTP status if hls.js exposed it.
        // - .response.code is set in recent hls.js versions
        // - .networkDetails.status is the XHR (older / Worker path)
        const upstreamStatus =
          (data as { response?: { code?: number } }).response?.code ??
          (data as { networkDetails?: { status?: number } })
            .networkDetails?.status ??
          0;
        // Manifest-stage failures don't recover via hls.startLoad() — by
        // then hls.js has already done its own internal retries
        // (manifestLoadingMaxRetry=2). Looping again here just burns
        // time the user could spend on a different server. So if the
        // failure is at the manifest stage, OR our proxy explicitly
        // signaled a permanent error (5xx / 404), give up immediately
        // and let the overlay's auto-fallback move on.
        const detailStr = typeof data.details === "string" ? data.details : "";
        const isManifestStage = detailStr.toLowerCase().startsWith("manifest");
        const isPermanent =
          upstreamStatus >= 500 || upstreamStatus === 404 || isManifestStage;

        if (
          !isPermanent &&
          data.type === Hls.ErrorTypes.NETWORK_ERROR &&
          recoverAttempts < 2
        ) {
          recoverAttempts++;
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recoverAttempts < 2) {
          recoverAttempts++;
          hls.recoverMediaError();
          return;
        }
        setPhase("error");
        setErrorDetail(
          isPermanent
            ? upstreamStatus
              ? `Upstream ${upstreamStatus}: source unavailable`
              : `${detailStr || data.type}`
            : `${data.type}${detailStr ? ` · ${detailStr}` : ""}`,
        );
        onFatalError?.({ type: data.type, details: detailStr });
      });

      return () => {
        clearTimeout(manifestDeadline);
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (isAppleSafari && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      const onLoaded = () => setPhase("ready");
      const onErr = () => {
        setPhase("error");
        setErrorDetail("Safari native HLS failed");
        onFatalError?.({ type: "native", details: "loadedmetadata error" });
      };
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      video.addEventListener("error", onErr, { once: true });
      return () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onErr);
        video.removeAttribute("src");
        video.load();
      };
    }

    setPhase("error");
    setErrorDetail("HLS is not supported in this browser.");
  }, [src, onFatalError]);

  // Browsers gate autoplay-with-sound behind a user gesture. Start muted
  // (always allowed), and offer a one-click unmute.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => onPlaying?.();
    video.addEventListener("playing", onPlay, { once: true });
    return () => video.removeEventListener("playing", onPlay);
  }, [onPlaying]);

  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    setMuted(false);
  };

  return (
    <div className={`relative h-full w-full bg-black ${className ?? ""}`}>
      <video
        ref={videoRef}
        poster={poster ?? undefined}
        autoPlay
        muted
        playsInline
        controls
        // The page header above the player already surfaces the match
        // title; the browser's built-in PiP button uses the document
        // title, so set it short.
        className="block h-full w-full bg-black"
      />

      {phase === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="flex items-center gap-2 text-sm text-zinc-200">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
            Loading stream…
          </div>
        </div>
      )}

      {phase === "ready" && muted && (
        <button
          type="button"
          onClick={handleUnmute}
          className="absolute right-3 top-3 z-10 rounded-md bg-black/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black"
        >
          Tap to unmute
        </button>
      )}

      {phase === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center">
          <p className="text-sm text-red-400">Stream unavailable.</p>
          {errorDetail ? (
            <p className="text-xs text-zinc-500">{errorDetail}</p>
          ) : null}
          {onReloadRequest ? (
            <button
              type="button"
              onClick={onReloadRequest}
              className="mt-1 rounded-md bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-400"
            >
              Reload stream
            </button>
          ) : null}
          <p className="text-[11px] text-zinc-600">
            Or pick another server below.
          </p>
        </div>
      )}
    </div>
  );
}
