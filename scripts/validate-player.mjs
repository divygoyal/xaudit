// End-to-end validation of the live-stream player. Spins a headless
// Chromium (Edge channel when available so we exercise the same engine
// that hit the "Native player failed" bug), loads the homepage, clicks
// the first live match card, then waits for either:
//   - the <video> element to start advancing currentTime (success), or
//   - the in-overlay error UI to render (failure).
//
// Used during the fix to prove that defaulting to hls.js (instead of
// Edge's flaky native HLS) actually plays. Run with `node scripts/
// validate-player.mjs` while `next dev` is up.

import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const TIMEOUT = 60_000;

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
}).catch(async () => chromium.launch({ headless: true }));
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();

const consoleLines = [];
const networkLines = [];
page.on("console", (m) => consoleLines.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => consoleLines.push(`pageerror: ${e.message}`));
page.on("request", (req) => {
  const url = req.url();
  if (/playlist|\.m3u8|\.ts|strmd|dami-tv|\/api\/live\//i.test(url)) {
    networkLines.push(`→ ${req.method()} ${url}`);
  }
});
page.on("response", async (res) => {
  const url = res.url();
  if (/playlist|\.m3u8|\.ts|strmd|dami-tv|\/api\/live\//i.test(url)) {
    let extra = "";
    if (res.status() >= 400 || res.status() === 200) {
      const ct = res.headers()["content-type"] ?? "";
      extra = ` ct=${ct.slice(0, 40)}`;
    }
    networkLines.push(`← ${res.status()} ${url}${extra}`);
  }
});

const result = { ok: false, reason: "unset" };

try {
  console.log("[1/5] Loading homepage…");
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
  await page.waitForSelector("button:has-text('Live')", { timeout: TIMEOUT });

  // Find the first card whose status badge is "Live" (red, animated dot).
  const liveCardBtn = page
    .locator("button", { has: page.locator("text=Live") })
    .first();
  await liveCardBtn.waitFor({ state: "visible", timeout: TIMEOUT });

  console.log("[2/5] Clicking first live match…");
  const t0 = Date.now();
  await liveCardBtn.click();

  console.log("[3/5] Waiting for <video> element to mount…");
  const video = page.locator("video").first();
  await video.waitFor({ state: "attached", timeout: TIMEOUT });

  console.log("[4/5] Waiting for playback to advance or error UI…");
  const outcome = await Promise.race([
    page
      .waitForFunction(
        () => {
          const v = document.querySelector("video");
          return v && v.readyState >= 2 && v.currentTime > 0.2;
        },
        { timeout: TIMEOUT, polling: 250 },
      )
      .then(() => "playing"),
    page
      .waitForSelector("text=Stream unavailable", { timeout: TIMEOUT })
      .then(() => "error"),
  ]);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

  if (outcome === "playing") {
    const stats = await page.evaluate(() => {
      const v = document.querySelector("video");
      return {
        currentTime: v?.currentTime ?? null,
        readyState: v?.readyState ?? null,
        videoWidth: v?.videoWidth ?? null,
        videoHeight: v?.videoHeight ?? null,
        muted: v?.muted ?? null,
      };
    });
    console.log("[5/5] PLAYING after", elapsed + "s:", JSON.stringify(stats));
    result.ok = true;
    result.reason = "video advancing";
    result.elapsed = elapsed;
    result.stats = stats;
  } else {
    const detail = await page
      .locator(".text-zinc-500", { hasText: /native|hls|error|net/i })
      .first()
      .textContent()
      .catch(() => null);
    console.log("[5/5] ERROR UI rendered after", elapsed + "s. detail:", detail);
    result.ok = false;
    result.reason = "error UI";
    result.elapsed = elapsed;
    result.detail = detail;
  }
} catch (err) {
  result.ok = false;
  result.reason = "exception";
  result.message = err.message;
  console.error("EXCEPTION:", err.message);
}

// Capture video element state + hls.js trace at exit for triage.
const finalState = await page.evaluate(() => {
  const v = document.querySelector("video");
  const trace = (window).__hlsTrace ?? null;
  return {
    video: v
      ? {
          readyState: v.readyState,
          networkState: v.networkState,
          currentTime: v.currentTime,
          duration: v.duration,
          paused: v.paused,
          error: v.error
            ? { code: v.error.code, message: v.error.message }
            : null,
          src: v.src || v.currentSrc || null,
        }
      : null,
    hlsTrace: trace ? trace.slice(-40) : null,
  };
}).catch(() => null);
const finalVideo = finalState?.video ?? null;
const hlsTrace = finalState?.hlsTrace ?? null;

console.log("\n=== final <video> state ===");
console.log(JSON.stringify(finalVideo, null, 2));
console.log("\n=== hls.js trace (last 40 events) ===");
console.log((hlsTrace ?? ["(no trace captured)"]).join("\n"));
console.log("\n=== network (live-stream related) ===");
console.log(networkLines.slice(0, 60).join("\n"));
console.log("\n=== console log ===");
console.log(consoleLines.slice(-40).join("\n"));
console.log("\n=== result ===");
console.log(JSON.stringify(result, null, 2));

await browser.close();
process.exit(result.ok ? 0 : 1);
