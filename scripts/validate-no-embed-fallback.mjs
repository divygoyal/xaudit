// Regression check for the "Remove sandbox attributes" bug.
//
// Bug: auto-fallback would advance from a slow HLS source to the
// embed.st iframe when HLS upstream cold-start exceeded 14s, showing
// embed.st's anti-sandbox error to the user instead of letting HLS
// keep loading.
//
// This script blocks the upstream HLS playlist request so the player
// never gets a manifest. The auto-advance timer must NOT then load the
// embed.st iframe — it should either keep the loading spinner up or
// surface our "Stream unavailable" UI. Pass if no embed.st iframe is
// in the DOM after 25s.
//
// Run while `next dev` is up on $BASE_URL (default 3001).

import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const TIMEOUT = 30_000;

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
}).catch(async () => chromium.launch({ headless: true }));

const ctx = await browser.newContext();
const page = await ctx.newPage();

// Block the playlist proxy so HLS can never load.
await page.route("**/api/live/playlist/**", (route) => {
  // Hang the request indefinitely — simulates a slow upstream that
  // never delivers a manifest.
  // (We don't .abort() because that would fire a fatal HLS error
  // immediately and short-circuit the wall-clock test.)
  setTimeout(() => route.abort("timedout"), 5000);
});

const result = { ok: false, reason: "unset" };
const log = [];
page.on("console", (m) => log.push(`${m.type()}: ${m.text()}`));

try {
  console.log("[1/4] Loading homepage…");
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
  await page.waitForSelector("button:has-text('Live')", { timeout: TIMEOUT });

  const liveCardBtn = page
    .locator("button", { has: page.locator("text=Live") })
    .first();
  console.log("[2/4] Clicking first live card…");
  await liveCardBtn.click();

  // Sit and wait through the 14s auto-advance window plus margin.
  console.log("[3/4] Waiting 25s for auto-advance window…");
  await page.waitForTimeout(25_000);

  console.log("[4/4] Inspecting DOM for embed.st iframe…");
  const embedFrameCount = await page
    .locator("iframe[src*='embed.st'], iframe[src*='/embed/player']")
    .count();
  const errorUiVisible = await page
    .locator("text=Remove sandbox attributes")
    .count();
  const stillLoading = await page
    .locator("text=Loading stream")
    .count();
  const ourStreamUnavailable = await page
    .locator("text=Stream unavailable")
    .count();

  console.log("embed iframes in DOM:", embedFrameCount);
  console.log("embed.st sandbox error visible:", errorUiVisible > 0);
  console.log("our 'Loading stream' UI visible:", stillLoading > 0);
  console.log("our 'Stream unavailable' UI visible:", ourStreamUnavailable > 0);

  if (embedFrameCount === 0 && errorUiVisible === 0) {
    result.ok = true;
    result.reason = "auto-fallback correctly stayed on HLS";
  } else {
    result.ok = false;
    result.reason = `regressed: embedFrames=${embedFrameCount}, sandboxErr=${errorUiVisible}`;
  }
} catch (err) {
  result.reason = "exception: " + err.message;
}

console.log("\n=== result ===");
console.log(JSON.stringify(result, null, 2));
console.log("\n=== last console lines ===");
console.log(log.slice(-15).join("\n"));

await browser.close();
process.exit(result.ok ? 0 : 1);
