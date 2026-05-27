import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { nanoid } from "nanoid";
import { buildSystemPrompt, buildUserPrompt, type AttachedMedia } from "@/lib/rubric";
import { SAMPLE_RESULT } from "@/lib/sample-data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";
import {
  ANON_COOKIE_NAME,
  decrementBonusCredit,
  FREE_LIMIT,
  getUsage,
  nextAnonCookieValue,
  PRO_USAGE_REMAINING,
} from "@/lib/usage";
import type { AnalysisResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "gemini-3.5-flash"; // Gemini 3.5 Flash. Fast + cheap, right tier for our structured-JSON rubric task. Swap to "gemini-3.5-pro" for max quality.

type IncomingBody = {
  text?: string;
  imageBase64?: string;
  imageMediaType?: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  media?: AttachedMedia[];
  tweetUrl?: string;
  tweetId?: string;
  tweetAuthor?: string;
  /** Locale of the requesting page (e.g. "ja-jp"). When set to a
   *  non-English value, Gemini is instructed to respond with all
   *  human-readable text fields in that language. Canonical signal /
   *  angle / band identifier strings stay English (UI keys on them). */
  locale?: string;
};

export async function POST(req: Request) {
  let body: IncomingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = (body.text ?? "").toString();
  const imageBase64 = body.imageBase64;
  const imageMediaType = body.imageMediaType ?? "image/png";

  if (!text.trim() && !imageBase64) {
    return NextResponse.json({ error: "Provide draft text or a screenshot." }, { status: 400 });
  }

  // Auth + usage gate. Run BEFORE hitting Gemini so we don't burn tokens
  // on requests that will be rejected.
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const usage = await getUsage(user?.id ?? null);
  if (!usage.isUnlimited && usage.remaining <= 0) {
    return NextResponse.json(
      {
        error: usage.isAnon
          ? "You've used your free trial analysis. Sign in to get 3 free analyses this month."
          : `You've used all ${usage.limit} free analyses this month. Upgrade to keep going.`,
        usage,
        gate: usage.isAnon ? "anon" : "free",
      },
      { status: 402 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ...SAMPLE_RESULT, is_mock: true } satisfies AnalysisResult);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: imageMediaType,
          data: imageBase64,
        },
      });
    }
    const media = Array.isArray(body.media) ? body.media : [];
    parts.push({ text: buildUserPrompt(text, Boolean(imageBase64), media) });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: buildSystemPrompt(body.locale),
        responseMimeType: "application/json",
        temperature: 0.5,
        maxOutputTokens: 12000,
      },
    });

    const raw = response.text ?? "";
    if (!raw) {
      return NextResponse.json({ error: "Empty model response." }, { status: 502 });
    }

    const parsed = extractJSON(raw);
    if (!parsed) {
      return NextResponse.json(
        { error: "Model did not return valid JSON.", raw },
        { status: 502 }
      );
    }

    // Persist for shareable URLs. Failure here is non-fatal — the user
    // still gets their analysis even if Supabase is down; they just
    // can't share that specific result.
    let share_id: string | undefined;
    try {
      const id = nanoid(10);
      const draftForStorage = (parsed.draft_text ?? text).trim() || text;
      const { error: insErr } = await getSupabaseAdmin()
        .from("analyses")
        .insert({
          id,
          tweet_url: body.tweetUrl ?? null,
          tweet_id: body.tweetId ?? null,
          tweet_author: body.tweetAuthor ?? null,
          draft_text: draftForStorage,
          result: parsed,
          user_id: user?.id ?? null,
        });
      if (!insErr) {
        share_id = id;
        prewarmOgImage(id);
      } else {
        console.error("[analyze] supabase insert error:", insErr);
      }
    } catch (e) {
      console.error("[analyze] persist exception:", e);
    }

    // Burn a bonus credit if the user has exceeded their monthly free
    // allowance. Signed-in users only — anon has no credits to spend.
    let updatedBonusCredits = usage.bonusCredits;
    if (!usage.isUnlimited && !usage.isAnon && user && usage.used >= FREE_LIMIT) {
      const newBalance = await decrementBonusCredit(user.id);
      if (newBalance !== null) {
        updatedBonusCredits = newBalance;
      }
    }

    // Updated usage AFTER this analysis lands. For anon users we also
    // bump the signed-cookie counter on the response.
    const newUsed = usage.used + 1;
    const monthlyRemaining = usage.isUnlimited
      ? PRO_USAGE_REMAINING
      : usage.isAnon
        ? Math.max(0, usage.limit - newUsed)
        : Math.max(0, FREE_LIMIT - newUsed);
    const nextUsage = {
      used: newUsed,
      limit: usage.limit,
      bonusCredits: updatedBonusCredits,
      remaining: usage.isUnlimited
        ? PRO_USAGE_REMAINING
        : monthlyRemaining + (usage.isAnon ? 0 : updatedBonusCredits),
      isAnon: usage.isAnon,
      plan: usage.plan,
      isUnlimited: usage.isUnlimited,
    };

    const httpResponse = NextResponse.json({
      ...parsed,
      share_id,
      usage: nextUsage,
    } as AnalysisResult & { share_id?: string; usage: typeof nextUsage });

    if (usage.isAnon) {
      httpResponse.cookies.set(ANON_COOKIE_NAME, nextAnonCookieValue(), {
        path: "/",
        httpOnly: false, // not a security token, just a usage counter
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 60, // 60 days; gets overwritten monthly anyway
      });
    }
    return httpResponse;
  } catch (err) {
    console.error("[analyze] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Same precedence used in lib/verdict.ts + app/layout.tsx.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

/** Fire-and-forget pre-warm of the verdict's OG image. The Edge image
 *  route is the slow part of the share flow — a cold render takes 4-6s
 *  on Vercel (Edge init + Satori render of a complex BEFORE/AFTER
 *  layout), which exceeds X / Twitterbot's unfurl tolerance and causes
 *  the broken-image placeholder users see when pasting fresh share
 *  links. By kicking off the render here, the moment the analysis row
 *  is persisted, Vercel's edge cache (Cache-Control: public, immutable,
 *  max-age=31536000 on the response) holds a ready PNG by the time
 *  the user clicks Share → pastes into X.
 *
 *  We intentionally don't await this: the Vercel Node runtime keeps
 *  the lambda alive briefly after the response is returned, which is
 *  more than enough time for the outbound TCP/HTTP request to land at
 *  our own edge endpoint and trigger the render. The render itself
 *  then runs to completion regardless of whether our originating socket
 *  is still open. */
function prewarmOgImage(id: string) {
  const url = `${SITE_URL}/v/${id}/opengraph-image`;
  fetch(url, {
    method: "GET",
    headers: { "User-Agent": "letxcook-prewarm/1.0" },
    cache: "no-store",
  }).catch((err) => {
    console.error("[analyze] og prewarm fetch failed:", err);
  });
}

function extractJSON(raw: string): AnalysisResult | null {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as AnalysisResult;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]) as AnalysisResult;
      } catch {
        // fall through
      }
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as AnalysisResult;
      } catch {
        return null;
      }
    }
    return null;
  }
}
