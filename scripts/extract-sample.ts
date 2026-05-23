/* eslint-disable no-console */
/**
 * One-shot helper: pull a stored analysis row from Supabase by its share id
 * and dump the row.result JSON in a shape ready to paste into lib/sample-data.ts
 * as SAMPLE_DRAFT_JA + SAMPLE_RESULT_JA.
 *
 *   Usage:  npx tsx scripts/extract-sample.ts <shareId>
 *   Example: npx tsx scripts/extract-sample.ts ybIx2zdBr8
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local — the
 * service role key bypasses RLS so we don't have to be signed in to the
 * row's owner. Output goes to scripts/extracted-sample.json for inspection.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
loadEnvConfig(REPO_ROOT);

async function main() {
  const shareId = process.argv[2];
  if (!shareId) {
    console.error("Usage: npx tsx scripts/extract-sample.ts <shareId>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const sb = createClient(url, key);
  const { data, error } = await sb
    .from("analyses")
    .select("id, draft_text, result, created_at")
    .eq("id", shareId)
    .single();

  if (error || !data) {
    console.error("Could not load analysis", shareId, error);
    process.exit(1);
  }

  const outPath = path.join(__dirname, "extracted-sample.json");
  await fs.writeFile(
    outPath,
    JSON.stringify({ draft_text: data.draft_text, result: data.result }, null, 2),
    "utf8",
  );
  console.log(`✓ Wrote ${outPath}`);
  console.log(`Row created at: ${data.created_at}`);
  console.log(`Draft preview: ${(data.draft_text ?? "").slice(0, 80)}…`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
