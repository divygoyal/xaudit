import { createClient } from "@supabase/supabase-js";
import { ImageResponse } from "next/og";
import type { AnalysisResult, Rewrite } from "@/lib/types";

// Edge runtime — avoids the @vercel/og Node-build module-load bug that
// triggers when the project path contains a space (Windows). The Edge
// build resolves bundled assets differently and works correctly.
export const runtime = "edge";
export const alt = "letxcook · Tweet analyzed";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

let fontCache: { regular: ArrayBuffer; semibold: ArrayBuffer } | null = null;
async function loadFonts() {
  if (fontCache) return fontCache;
  const [regular, semibold] = await Promise.all([
    fetch(`${ORIGIN}/fonts/Inter-Regular.woff`).then((r) => r.arrayBuffer()),
    fetch(`${ORIGIN}/fonts/Inter-SemiBold.woff`).then((r) => r.arrayBuffer()),
  ]);
  fontCache = { regular, semibold };
  return fontCache;
}

// Brand-derived hex (CSS vars don't resolve inside Satori)
const VERMILLION = "#d63a00";
const VERMILLION_SOFT = "#ff6e23";
const MOSS = "#5d8f4d";
const CREAM = "#f7f4ec";
const CREAM_DEEP = "#efeadc";
const INK_900 = "#26231e";
const INK_300 = "#4b4840";
const INK_500 = "#8a867a";

function shorten(s: string, n: number) {
  const clean = (s ?? "").replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1).trim() + "…" : clean;
}

type Row = {
  draft_text: string;
  tweet_author: string | null;
  result: AnalysisResult;
};

async function loadRow(id: string): Promise<Row | null> {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { data, error } = await sb
      .from("analyses")
      .select("draft_text, tweet_author, result")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as Row;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { id: string } }) {
  const { regular, semibold } = await loadFonts();
  const fonts = [
    { name: "Inter", data: regular, style: "normal" as const, weight: 400 as const },
    { name: "Inter", data: semibold, style: "normal" as const, weight: 600 as const },
  ];

  const row = await loadRow(params.id);
  if (!row) {
    return new ImageResponse(<FallbackCard />, { ...size, fonts });
  }

  const primary: Rewrite | undefined =
    row.result.rewrites?.find((r) => r.is_primary) ?? row.result.rewrites?.[0];

  const beforeText = shorten(row.draft_text, 200);
  const afterText = shorten(primary?.text ?? "", 200);
  const lift = primary?.predicted_lift ?? 0;
  const author = row.tweet_author ? `@${row.tweet_author}` : "X draft";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "56px 64px",
          backgroundColor: CREAM,
          backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(214,58,0,0.10) 0%, rgba(214,58,0,0.03) 35%, transparent 65%)`,
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: VERMILLION,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                backgroundColor: VERMILLION,
              }}
            />
            letxcook · 13 signals
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 18,
              fontWeight: 600,
              color: INK_500,
            }}
          >
            {author}
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 52,
            fontWeight: 600,
            lineHeight: 1.08,
            color: INK_900,
            letterSpacing: "-0.02em",
          }}
        >
          Graded. Rewritten. Verifiable.
        </div>

        {/* Before / After cards */}
        <div
          style={{
            display: "flex",
            gap: 28,
            marginTop: 34,
            flex: 1,
          }}
        >
          {/* BEFORE */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: 24,
              borderRadius: 18,
              border: `1px solid ${VERMILLION_SOFT}30`,
              backgroundColor: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                color: VERMILLION,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: VERMILLION,
                }}
              />
              Original
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                lineHeight: 1.35,
                color: INK_300,
                textDecoration: "line-through",
                textDecorationColor: VERMILLION_SOFT,
                textDecorationThickness: 2,
              }}
            >
              {beforeText || "—"}
            </div>
          </div>

          {/* AFTER */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: 24,
              borderRadius: 18,
              border: `1px solid ${MOSS}40`,
              backgroundColor: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                color: MOSS,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: MOSS,
                }}
              />
              Rewritten
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                lineHeight: 1.35,
                color: INK_900,
              }}
            >
              {afterText || "—"}
            </div>
          </div>
        </div>

        {/* Bottom row — lift + watermark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 28,
            width: "100%",
          }}
        >
          {lift > 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 20px",
                borderRadius: 999,
                backgroundColor: MOSS,
                color: "#fff",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                boxShadow: "0 12px 28px -12px rgba(93,143,77,0.6)",
              }}
            >
              ↑ +{lift} pts predicted lift
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 18,
              fontWeight: 600,
              color: INK_500,
            }}
          >
            letxcook.com · grounded in xai-org/x-algorithm
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}

function FallbackCard() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 64,
        backgroundColor: CREAM,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: VERMILLION,
          marginBottom: 16,
        }}
      >
        letxcook
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 56,
          fontWeight: 600,
          color: INK_900,
          marginBottom: 18,
        }}
      >
        Analysis not found
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          color: INK_500,
        }}
      >
        letxcook.com · grade any X draft, free
      </div>
      <div style={{ display: "none" }}>{CREAM_DEEP}</div>
    </div>
  );
}
