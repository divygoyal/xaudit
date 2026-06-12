"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

type HlsPlayerProps = {
  src: string;
  poster?: string | null;
  className?: string;
  onFatalError?: (err: { type: string; details: string }) => void;
  onPlaying?: () => void;
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
  manifestLoadingTimeOut: 5000,
  manifestLoadingMaxRetry: 2,
  manifestLoadingRetryDelay: 500,
  levelLoadingTimeOut: 5000,
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

    // Safari (iOS, macOS) supports HLS natively and is significantly
    // faster than hls.js — let the browser handle it whenever it can.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      const onLoaded = () => {
        setPhase("ready");
      };
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      const onErr = () => {
        setPhase("error");
        setErrorDetail("Native player failed");
        onFatalError?.({ type: "native", details: "loadedmetadata error" });
      };
      video.addEventListener("error", onErr, { once: true });
      return () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onErr);
        video.removeAttribute("src");
        video.load();
      };
    }

    if (!Hls.isSupported()) {
      setPhase("error");
      setErrorDetail("HLS is not supported in this browser.");
      return;
    }

    const hls = new Hls(HLS_CONFIG);
    hlsRef.current = hls;
    hls.loadSource(src);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setPhase("ready");
    });

    let recoverAttempts = 0;
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR && recoverAttempts < 2) {
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
      setErrorDetail(data.details ?? data.type);
      onFatalError?.({ type: data.type, details: data.details ?? "" });
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 px-6 text-center">
          <p className="text-sm text-red-400">Stream unavailable.</p>
          {errorDetail ? (
            <p className="text-xs text-zinc-500">{errorDetail}</p>
          ) : null}
          <p className="text-[11px] text-zinc-600">
            Try another server below.
          </p>
        </div>
      )}
    </div>
  );
}
