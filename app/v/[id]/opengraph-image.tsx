import { createClient } from "@supabase/supabase-js";
import { ImageResponse } from "next/og";
import { computeScore } from "@/lib/score";
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

// ─────────────────────────────────────────────────────────────
// Brand palette — Satori can't read CSS vars, so dark-theme hexes
// from globals.css are inlined here.
// ─────────────────────────────────────────────────────────────
const INK_950 = "#0C0B09";
const INK_900 = "#13110E";
const INK_800 = "#1A1814";
const INK_700 = "#26241F";
const INK_500 = "#5A5648";
const INK_400 = "#7D7866";
const INK_300 = "#9B9789";
const INK_200 = "#BDB9AA";
const PAPER = "#F6F3E9";
const PAPER_WARM = "#F4ECD8";
const VERMILLION = "#FF4500";
const VERMILLION_GLOW = "#FF8A4D";
const MOSS = "#7FB069";
const MOSS_GLOW = "#A8DC8A";
const RUST = "#C8553D";
const RUST_GLOW = "#E67356";

// ─────────────────────────────────────────────────────────────
// Font loading — Inter for body/UI, Instrument Serif Italic for the
// editorial emphasis on "perform better." in the headline.
// Cached at module scope across warm Edge invocations.
// ─────────────────────────────────────────────────────────────
let fontCache: {
  regular: ArrayBuffer;
  semibold: ArrayBuffer;
  serifItalic: ArrayBuffer;
} | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  // All three fonts are self-hosted under /public/fonts so we stay on
  // a single same-origin fetch path. Pulling Instrument Serif from
  // raw.githubusercontent.com (the old approach) cost 1-3s on cold
  // Edge starts and occasionally failed outright, which pushed the
  // total OG image latency past X's unfurl timeout and made share
  // previews fall back to the broken-image placeholder.
  // Satori only accepts .woff and .ttf — not .woff2.
  const [regular, semibold, serifItalic] = await Promise.all([
    fetch(`${ORIGIN}/fonts/Inter-Regular.woff`).then((r) => r.arrayBuffer()),
    fetch(`${ORIGIN}/fonts/Inter-SemiBold.woff`).then((r) => r.arrayBuffer()),
    fetch(`${ORIGIN}/fonts/InstrumentSerif-Italic.ttf`).then((r) => r.arrayBuffer()),
  ]);
  fontCache = { regular, semibold, serifItalic };
  return fontCache;
}

// ─────────────────────────────────────────────────────────────
// Data loader
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Text helpers
// ─────────────────────────────────────────────────────────────

function shorten(s: string, n: number) {
  const clean = (s ?? "").replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1).trim() + "…" : clean;
}

type Seg =
  | { type: "text"; text: string }
  | { type: "mark"; text: string };

/** Word-wrap helper: break `text` into lines of <= maxChars, splitting
 *  at word boundaries. Lets us stack each "visual line" of a highlight
 *  as its own pill, mimicking the website's box-decoration-break:clone
 *  effect that Satori can't natively render. */
function wrapText(text: string, maxChars: number): string[] {
  const cleaned = (text ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const words = cleaned.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line.length === 0) {
      line = word;
    } else if (line.length + 1 + word.length <= maxChars) {
      line += " " + word;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Build a flat list of ordered text/mark segments — used for the
 *  BEFORE card, which renders inline without per-mark callouts. */
function buildSegments(text: string, phrases: string[]): Seg[] {
  // Same normalization as buildChunks — phrases stored in the analysis
  // may contain \n\n that the display text doesn't, killing the match.
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const validPhrases = phrases
    .map(norm)
    .filter((p) => p && p.length > 1 && text.includes(p))
    .sort((a, b) => b.length - a.length);
  if (validPhrases.length === 0) return [{ type: "text", text }];
  const ranges: { start: number; end: number }[] = [];
  for (const p of validPhrases) {
    const idx = text.indexOf(p);
    if (idx === -1) continue;
    const start = idx;
    const end = idx + p.length;
    const overlaps = ranges.some((r) => start < r.end && end > r.start);
    if (overlaps) continue;
    ranges.push({ start, end });
  }
  ranges.sort((a, b) => a.start - b.start);
  const segs: Seg[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) segs.push({ type: "text", text: text.slice(cursor, r.start) });
    segs.push({ type: "mark", text: text.slice(r.start, r.end) });
    cursor = r.end;
  }
  if (cursor < text.length) segs.push({ type: "text", text: text.slice(cursor) });
  return segs;
}

/** Each chunk = leading text + ONE highlighted phrase + its callout.
 *  The trailing chunk holds any text after the last edit and has no
 *  callout. This gives the AFTER card a row-per-edit structure where
 *  the right-side callouts naturally align to their phrase, and we get
 *  honest visible spacing between phrases via row margin. */
type Chunk = {
  text: string;
  highlight: string;
  callout: { label: string; index: number } | null;
};

function buildChunks(
  text: string,
  edits: Array<{ new_phrase: string; improvement_label: string }>
): Chunk[] {
  // Normalize each new_phrase the same way shorten() normalized the
  // text — collapse all whitespace (including paragraph breaks) into
  // single spaces. Otherwise a new_phrase containing "\n\n" silently
  // fails text.includes() against the cleaned-up display text, and
  // the corresponding right-side callout disappears.
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const cleaned = edits.map((e) => ({
    new_phrase: norm(e.new_phrase),
    improvement_label: e.improvement_label,
  }));
  const valid = cleaned.filter(
    (e) => e.new_phrase && e.new_phrase.length > 1 && text.includes(e.new_phrase)
  );
  const sorted = [...valid].sort(
    (a, b) => text.indexOf(a.new_phrase) - text.indexOf(b.new_phrase)
  );
  const chunks: Chunk[] = [];
  let cursor = 0;
  sorted.forEach((edit, i) => {
    const idx = text.indexOf(edit.new_phrase, cursor);
    if (idx === -1) return;
    chunks.push({
      text: text.slice(cursor, idx),
      highlight: edit.new_phrase,
      callout: {
        label: edit.improvement_label || `Edit ${i + 1}`,
        index: i + 1,
      },
    });
    cursor = idx + edit.new_phrase.length;
  });
  if (cursor < text.length) {
    chunks.push({ text: text.slice(cursor), highlight: "", callout: null });
  }
  return chunks;
}

// ─────────────────────────────────────────────────────────────
// Main image
// ─────────────────────────────────────────────────────────────

export default async function Image({ params }: { params: { id: string } }) {
  const { regular, semibold, serifItalic } = await loadFonts();
  const fonts = [
    { name: "Inter", data: regular, style: "normal" as const, weight: 400 as const },
    { name: "Inter", data: semibold, style: "normal" as const, weight: 600 as const },
    {
      name: "InstrumentSerif",
      data: serifItalic,
      style: "italic" as const,
      weight: 400 as const,
    },
  ];

  const row = await loadRow(params.id);
  if (!row) return new ImageResponse(<FallbackCard />, { ...size, fonts });

  const primary: Rewrite | undefined =
    row.result.rewrites?.find((r) => r.is_primary) ?? row.result.rewrites?.[0];

  const currentScore = computeScore(row.result);
  const lift = primary?.predicted_lift ?? 0;
  const projectedScore = Math.min(100, currentScore + lift);
  const author = row.tweet_author ?? "";

  const edits = (primary?.edits ?? []).slice(0, 3);
  const beforePhrases = edits
    .map((e) => e.original_phrase)
    .filter((p): p is string => Boolean(p));
  const afterPhrases = edits
    .map((e) => e.new_phrase)
    .filter((p): p is string => Boolean(p));

  // First weak phrase → label for the BEFORE card footer
  const firstIssue =
    row.result.positive_signals.find((s) => s.grade === "Weak" && s.fix_label)?.fix_label ??
    "Weak signal";

  const beforeText = shorten(row.draft_text, 180);
  // Longer cap on the AFTER text so the third edit (often the reply
  // trigger that lives at the end of the rewrite) gets included and
  // earns its right-side callout.
  const afterText = shorten(primary?.text ?? "", 420);
  const beforeSegs = buildSegments(beforeText, beforePhrases);
  const afterChunks = buildChunks(
    afterText,
    edits
      .filter((e) => e.new_phrase)
      .map((e) => ({
        new_phrase: e.new_phrase,
        improvement_label: e.improvement_label,
      }))
  );

  // Chip labels — derive from edits' improvement_label
  const chips = edits.map((e) => e.improvement_label || "Improvement");

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: INK_950,
          backgroundImage:
            "radial-gradient(circle at 30% 0%, rgba(255, 69, 0, 0.10), transparent 55%)",
          padding: "30px 50px",
          fontFamily: "Inter",
          color: PAPER,
        }}
      >
        {/* ── TOP BAR — wordmark with logo embedded AS the X letter.
            marginLeft matches the LEFT column below so the wordmark
            and the headline line up vertically; both shift right to
            stay inside X's mobile-preview crop. ─── */}
        <div style={{ display: "flex", alignItems: "center", marginLeft: 60 }}>
          <span
            style={{
              display: "flex",
              fontFamily: "InstrumentSerif",
              fontStyle: "italic",
              fontSize: 44,
              color: PAPER,
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            let
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ORIGIN}/logo-hero.svg`}
            width={62}
            height={62}
            alt=""
            style={{ marginLeft: -2, marginRight: -2 }}
          />
          <span
            style={{
              display: "flex",
              fontFamily: "InstrumentSerif",
              fontStyle: "italic",
              fontSize: 44,
              color: PAPER,
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            cook
          </span>
        </div>

        {/* ── MAIN ROW ────────────────────────────────────── */}
        <div style={{ display: "flex", flex: 1, gap: 28, marginTop: 22 }}>
          {/* LEFT COLUMN — shifted right ~60px to stay inside X's
              mobile-preview crop zone. width compensates (530→470) so
              the right column / AFTER card keeps its original size and
              position (flex: 1 absorbs the same remaining space). */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 470,
              marginLeft: 60,
            }}
          >
            {/* Headline */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 50,
                fontWeight: 600,
                lineHeight: 1.04,
                letterSpacing: "-0.025em",
                color: PAPER,
              }}
            >
              <div style={{ display: "flex" }}>Make your X posts</div>
              <div style={{ display: "flex", position: "relative" }}>
                <span
                  style={{
                    display: "flex",
                    fontFamily: "InstrumentSerif",
                    fontStyle: "italic",
                    fontWeight: 400,
                    color: MOSS_GLOW,
                    letterSpacing: "-0.02em",
                  }}
                >
                  perform better.
                </span>
                {/* Vermillion underline beneath the italic emphasis */}
                <div
                  style={{
                    display: "flex",
                    position: "absolute",
                    left: 0,
                    bottom: -8,
                    width: 320,
                    height: 6,
                    backgroundColor: VERMILLION,
                    borderRadius: 3,
                    opacity: 0.9,
                  }}
                />
              </div>
            </div>

            {/* Subhead */}
            <div
              style={{
                display: "flex",
                fontSize: 17,
                color: INK_300,
                marginTop: 20,
              }}
            >
              Sharper hooks. Real proof. More replies.
            </div>

            {/* Score progression */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 22,
              }}
            >
              <ScorePill value={`${currentScore}/100`} tone="rust" />
              <div
                style={{
                  display: "flex",
                  color: VERMILLION_GLOW,
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                →
              </div>
              <ScorePill value={`${projectedScore}/100`} tone="moss" />
              {lift > 0 && (
                <ScorePill value={`↗ +${lift} pts`} tone="moss-strong" />
              )}
            </div>

            {/* Author */}
            {author && (
              <div
                style={{
                  display: "flex",
                  fontSize: 14,
                  color: INK_400,
                  marginTop: 14,
                }}
              >
                Original draft by{" "}
                <span style={{ color: INK_300, marginLeft: 4 }}>@{author}</span>
              </div>
            )}

            {/* BEFORE card */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 14,
                padding: 16,
                borderRadius: 14,
                border: `1.5px solid ${RUST}55`,
                backgroundColor: "rgba(200, 85, 61, 0.06)",
                flex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: RUST_GLOW,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: RUST,
                  }}
                />
                BEFORE
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  marginTop: 10,
                  fontSize: 15,
                  lineHeight: 1.5,
                  color: PAPER,
                }}
              >
                {beforeSegs.map((seg, i) =>
                  seg.type === "text" ? (
                    <span key={i} style={{ whiteSpace: "pre-wrap" }}>
                      {seg.text}
                    </span>
                  ) : (
                    <span
                      key={i}
                      style={{
                        display: "flex",
                        backgroundColor: "rgba(200, 85, 61, 0.22)",
                        color: PAPER,
                        padding: "0 6px",
                        borderRadius: 4,
                        marginRight: 2,
                      }}
                    >
                      {seg.text}
                    </span>
                  )
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: "auto",
                  paddingTop: 12,
                  fontSize: 14,
                  color: RUST_GLOW,
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: RUST,
                  }}
                />
                {firstIssue}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — AFTER card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: 22,
              borderRadius: 18,
              border: `1.5px solid ${MOSS}55`,
              backgroundColor: "rgba(127, 176, 105, 0.05)",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 12px",
                  borderRadius: 999,
                  border: `1.5px solid ${MOSS}AA`,
                  backgroundColor: "rgba(127, 176, 105, 0.12)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: MOSS_GLOW,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                AFTER
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  border: `1.5px solid ${MOSS}AA`,
                  color: MOSS_GLOW,
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                ↗
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 18,
              }}
            >
              {afterChunks.map((chunk, i) => {
                // Pre-wrap the highlight at ~54-char boundaries so each
                // visual "line" becomes its own pill (the website does
                // this via box-decoration-break:clone, which Satori
                // doesn't fully honour — so we do it manually here).
                const highlightLines = chunk.highlight
                  ? wrapText(chunk.highlight, 54)
                  : [];
                const textLines = chunk.text ? wrapText(chunk.text, 54) : [];
                // All highlight lines except the last one render as solo
                // stacked pills. The LAST highlight line shares a row
                // with the callout so the tag sits right at the end of
                // the text — that's where the eye lands naturally. If
                // the last pill is too wide for the callout to also fit
                // on the same row, flex-wrap pushes the callout to the
                // next visual line (still inside this chunk).
                const soloLines = highlightLines.slice(0, -1);
                const lastLine = highlightLines[highlightLines.length - 1];
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 3,
                      marginBottom: 14,
                    }}
                  >
                    {/* Plain text lines (no highlight) */}
                    {textLines.map((line, j) => (
                      <span
                        key={`t-${j}`}
                        style={{
                          display: "flex",
                          fontSize: 17,
                          lineHeight: 1.45,
                          color: PAPER,
                        }}
                      >
                        {line}
                      </span>
                    ))}
                    {/* Solo pills (all lines except the last) */}
                    {soloLines.map((line, j) => (
                      <span
                        key={`s-${j}`}
                        style={{
                          display: "flex",
                          backgroundColor: "rgba(127, 176, 105, 0.28)",
                          color: PAPER,
                          padding: "3px 8px",
                          borderRadius: 5,
                          fontSize: 17,
                          lineHeight: 1.45,
                        }}
                      >
                        {line}
                      </span>
                    ))}
                    {/* Last pill + inline callout (callout sits at the
                        end of the last line; wraps to next line if the
                        pill is too wide). */}
                    {lastLine && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            backgroundColor: "rgba(127, 176, 105, 0.28)",
                            color: PAPER,
                            padding: "3px 8px",
                            borderRadius: 5,
                            fontSize: 17,
                            lineHeight: 1.45,
                          }}
                        >
                          {lastLine}
                        </span>
                        {chunk.callout && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                width: 26,
                                height: 0,
                                borderTop: `1.5px dashed ${MOSS_GLOW}`,
                              }}
                            />
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 22,
                                height: 22,
                                borderRadius: 999,
                                backgroundColor: MOSS,
                                color: INK_950,
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {chunk.callout.index}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                color: MOSS_GLOW,
                                fontSize: 14,
                                fontWeight: 600,
                              }}
                            >
                              {chunk.callout.label}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom chip row removed — the inline right-side callouts in
            the AFTER card already convey each improvement, so chips
            were redundant and ate vertical space the AFTER card needed. */}
      </div>
    ),
    { ...size, fonts }
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function ScorePill({
  value,
  tone,
}: {
  value: string;
  tone: "rust" | "moss" | "moss-strong";
}) {
  const config =
    tone === "rust"
      ? {
          border: `1.5px solid ${RUST}AA`,
          bg: "rgba(200, 85, 61, 0.08)",
          color: RUST_GLOW,
        }
      : tone === "moss-strong"
        ? {
            border: `1.5px solid ${MOSS}AA`,
            bg: "rgba(127, 176, 105, 0.15)",
            color: MOSS_GLOW,
          }
        : {
            border: `1.5px solid ${MOSS}AA`,
            bg: "rgba(127, 176, 105, 0.08)",
            color: MOSS_GLOW,
          };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "6px 16px",
        borderRadius: 999,
        border: config.border,
        backgroundColor: config.bg,
        fontSize: 16,
        fontWeight: 600,
        color: config.color,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </div>
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
        backgroundColor: INK_950,
        alignItems: "center",
        justifyContent: "center",
        color: PAPER,
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: VERMILLION_GLOW,
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
          color: PAPER,
          marginBottom: 18,
        }}
      >
        Analysis not found
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          color: INK_400,
        }}
      >
        letxcook.com · grade any X draft, free
      </div>
    </div>
  );
}
