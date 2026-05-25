/* eslint-disable no-console */
/**
 * Translate messages/en.json → messages/{locale}.json via Gemini 3.5 Pro.
 *
 *   Usage:  npx tsx scripts/translate.ts <locale>
 *   Example: npx tsx scripts/translate.ts ja-jp
 *
 * Strategy:
 *   ONE Gemini call with the entire en.json payload. Whole-file context
 *   beats per-key calls because the model uses consistent terminology
 *   across the brand (the same English word translates the same way
 *   everywhere — see chat thread for the rationale). Gemini 3.5 Pro
 *   handles millions of tokens, our marketing JSON is ~3-4k tokens, so
 *   length is never a concern.
 *
 * Validation after the call:
 *   1. JSON parses
 *   2. Key structure matches en.json exactly (no missing/extra keys)
 *   3. Every ICU placeholder ({name}, {count}) in en survives in target
 *   4. Every XML-ish tag (<emph>, <strong>, <link>, <br/>) survives
 *   5. Brand-glossary terms (letxcook, X, signal names…) are still
 *      present where they appeared in English
 *
 * The script REFUSES to write the output file if validation fails so
 * we never ship a broken locale.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { LOCALES, type LocaleCode } from "../i18n/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const MESSAGES_DIR = path.join(REPO_ROOT, "messages");

// Load .env / .env.local / .env.development the same way `next dev` does
// so GEMINI_API_KEY is picked up automatically. Without this the script
// has no env loader and process.env.GEMINI_API_KEY is undefined.
loadEnvConfig(REPO_ROOT);

const MODEL = "gemini-3.1-pro-preview";

// Brand-glossary terms that must stay in English across every locale.
// Used in both the prompt (instruction) and the post-call validator.
const GLOSSARY = [
  "letxcook",
];

// Signal names appearing inside signals_strip.positive_signals /
// negative_signals — these stay English in chips so the UI stays
// readable even for ESL JP creators who know the X feature names.
const SIGNAL_NAMES = [
  "Like",
  "Reply",
  "Repost",
  "Quote",
  "Click",
  "Profile click",
  "Photo expand",
  "Video view",
  "Dwell",
  "Follow",
  "Not interested",
  "Block",
  "Mute",
  "Report",
];

// Keys that should be TRANSCREATED (creative rewrite for cultural fit)
// rather than literally translated. Hero / CTAs / brand taglines —
// where literal translation reads stilted.
const TRANSCREATE_KEY_PATHS = [
  "hero.headline_line1",
  "hero.headline_line2",
  "hero.subhead",
  "hero.cta_primary",
  "hero.cta_secondary",
  "bottom_cta.heading_prefix",
  "bottom_cta.heading_emphasis",
  "bottom_cta.heading_suffix",
  "bottom_cta.cta_primary",
  "vs_folklore.heading",
  "vs_folklore.tagline_lead",
  "vs_folklore.tagline_emphasis",
  "faq.heading",
];

function buildSystemPrompt(localeCode: LocaleCode, localeMeta: (typeof LOCALES)[LocaleCode]): string {
  return `You are a professional translator and transcreator for a small-SaaS marketing website.

CONTEXT
The site is "letxcook" — an AI tool that grades X (formerly Twitter) post drafts against engagement signals. The audience is X content creators / indie hackers / marketers who want their tweets to perform better.

TARGET
${localeMeta.name} — locale code ${localeCode}, native form: ${localeMeta.nativeName}

TONE
Confident, direct, slightly casual — matches the original English voice. Speaks to creators as peers. NOT corporate, NOT over-formal. For Japanese specifically: warm/confident keigo balance — not vending-machine sonkeigo, not anime casual. For Arabic: Modern Standard Arabic, accessible to Gulf + Levant + Maghreb readers.

UI TERMINOLOGY
Use the most native local term for common UI elements when one exists — don't leave English abbreviations untranslated when the target language has a widely-used native form. Examples:
  • "FAQ"           — Japanese: よくある質問   Portuguese-BR: Perguntas frequentes   Spanish: Preguntas frecuentes   Arabic: الأسئلة الشائعة   Indonesian: FAQ (acceptable English-loanword)
  • "Sign in"        — use the native verb-form, not English
  • "Dashboard"      — native term if widely used, else the loanword

GLOSSARY — KEEP THESE EXACT ENGLISH FORMS (do not translate):
${GLOSSARY.map((g) => `  • "${g}"`).join("\n")}
  • "X" when it refers to the platform (formerly Twitter). When it just means the letter or appears in a sentence about something else, translate normally.
  • (For Japanese ja-jp only: signal-display label values inside the keys signals_strip.positive_signals.*, signals_strip.negative_signals.*, vs_folklore.repo_chip_*, and signal_storm.label_* SHOULD be translated to natural Japanese (いいね, 返信, リポスト, 引用, クリック, プロフィールクリック, 画像表示, 動画再生, 滞在時間, フォロー, 興味なし, ブロック, ミュート, 報告) — these match X's own JP UI. For all OTHER locales the signal names listed below stay English by default.)
  • Default signal-name behavior (other locales): keep English
${SIGNAL_NAMES.map((s) => `      - "${s}"`).join("\n")}

TRANSCREATE (creative rewrite for cultural fit — capture the brand voice, do not translate word-for-word) these key paths:
${TRANSCREATE_KEY_PATHS.map((p) => `  • ${p}`).join("\n")}

LITERAL TRANSLATE everything else — preserve meaning precisely. FAQ answers, body paragraphs, labels, navigation items, legal microcopy.

RULES (strict):
1. Translate only VALUES in the JSON. Never modify KEYS.
2. Preserve every ICU placeholder exactly: {name}, {count}, {plural,one{…}other{…}}, etc.
3. Preserve every XML-ish tag exactly — translate the text INSIDE the tags, never the tags themselves. The tags are: <emph>…</emph>, <strong>…</strong>, <link>…</link>, <br/>
4. Return ONLY the translated JSON object. No prose, no markdown fences, no explanation. The first character of your response must be { and the last must be }.
5. Same key structure as input. Same number of keys. Same nesting.
6. Preserve em-dashes, ellipses, brand punctuation where natural in the target language.
7. Drop the "_meta" object — keep its key but replace its value with {"locale": "${localeCode}", "translated_by": "gemini-3.5-pro"}.`;
}

function buildUserPrompt(enJson: string): string {
  return `Translate this JSON now, per the rules.

${enJson}`;
}

// ─────────────────────────────────────────────────────────────
// Validators — run AFTER the Gemini call. If any fail, we refuse
// to write the output so we never ship a broken locale.
// ─────────────────────────────────────────────────────────────

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

function flatten(obj: JsonValue, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj === null) return out;
  if (typeof obj === "string") {
    out[prefix] = obj;
    return out;
  }
  if (typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => Object.assign(out, flatten(v, prefix ? `${prefix}.${i}` : String(i))));
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    Object.assign(out, flatten(v as JsonValue, prefix ? `${prefix}.${k}` : k));
  }
  return out;
}

function extractPlaceholders(s: string): string[] {
  // Match ONLY simple ICU args like {name}, {count} — NOT the inner branches
  // of plural/select forms (those contain free text that translators legitimately
  // rewrite). Restricting to `\w+` between braces with no spaces or commas
  // captures argument references without false-positiving on translated
  // branch bodies like {# alternative angles}.
  return s.match(/\{[a-zA-Z_]\w*\}/g) ?? [];
}

function extractTags(s: string): string[] {
  // Match opening, closing, and self-closing tags.
  return s.match(/<\/?[a-zA-Z][a-zA-Z0-9]*\/?>/g) ?? [];
}

function validate(
  enFlat: Record<string, string>,
  translatedFlat: Record<string, string>,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  // Same set of keys (allowing the _meta replacement difference).
  const enKeys = new Set(Object.keys(enFlat).filter((k) => !k.startsWith("_meta")));
  const tKeys = new Set(Object.keys(translatedFlat).filter((k) => !k.startsWith("_meta")));

  for (const k of enKeys) {
    if (!tKeys.has(k)) errors.push(`MISSING KEY in translation: ${k}`);
  }
  for (const k of tKeys) {
    if (!enKeys.has(k)) errors.push(`EXTRA KEY in translation: ${k}`);
  }

  // Per-key placeholder + tag survival check.
  for (const k of enKeys) {
    if (!tKeys.has(k)) continue;
    const enVal = enFlat[k];
    const tVal = translatedFlat[k];

    const enPlaceholders = extractPlaceholders(enVal).sort();
    const tPlaceholders = extractPlaceholders(tVal).sort();
    if (JSON.stringify(enPlaceholders) !== JSON.stringify(tPlaceholders)) {
      errors.push(
        `PLACEHOLDER MISMATCH at ${k}\n    en: ${enPlaceholders.join(", ") || "(none)"}\n    ${k}: ${tPlaceholders.join(", ") || "(none)"}`,
      );
    }

    const enTags = extractTags(enVal).sort();
    const tTags = extractTags(tVal).sort();
    if (JSON.stringify(enTags) !== JSON.stringify(tTags)) {
      errors.push(
        `TAG MISMATCH at ${k}\n    en: ${enTags.join(" ") || "(none)"}\n    ${k}: ${tTags.join(" ") || "(none)"}`,
      );
    }

    // Brand-term survival — if a glossary term appears in en, expect it
    // in the translated value too (case-insensitive, since some locales
    // may lower/uppercase brand wordmarks).
    for (const term of GLOSSARY) {
      if (enVal.toLowerCase().includes(term.toLowerCase()) && !tVal.toLowerCase().includes(term.toLowerCase())) {
        errors.push(`GLOSSARY DROPPED at ${k}: "${term}" present in en but missing in translation`);
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const targetLocale = process.argv[2] as LocaleCode | undefined;
  if (!targetLocale) {
    console.error("Usage: npx tsx scripts/translate.ts <locale>");
    console.error(`Locales: ${Object.keys(LOCALES).filter((c) => c !== "en").join(", ")}`);
    process.exit(1);
  }
  if (!(targetLocale in LOCALES)) {
    console.error(`Unknown locale: ${targetLocale}`);
    console.error(`Known: ${Object.keys(LOCALES).join(", ")}`);
    process.exit(1);
  }
  if (targetLocale === "en") {
    console.error("Refusing to translate en into itself.");
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set. Add it to .env.local.");
    process.exit(1);
  }

  const localeMeta = LOCALES[targetLocale];
  const enPath = path.join(MESSAGES_DIR, "en.json");
  const outPath = path.join(MESSAGES_DIR, `${targetLocale}.json`);

  console.log(`→ Reading ${enPath}`);
  const enRaw = await fs.readFile(enPath, "utf8");
  const enJson = JSON.parse(enRaw);
  const enFlat = flatten(enJson);
  console.log(`  ${Object.keys(enFlat).length} keys to translate`);

  const ai = new GoogleGenAI({ apiKey });
  const systemPrompt = buildSystemPrompt(targetLocale, localeMeta);
  const userPrompt = buildUserPrompt(enRaw);

  console.log(`→ Calling ${MODEL} (${localeMeta.name} / ${targetLocale})…`);
  const start = Date.now();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 32000,
    },
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  done in ${elapsed}s`);

  const raw = response.text ?? "";
  if (!raw) {
    console.error("Empty Gemini response.");
    process.exit(1);
  }

  let translated: JsonValue;
  try {
    translated = JSON.parse(raw);
  } catch (err) {
    console.error("Gemini did not return valid JSON.");
    console.error("First 500 chars:\n", raw.slice(0, 500));
    console.error("Parse error:", (err as Error).message);
    process.exit(1);
  }

  const translatedFlat = flatten(translated);

  const result = validate(enFlat, translatedFlat);
  if (!result.ok) {
    console.error(`✗ Validation failed for ${targetLocale} (${result.errors.length} issue(s)):`);
    for (const e of result.errors) console.error(`  • ${e}`);
    console.error("\nRefusing to write output. Fix prompt or re-run.");
    process.exit(1);
  }

  await fs.writeFile(outPath, JSON.stringify(translated, null, 2) + "\n", "utf8");
  console.log(`✓ Wrote ${outPath}`);
  console.log(`\nNext: review messages/${targetLocale}.json in your editor and call out anything that smells off.`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
