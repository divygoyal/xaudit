import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// hls.js refetches a live playlist every ~half target-duration (~2s for
// the streams we see), so a short cache here both shields the upstream
// and keeps multi-viewer fan-out cheap on Vercel's edge.
export const revalidate = 2;

const ORIGIN = "https://dami-tv.pro";

type ExtractResponse = {
  success: boolean;
  hlsUrl?: string;
  source?: string;
};

const DAMI_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "*/*",
};

// Re-issue the m3u8 from dami-tv.pro/live-hls/* with a Referer they
// accept. Without a referer the upstream returns the placeholder
// `{"status":"ok","browserReady":false}` instead of a real playlist;
// with `Referer: dami-tv.pro/watch/{id}` it serves the live manifest
// straight away (verified — see "Probing dami-tv stream" experiment).
// SSRF guard. The `src` query param is only honoured if it points at
// one of these hostnames — the playlist providers we currently know
// about (dami-tv.pro's /live-hls/ proxy plus the CDN it itself proxies
// to). Without this an attacker could turn our route into an open
// fetcher.
const SRC_ALLOWED_HOST = /^[a-z0-9-]+(?:\.strmd\.st|\.streamed\.pk|\.dami-tv\.pro)$|^dami-tv\.pro$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = decodeURIComponent(params.id ?? "");
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  let hlsUrl: string | null = null;

  // Path A: caller supplied a specific upstream URL (one of the source
  // entries the /api/live/stream/[id] resolver returned). Skip the
  // extract-url roundtrip — saves ~500ms on hot paths.
  const srcParam = req.nextUrl.searchParams.get("src");
  if (srcParam) {
    try {
      const u = new URL(srcParam);
      if (u.protocol === "https:" && SRC_ALLOWED_HOST.test(u.hostname)) {
        hlsUrl = u.toString();
      }
    } catch {
      /* fall through to extract-url */
    }
  }

  // Path B: no src — go ask dami-tv.pro/papi/extract-url for the
  // current playlist URL for this match.
  if (!hlsUrl) {
    let ex: ExtractResponse | null = null;
    try {
      const exRes = await fetch(
        `${ORIGIN}/papi/extract-url/${encodeURIComponent(id)}`,
        {
          headers: {
            ...DAMI_HEADERS,
            Accept: "application/json",
            Referer: `${ORIGIN}/`,
          },
          cache: "no-store",
        },
      );
      if (exRes.ok) ex = (await exRes.json()) as ExtractResponse;
    } catch {
      /* fall through */
    }
    if (!ex?.success || !ex.hlsUrl) {
      return NextResponse.json({ error: "no_hls", id }, { status: 404 });
    }
    hlsUrl = ex.hlsUrl.startsWith("http") ? ex.hlsUrl : `${ORIGIN}${ex.hlsUrl}`;
  }

  let m3u8: Response;
  try {
    m3u8 = await fetch(hlsUrl, {
      headers: { ...DAMI_HEADERS, Referer: `${ORIGIN}/watch/${id}` },
      cache: "no-store",
    });
  } catch (e) {
    return NextResponse.json(
      { error: "fetch_failed", message: (e as Error).message },
      { status: 502 },
    );
  }
  if (!m3u8.ok) {
    return NextResponse.json(
      { error: "upstream_status", status: m3u8.status },
      { status: 502 },
    );
  }

  const body = await m3u8.text();

  // Defensive: detect the warmup placeholder and surface it as a 503
  // rather than handing hls.js something it'll choke on.
  if (
    !body.startsWith("#EXTM3U") &&
    (body.includes("browserReady") || body.includes('"status"'))
  ) {
    return NextResponse.json({ error: "not_ready" }, { status: 503 });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Cache-Control":
        "public, s-maxage=2, stale-while-revalidate=10, max-age=0",
      // hls.js fetches the playlist via XHR/fetch, so CORS matters even
      // though we're same-origin in the common case (defensive for the
      // /embed/player wrapper path).
      "Access-Control-Allow-Origin": "*",
    },
  });
}
