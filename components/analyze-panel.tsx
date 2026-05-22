"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUp,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Film,
  Heart,
  ImagePlus,
  Link2,
  Loader2,
  Lock,
  MessageCircle,
  Paperclip,
  Repeat2,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import type { AnalysisResult } from "@/lib/types";
import { RewritesGrid, StructuralCompact } from "./result-card";
import { MarkedUpDraft } from "./annotated-draft";
import { SignalStorm } from "./signal-storm";

const MAX_CHARS = 1200;

type Phase = "idle" | "analyzing" | "done";

const compactNumberFormatter =
  typeof Intl !== "undefined"
    ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
    : null;

function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (compactNumberFormatter) return compactNumberFormatter.format(n);
  return String(n);
}

function UsageBadge({ usage }: { usage: UsageInfo | null }) {
  if (!usage) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Lock size={11} />
        Free tier
      </span>
    );
  }
  if (usage.isAnon) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Lock size={11} />
        {usage.remaining > 0
          ? `${usage.remaining} free trial${usage.remaining === 1 ? "" : "s"} left`
          : "Free trial used"}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <span className="inline-flex items-center gap-1.5">
        <Lock size={11} />
        {usage.used} / {usage.limit} this month
      </span>
      {usage.bonusCredits > 0 && (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-moss/35 bg-moss/[0.08] px-1.5 py-[1px] font-mono text-[9px] uppercase tracking-[0.16em] text-moss"
          title="Bonus credits from referrals. Spent only after your monthly free tier is used."
        >
          +{usage.bonusCredits} bonus
        </span>
      )}
    </span>
  );
}

function GateCallout({
  gate,
  usage,
}: {
  gate: "anon" | "free";
  usage: UsageInfo | null;
}) {
  const isAnon = gate === "anon";
  return (
    <div className="rounded-[10px] border border-vermillion/40 bg-vermillion/[0.06] px-3.5 py-3 text-center">
      <div className="font-sans text-[13px] font-medium text-paper">
        {isAnon
          ? "You've used your free trial."
          : `You've used all ${usage?.limit ?? 3} free analyses this month.`}
      </div>
      <p className="mt-1 text-[11.5px] leading-snug text-ink-300">
        {isAnon
          ? "Sign in for 3 free analyses every month — no card required."
          : "Upgrade to keep grading. (Stripe wiring coming.)"}
      </p>
      <Link
        href={isAnon ? "/login?next=%2F%23analyze" : "#pricing"}
        className="group mt-3 inline-flex items-center gap-1.5 rounded-full bg-vermillion px-5 py-2 font-mono text-[11.5px] font-semibold uppercase tracking-[0.18em] text-paper-warm shadow-[0_14px_30px_-16px_rgba(214,58,0,0.55)] transition hover:bg-vermillion-soft"
      >
        {isAnon ? "Sign in free" : "Upgrade"}
        <ArrowUp size={11} strokeWidth={2.6} className="rotate-45 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

// X usernames are 1-15 chars alphanumeric + underscore. Anything else
// shouldn't make it into a clean URL — fall back to /v/{id}.
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

function buildShareUrl(
  origin: string,
  shareId: string,
  tweetAuthor: string | null
) {
  // Clean canonical URL — author handle when known, /v/ fallback otherwise.
  // No utm / ref params; sharers explicitly grab a referral link from the
  // dashboard when they want attribution credit, otherwise this stays
  // tweet-reply-friendly: short and tracker-free.
  if (tweetAuthor && HANDLE_RE.test(tweetAuthor)) {
    return `${origin}/${tweetAuthor}/${shareId}`;
  }
  return `${origin}/v/${shareId}`;
}

function ShareBar({
  shareId,
  tweetAuthor,
}: {
  shareId: string;
  tweetAuthor: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [copyUrl, setCopyUrl] = useState<string>("");
  const [tweetUrl, setTweetUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    // Both buttons use the same clean URL — no per-button utm split.
    // We lose source attribution but gain a URL that fits in a tweet
    // reply without looking like a tracking pixel.
    const url = buildShareUrl(origin, shareId, tweetAuthor);
    setCopyUrl(url);
    setTweetUrl(url);
  }, [shareId, tweetAuthor]);

  const copy = async () => {
    if (!copyUrl) return;
    try {
      await navigator.clipboard.writeText(copyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop
    }
  };

  const tweetIntent = tweetUrl
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent("Just audited a tweet with letxcook — 13 ranker signals, every recommendation verifiable in the open repo.")}&url=${encodeURIComponent(tweetUrl)}`
    : "#";

  // Display URL — show the user the `direct` flavor (cleaner).
  const shareUrl = copyUrl;

  return (
    <div className="mx-auto mt-7 max-w-7xl px-6 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-vermillion/30 bg-vermillion/[0.04] px-4 py-3 shadow-[0_18px_38px_-26px_rgba(214,58,0,0.35)]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-vermillion/15">
            <Share2 size={13} className="text-vermillion-glow" strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-vermillion-glow">
              Comparison ready
            </div>
            <div className="mt-0.5 truncate font-mono text-[12px] text-ink-200">
              {shareUrl || "Preparing share link…"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copy}
            disabled={!shareUrl}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-950/70 px-3.5 py-1.5 text-[12px] font-medium text-paper transition hover:border-vermillion/45 hover:text-vermillion-glow disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check size={12} strokeWidth={2.6} className="text-moss" />
                Copied
              </>
            ) : (
              <>
                <Copy size={12} strokeWidth={2.4} />
                Copy link
              </>
            )}
          </button>
          <a
            href={tweetIntent}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-full bg-vermillion px-3.5 py-1.5 text-[12px] font-medium text-paper-warm transition hover:bg-vermillion-soft ${
              !shareUrl ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <Share2 size={12} strokeWidth={2.6} />
            Share on X
          </a>
        </div>
      </div>
    </div>
  );
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function summarizeFetchedMedia(
  media: { type: "image" | "video"; durationSec?: number }[]
): string {
  const videos = media.filter((m) => m.type === "video");
  const images = media.filter((m) => m.type === "image");
  const parts: string[] = [];
  if (videos.length) {
    const totalSec = videos.reduce((s, v) => s + (v.durationSec ?? 0), 0);
    const dur = totalSec > 0 ? ` ${formatDuration(totalSec)}` : "";
    parts.push(`${videos.length === 1 ? "Video" : `${videos.length} videos`}${dur}`);
  }
  if (images.length) {
    parts.push(images.length === 1 ? "Image" : `${images.length} images`);
  }
  return parts.join(" + ");
}

type FetchedMedia = { type: "image" | "video"; durationSec?: number };

type FetchedFrom = {
  screen_name: string;
  name: string;
  likes: number;
  replies: number;
  reposts: number;
  views: number;
  media: FetchedMedia[];
};

type UsageInfo = {
  used: number;
  limit: number;
  bonusCredits: number;
  remaining: number;
  isAnon: boolean;
};

type CurrentUser = { id: string; email: string | null } | null;

export function AnalyzePanel() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ base64: string; mediaType: string; preview: string } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftAtSubmit, setDraftAtSubmit] = useState("");
  const [url, setUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [fetchedFrom, setFetchedFrom] = useState<FetchedFrom | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [gateHit, setGateHit] = useState<"anon" | "free" | null>(null);
  // Set true after a successful fetch — a downstream effect auto-fires
  // the grade flow once text state has settled. Folds the user's Fetch +
  // Grade into a single click (and makes the URL-hack one-shot).
  const [autoGradeAfterFetch, setAutoGradeAfterFetch] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);

  // When grading starts, scroll the processing engine into view so the user
  // doesn't have to hunt for the loader below the fold. Runs after the
  // SignalStorm element actually mounts (useEffect fires post-render).
  useEffect(() => {
    if (phase !== "analyzing") return;
    const el = resultsAnchorRef.current;
    if (!el) return;
    // rAF lets the element finish painting before we measure scroll position.
    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [phase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/usage");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        if (json?.usage) setUsage(json.usage as UsageInfo);
        if (json?.user) setCurrentUser(json.user as CurrentUser);
      } catch {
        // silent — usage display just stays empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchTweet = useCallback(async (urlOverride?: string) => {
    const trimmed = (urlOverride ?? url).trim();
    if (!trimmed) {
      setError("Paste an X post URL first.");
      return;
    }
    setError(null);
    setIsFetching(true);
    try {
      const res = await fetch("/api/fetch-tweet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Couldn't fetch that post.");
        setIsFetching(false);
        return;
      }
      const t = json.tweet as {
        text: string;
        author: { screen_name: string; name: string };
        media?: { type: "image" | "video"; durationSec?: number }[];
        metrics: { likes: number; replies: number; reposts: number; views: number };
      };
      setText(t.text);
      setFetchedFrom({
        screen_name: t.author.screen_name,
        name: t.author.name,
        likes: t.metrics.likes,
        replies: t.metrics.replies,
        reposts: t.metrics.reposts,
        views: t.metrics.views,
        media: (t.media ?? []).map((m) => ({
          type: m.type,
          durationSec: m.durationSec,
        })),
      });
      setIsFetching(false);
      // Single-click flow: trigger the grade after the text state has
      // settled in the next render (a useEffect picks this up).
      setAutoGradeAfterFetch(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
      setIsFetching(false);
    }
  }, [url]);

  // Pre-fill from query params (browser extension + URL-hack catch-all):
  //   ?tweet=<x-url>  → fills URL field AND auto-fetches the post
  //   ?text=<draft>   → fills the textarea directly (compose-page draft)
  //   ?compose=1      → scroll to the analyzer + focus the textarea
  //                     (lets users coming from `letxcook.com/compose/post`
  //                     land ready to type instead of staring at a blank
  //                     panel that looks like nothing happened)
  const searchParams = useSearchParams();
  useEffect(() => {
    const tweetParam = searchParams.get("tweet");
    if (tweetParam && !url) {
      setUrl(tweetParam);
      // Auto-fetch so the catch-all URL-hack (letxcook.com/user/status/id)
      // lands the user on a fully-loaded analyzer, not a blank URL field.
      void fetchTweet(tweetParam);
    }
    const textParam = searchParams.get("text");
    if (textParam && !text) {
      setText(textParam);
    }
    if (searchParams.get("compose") === "1") {
      // Give the page a tick to lay out before scrolling + focusing —
      // hash navigation has already triggered a jump, but we want a
      // smooth scroll AND focus the textarea so the caret is blinking
      // when the user arrives.
      const timeoutId = window.setTimeout(() => {
        const section = document.getElementById("analyze");
        section?.scrollIntoView({ behavior: "smooth", block: "start" });
        const textarea = document.getElementById("draft");
        if (textarea instanceof HTMLTextAreaElement) textarea.focus();
      }, 180);
      return () => window.clearTimeout(timeoutId);
    }
    // intentionally not depending on url/text — only run on the initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please attach an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image is over 10MB. Try a smaller one.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [meta, b64] = dataUrl.split(",");
      const mediaType = meta.match(/data:(image\/[a-z]+)/)?.[1] ?? "image/png";
      setImage({ base64: b64, mediaType, preview: dataUrl });
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const submit = useCallback(async () => {
    if (phase === "analyzing") return;
    if (!text.trim() && !image) {
      setError("Paste a draft or attach a screenshot first.");
      return;
    }
    setError(null);
    setResult(null);
    setShareId(null);
    setDraftAtSubmit(text.trim());
    setPhase("analyzing");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          imageBase64: image?.base64,
          imageMediaType: image?.mediaType,
          media: fetchedFrom?.media ?? [],
          tweetUrl: url.trim() || undefined,
          tweetAuthor: fetchedFrom?.screen_name,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 402 && json?.usage) {
          setUsage(json.usage as UsageInfo);
          setGateHit((json.gate as "anon" | "free") ?? "free");
        }
        setError(json.error ?? "Something went wrong.");
        setPhase("idle");
        return;
      }
      const { share_id, usage: respUsage, ...rest } = json as AnalysisResult & {
        share_id?: string;
        usage?: UsageInfo;
      };
      setResult(rest as AnalysisResult);
      if (share_id) setShareId(share_id);
      if (respUsage) setUsage(respUsage);
      setGateHit(null);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
      setPhase("idle");
    }
  }, [text, image, phase, fetchedFrom, url]);

  // Single-click flow: after a successful fetch, fire the grade once the
  // text state has propagated and we're not already running something.
  // Flag flips false immediately so a follow-up state change can't double-fire.
  useEffect(() => {
    if (!autoGradeAfterFetch) return;
    if (!text.trim()) return;
    if (phase !== "idle" || isFetching) return;
    setAutoGradeAfterFetch(false);
    void submit();
  }, [autoGradeAfterFetch, text, phase, isFetching, submit]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    },
    [submit]
  );

  const reset = () => {
    setText("");
    setImage(null);
    setResult(null);
    setError(null);
    setPhase("idle");
    setUrl("");
    setFetchedFrom(null);
    setShareId(null);
  };

  const isLoading = phase === "analyzing";

  return (
    <section id="analyze" className="relative">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-4 md:px-10">
        <div className="mx-auto max-w-[560px]">
          {/* URL-hack tip — sits above the draft input card so users see the
              trick at the exact moment they're about to paste something */}
          <div className="mx-auto mb-4 flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-vermillion/35 bg-vermillion/[0.06] px-3.5 py-1.5 text-[11.5px] text-ink-200 backdrop-blur">
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-vermillion-glow">
              URL trick
            </span>
            <span className="text-ink-600">·</span>
            <span>
              swap{" "}
              <code className="rounded bg-ink-900/70 px-1.5 py-0.5 font-mono text-[11px] text-paper">
                x.com
              </code>{" "}
              with{" "}
              <code className="rounded bg-vermillion/15 px-1.5 py-0.5 font-mono text-[11px] text-vermillion-glow">
                letxcook.com
              </code>{" "}
              on any post
            </span>
          </div>
          <InputCard
            text={text}
            setText={setText}
            image={image}
            setImage={setImage}
            onSubmit={submit}
            onKeyDown={onKeyDown}
            onDrop={onDrop}
            isLoading={isLoading}
            fileRef={fileRef}
            handleFile={handleFile}
            reset={reset}
            url={url}
            setUrl={setUrl}
            fetchTweet={fetchTweet}
            isFetching={isFetching}
            fetchedFrom={fetchedFrom}
            clearFetched={() => setFetchedFrom(null)}
            usage={usage}
            gateHit={gateHit}
          />
          {error && (
            <div className="mt-3 rounded-lg border border-rust/40 bg-rust/10 px-3.5 py-2.5 text-[12.5px] text-rust">
              {error}
            </div>
          )}
        </div>

        {/* ────────── BELOW WORKSHOP — loader, then result sections ────────── */}
        {/* Anchor div: when grading starts we smooth-scroll this into view
            so the processing engine lands at the top of the viewport. The
            scroll-mt-* class gives it breathing room below the navbar. */}
        <div ref={resultsAnchorRef} className="scroll-mt-6 md:scroll-mt-10">
          {phase === "analyzing" && (
            <div className="mx-auto max-w-6xl">
              <SignalStorm draftText={draftAtSubmit || text || "Your draft"} />
            </div>
          )}
          {phase === "done" && result && (
            <div className="cockpit-enter">
              {shareId && (
                <ShareBar
                  shareId={shareId}
                  tweetAuthor={fetchedFrom?.screen_name ?? null}
                />
              )}
              <RewritesGrid result={result} draftText={draftAtSubmit} />
              <MarkedUpDraft result={result} draftText={draftAtSubmit} />
              <StructuralCompact result={result} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// INPUT CARD
// ─────────────────────────────────────────────────────────────

function InputCard({
  text,
  setText,
  image,
  setImage,
  onSubmit,
  onKeyDown,
  onDrop,
  isLoading,
  fileRef,
  handleFile,
  reset,
  url,
  setUrl,
  fetchTweet,
  isFetching,
  fetchedFrom,
  clearFetched,
  usage,
  gateHit,
}: {
  text: string;
  setText: (v: string) => void;
  image: { base64: string; mediaType: string; preview: string } | null;
  setImage: (v: { base64: string; mediaType: string; preview: string } | null) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  isLoading: boolean;
  fileRef: React.RefObject<HTMLInputElement>;
  handleFile: (file: File) => void;
  reset: () => void;
  url: string;
  setUrl: (v: string) => void;
  fetchTweet: () => void;
  isFetching: boolean;
  fetchedFrom: FetchedFrom | null;
  clearFetched: () => void;
  usage: UsageInfo | null;
  gateHit: "anon" | "free" | null;
}) {
  const draftRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <>
      <div
        className="relative overflow-hidden rounded-[20px] border border-ink-700 bg-ink-950/88 shadow-[0_22px_58px_-34px_rgba(75,40,15,0.30),0_3px_14px_-12px_rgba(19,17,14,0.15),inset_0_1px_0_rgba(255,255,255,0.78)]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <div className="flex items-center justify-between border-b border-ink-700/60 bg-ink-900/28 px-4 py-3">
          <div className="flex items-center gap-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-vermillion/8">
              <span className="h-2 w-2 rounded-full bg-vermillion" />
            </span>
            Your draft
          </div>
          <div className="rounded-full bg-ink-900/45 px-2.5 py-0.5 font-mono text-[10px] text-ink-400">
            <span className={text.length > MAX_CHARS ? "text-rust" : ""}>{text.length}</span>
            <span className="text-ink-600"> / {MAX_CHARS}</span>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <div className="px-4 pb-4 pt-3.5">
          <div className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-ink-700/70 bg-ink-950/62">
            <button
              type="button"
              onClick={() => draftRef.current?.focus()}
              className="flex items-center justify-center gap-1.5 border-r border-ink-700/50 bg-ink-950 px-2 py-2.5 text-[11px] font-medium text-vermillion transition hover:bg-vermillion/[0.04]"
            >
              <FileText size={14} strokeWidth={2.2} />
              <span className="hidden sm:inline">Paste draft</span>
              <span className="sm:hidden">Paste</span>
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-medium text-ink-300 transition hover:bg-ink-900/45 hover:text-paper"
            >
              <ImagePlus size={14} strokeWidth={2.1} />
              <span className="hidden sm:inline">Drop screenshot</span>
              <span className="sm:hidden">Image</span>
            </button>
          </div>

          {/* URL input row */}
          <div className="mt-3 flex items-center gap-1.5 rounded-[10px] border border-ink-700/70 bg-ink-950/62 px-1.5 py-1 transition focus-within:border-vermillion/40">
            <Link2 size={14} strokeWidth={2.1} className="ml-2 shrink-0 text-ink-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  fetchTweet();
                }
              }}
              placeholder="Or paste an X post URL — x.com/user/status/123…"
              className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-[12.5px] text-paper placeholder:text-ink-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => fetchTweet()}
              disabled={isFetching || !url.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] bg-vermillion/10 px-3 py-1.5 text-[11px] font-medium text-vermillion-glow transition hover:bg-vermillion/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFetching ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <ArrowDownToLine size={11} strokeWidth={2.4} />
              )}
              Fetch
            </button>
          </div>

          {fetchedFrom && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-[9px] border border-moss/25 bg-moss/[0.05] px-3 py-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px]">
                <CheckCircle2 size={12} strokeWidth={2.4} className="shrink-0 text-moss" />
                <span className="text-ink-300">Fetched from</span>
                <span className="truncate font-medium text-paper">@{fetchedFrom.screen_name}</span>
                <span className="text-ink-600">·</span>
                <span className="inline-flex items-center gap-1 text-ink-400">
                  <Heart size={10} strokeWidth={2.2} /> {formatCount(fetchedFrom.likes)}
                </span>
                <span className="inline-flex items-center gap-1 text-ink-400">
                  <MessageCircle size={10} strokeWidth={2.2} /> {formatCount(fetchedFrom.replies)}
                </span>
                <span className="inline-flex items-center gap-1 text-ink-400">
                  <Repeat2 size={10} strokeWidth={2.2} /> {formatCount(fetchedFrom.reposts)}
                </span>
                {fetchedFrom.views > 0 && (
                  <span className="text-ink-500">· {formatCount(fetchedFrom.views)} views</span>
                )}
                {fetchedFrom.media.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-vermillion/30 bg-vermillion/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-vermillion-glow">
                    <Film size={9} strokeWidth={2.4} />
                    {summarizeFetchedMedia(fetchedFrom.media)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={clearFetched}
                className="shrink-0 rounded p-0.5 text-ink-400 transition hover:bg-ink-800 hover:text-paper"
                aria-label="Clear fetched indicator"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <div
            className="draft-field relative mt-3 overflow-hidden rounded-[11px] border border-dashed border-ink-700/85 bg-ink-950/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.48)] transition-colors focus-within:border-vermillion/55 focus-within:bg-ink-950/72"
            onClick={() => draftRef.current?.focus()}
          >
            <label htmlFor="draft" className="sr-only">
              Your X draft
            </label>
            <textarea
              ref={draftRef}
              id="draft"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={"Paste your X draft here.\n\nOr drop a screenshot anywhere on this card."}
              maxLength={MAX_CHARS + 200}
              rows={6}
              className="block w-full resize-none bg-transparent p-4 text-[14px] leading-relaxed text-paper placeholder:text-ink-400 focus:outline-none"
            />

            {image && (
              <div className="absolute bottom-4 left-4 z-20 inline-flex max-w-[calc(100%-2rem)] items-center gap-2.5 rounded-[9px] border border-ink-700 bg-ink-950/92 p-1.5 pr-2.5 shadow-[0_16px_36px_-26px_rgba(0,0,0,0.45)]">
                <img
                  src={image.preview}
                  alt="Attached screenshot"
                  className="h-10 w-10 rounded-[6px] object-cover"
                />
                <span className="truncate font-mono text-[12px] text-ink-200">
                  screenshot.{image.mediaType.split("/")[1]}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImage(null);
                  }}
                  className="rounded p-1 text-ink-400 transition hover:bg-ink-800 hover:text-paper"
                  aria-label="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

        </div>

        <div className="flex flex-col gap-3 border-t border-ink-700/60 bg-ink-900/25 px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-950/80 px-3 py-1.5 text-[11px] text-ink-200 transition hover:border-ink-500 hover:text-paper"
            >
              <Paperclip size={12} />
              Screenshot
            </button>
            {(text || image) && (
              <button
                type="button"
                onClick={reset}
                className="px-1 text-[11px] text-ink-400 transition hover:text-paper"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-ink-400">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={11} className="text-vermillion" />
                13 signals
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={11} />
                ~2 sec
              </span>
              <UsageBadge usage={usage} />
            </div>

            {gateHit ? (
              <GateCallout gate={gateHit} usage={usage} />
            ) : (
              <Button onClick={onSubmit} disabled={isLoading} className="w-full px-5 py-2.5 text-[12.5px] shadow-[0_16px_34px_-18px_rgba(0,0,0,0.55)]">
                {isLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Grading...
                  </>
                ) : (
                  <>
                    Grade my post
                    <ArrowUp size={13} className="rotate-45" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute -top-px left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-vermillion/35 to-transparent"
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-center text-[11px] text-ink-400">
        <Lock size={12} strokeWidth={2} />
        <span>Private by default. Drafts are never stored after grading.</span>
      </div>
    </>
  );
}

/*
 * The analyzer now intentionally has no right-side placeholder card.
 * Results render below the centered draft card after grading.
 */
