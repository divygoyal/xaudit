import { NextResponse } from "next/server";
import { parseTwitterUrl, type TwitterUrlParts } from "@/lib/twitter-url";

export const runtime = "nodejs";
export const maxDuration = 15;

type IncomingBody = { url?: string };

export type FetchedTweet = {
  text: string;
  author: { screen_name: string; name: string };
  media: { type: "image" | "video"; url: string; durationSec?: number }[];
  metrics: { likes: number; replies: number; reposts: number; views: number };
  source: "fxtwitter" | "vxtwitter";
};

// Process-local cache. Resets on cold-start; fine for typical app traffic
// because the same tweet rarely needs re-fetching within an hour.
const cache = new Map<string, { tweet: FetchedTweet; expires: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  let body: IncomingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ error: "Missing X post URL." }, { status: 400 });
  }

  const parts = parseTwitterUrl(url);
  if (!parts) {
    return NextResponse.json(
      { error: "That doesn't look like an X / Twitter post URL." },
      { status: 400 }
    );
  }

  const cached = cache.get(parts.tweetId);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ tweet: cached.tweet, cached: true });
  }

  let tweet: FetchedTweet | null = null;
  try {
    tweet = await fetchViaFxTwitter(parts);
  } catch {
    // fall through to vxtwitter
  }
  if (!tweet) {
    try {
      tweet = await fetchViaVxTwitter(parts);
    } catch {
      // fall through to error response
    }
  }

  if (!tweet) {
    return NextResponse.json(
      {
        error:
          "Couldn't fetch that post. It may be deleted, private, or the proxy services are temporarily down. Paste the text manually instead.",
      },
      { status: 502 }
    );
  }

  cache.set(parts.tweetId, { tweet, expires: Date.now() + CACHE_TTL_MS });
  return NextResponse.json({ tweet, cached: false });
}

// ─────────────────────────────────────────────────────────────
// fxtwitter — primary
// Schema: { code: 200, tweet: { text, author: {screen_name, name},
//   media: { all: [{type, url}] }, likes, replies, retweets, views } }
// ─────────────────────────────────────────────────────────────

async function fetchViaFxTwitter(parts: TwitterUrlParts): Promise<FetchedTweet | null> {
  const res = await fetch(
    `https://api.fxtwitter.com/${parts.username}/status/${parts.tweetId}`,
    { headers: { "User-Agent": "letxcook/1.0 (fetch-tweet)" } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    code?: number;
    tweet?: {
      text?: string;
      author?: { screen_name?: string; name?: string };
      media?: {
        all?: { type?: string; url?: string; duration?: number }[];
      };
      likes?: number;
      replies?: number;
      retweets?: number;
      views?: number;
    };
  };
  if (data.code !== 200 || !data.tweet) return null;
  const t = data.tweet;

  const media = (t.media?.all ?? [])
    .map((m) => ({
      type: m.type === "video" ? ("video" as const) : ("image" as const),
      url: m.url ?? "",
      durationSec: typeof m.duration === "number" ? Math.round(m.duration) : undefined,
    }))
    .filter((m) => m.url);

  return {
    text: t.text ?? "",
    author: {
      screen_name: t.author?.screen_name ?? parts.username,
      name: t.author?.name ?? "",
    },
    media,
    metrics: {
      likes: t.likes ?? 0,
      replies: t.replies ?? 0,
      reposts: t.retweets ?? 0,
      views: t.views ?? 0,
    },
    source: "fxtwitter",
  };
}

// ─────────────────────────────────────────────────────────────
// vxtwitter — fallback
// Schema: { text, user_screen_name, user_name, mediaURLs, media_extended,
//   likes, replies, retweets } (no views field, no top-level code)
// ─────────────────────────────────────────────────────────────

async function fetchViaVxTwitter(parts: TwitterUrlParts): Promise<FetchedTweet | null> {
  const res = await fetch(
    `https://api.vxtwitter.com/${parts.username}/status/${parts.tweetId}`,
    { headers: { "User-Agent": "letxcook/1.0 (fetch-tweet)" } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    text?: string;
    user_screen_name?: string;
    user_name?: string;
    media_extended?: { type?: string; url?: string; duration_millis?: number }[];
    likes?: number;
    replies?: number;
    retweets?: number;
  };
  if (!data.text) return null;

  const media = (data.media_extended ?? [])
    .map((m) => ({
      type: m.type === "video" ? ("video" as const) : ("image" as const),
      url: m.url ?? "",
      durationSec:
        typeof m.duration_millis === "number"
          ? Math.round(m.duration_millis / 1000)
          : undefined,
    }))
    .filter((m) => m.url);

  return {
    text: data.text,
    author: {
      screen_name: data.user_screen_name ?? parts.username,
      name: data.user_name ?? "",
    },
    media,
    metrics: {
      likes: data.likes ?? 0,
      replies: data.replies ?? 0,
      reposts: data.retweets ?? 0,
      views: 0,
    },
    source: "vxtwitter",
  };
}
