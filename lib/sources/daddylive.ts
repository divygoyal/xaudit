// Client for DaddyLive / DLHD. The service is a high-quality fallback
// for league sports (NFL/NBA/NHL/MLB/EPL/F1/UFC + 1000+ TV channels)
// but has two big quirks:
//
//   1. HIGH DOMAIN CHURN. The same backend lives behind .pk → .so →
//      .mp → .sx → daddylive.* domains that rotate every couple of
//      weeks. We keep a `KNOWN_DOMAINS` allowlist and health-check
//      it on cold start, then cache the live one for ~10 min.
//
//   2. STREAM URL EXTRACTION REQUIRES RUNNING THEIR PHP→JS PIPELINE.
//      The `/stream/stream-{id}.php` page returns obfuscated JS that
//      derives the actual m3u8 URL from a rotating CDN host (most
//      often `lewblivehdplay.ru`). That extraction is best done
//      server-side with a pattern matcher we can iterate on, but it
//      genuinely needs to be verified against the LIVE service — and
//      DLHD's domains are network-blocked from a lot of regions
//      (including our dev sandbox). So this module:
//
//        - Exposes the domain-resolver + schedule fetcher right now
//          so the resolver can call them and gracefully no-op when
//          they're unreachable.
//        - Stubs the m3u8 extractor; once we can verify against a
//          live deploy we'll fill in the regex/HTML parsing.
//
// This is "Phase 3 code lands, Phase 3b m3u8 extraction TODO".

const DOMAIN_HEALTH_TTL_MS = 10 * 60_000;
const SCHEDULE_CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 4000;
const UNREACHABLE_BACKOFF_MS = 5 * 60_000;

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// Domains ranked by recent community reports of liveness (June 2026).
// Lower index = preferred; we health-check in order until one
// responds within FETCH_TIMEOUT_MS.
const KNOWN_DOMAINS = [
  "dlhd.pk",
  "daddylive.mp",
  "daddylive.sx",
  "thedaddy.click",
  "dlhd.so",
  "dlhd.click",
  "dlhd.sx",
];

// The actual m3u8 host. Required as a Referer when fetching segments
// otherwise the CDN returns 403.
export const LEWBLIVE_HOST = "https://lewblivehdplay.ru";

export type DlhdScheduleEntry = {
  // DLHD's schedule JSON is keyed by category → event → list of
  // channels. We flatten it during normalization so consumers get
  // one record per playable channel.
  category: string;
  event: string;
  time: string;
  channelId: string;
  channelName: string;
};

type CachedDomain = { domain: string; checkedAt: number };
let cachedDomain: CachedDomain | null = null;
let domainUnreachableAt: number | null = null;

type CachedSchedule = {
  entries: DlhdScheduleEntry[];
  cachedAt: number;
};
let cachedSchedule: CachedSchedule | null = null;

function backoffActive(): boolean {
  return Boolean(
    domainUnreachableAt &&
      Date.now() - domainUnreachableAt < UNREACHABLE_BACKOFF_MS,
  );
}

async function probeDomain(domain: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const r = await fetch(`https://${domain}/`, {
        method: "GET",
        headers: { "User-Agent": UA, Accept: "text/html,*/*" },
        cache: "no-store",
        signal: ctrl.signal,
      });
      return r.ok || r.status === 403; // 403 still proves reachability
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

/**
 * Find the first reachable DLHD-family domain, with a 10-min cache.
 * Returns null when every known domain is unreachable from where we
 * are (a long-lived backoff suppresses retry storms).
 */
export async function resolveDlhdDomain(): Promise<string | null> {
  if (cachedDomain && Date.now() - cachedDomain.checkedAt < DOMAIN_HEALTH_TTL_MS) {
    return cachedDomain.domain;
  }
  if (backoffActive()) return null;
  for (const domain of KNOWN_DOMAINS) {
    if (await probeDomain(domain)) {
      cachedDomain = { domain, checkedAt: Date.now() };
      return domain;
    }
  }
  domainUnreachableAt = Date.now();
  return null;
}

type RawDlhdSchedule = Record<
  string,
  Record<
    string,
    {
      event: string;
      time: string;
      channels?: Array<{ channel_id: string | number; channel_name: string }>;
    }[]
  >
>;

/**
 * Fetch DLHD's daily schedule and normalise it into one record per
 * playable channel. Cached for SCHEDULE_CACHE_TTL_MS.
 */
export async function fetchDlhdSchedule(): Promise<DlhdScheduleEntry[] | null> {
  if (cachedSchedule && Date.now() - cachedSchedule.cachedAt < SCHEDULE_CACHE_TTL_MS) {
    return cachedSchedule.entries;
  }
  const domain = await resolveDlhdDomain();
  if (!domain) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const r = await fetch(
        `https://${domain}/schedule/schedule-generated.php`,
        {
          headers: {
            "User-Agent": UA,
            Accept: "application/json,*/*",
            Referer: `https://${domain}/`,
          },
          cache: "no-store",
          signal: ctrl.signal,
        },
      );
      if (!r.ok) return null;
      const raw = (await r.json()) as RawDlhdSchedule;
      const entries: DlhdScheduleEntry[] = [];
      for (const [, categories] of Object.entries(raw)) {
        for (const [category, events] of Object.entries(categories)) {
          for (const ev of events) {
            for (const ch of ev.channels ?? []) {
              entries.push({
                category,
                event: ev.event,
                time: ev.time,
                channelId: String(ch.channel_id),
                channelName: ch.channel_name,
              });
            }
          }
        }
      }
      cachedSchedule = { entries, cachedAt: Date.now() };
      return entries;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

/**
 * Cross-reference a dami-tv match title against the DLHD schedule.
 * Returns matching channels (a single match can have many channel
 * options on DLHD — TNT, BeIN, ESPN, etc.).
 *
 * SHORT-CIRCUIT: while extractDlhdM3u8 is stubbed (Phase 3b TODO),
 * walking the schedule is pure overhead — even on a healthy DLHD
 * domain we'd hand back channels that resolveStream can't turn into
 * a playable URL. Skip the lookup entirely so cold-start resolver
 * latency doesn't pay the 7-domain probe budget. Flip this flag once
 * the extractor returns real URLs.
 */
const DLHD_EXTRACTION_ENABLED = false;
export async function findDlhdChannels(
  damiTitle: string,
): Promise<DlhdScheduleEntry[] | null> {
  if (!DLHD_EXTRACTION_ENABLED) return null;
  const all = await fetchDlhdSchedule();
  if (!all) return null;
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const target = norm(damiTitle);
  // Loose match: token overlap. DLHD's event titles look like
  // "Brazil vs Morocco - FIFA World Cup" while dami-tv has just
  // "Brazil vs Morocco" — we accept records whose event title
  // contains all our title tokens.
  const tokens = target.split(" ").filter((t) => t.length > 2);
  if (tokens.length === 0) return null;
  return all.filter((e) => {
    const en = norm(e.event);
    return tokens.every((t) => en.includes(t));
  });
}

/**
 * Stub: extract a playable m3u8 from a DLHD stream-{id}.php page.
 * Their actual extraction logic runs obfuscated JS to derive a token
 * + URL on `lewblivehdplay.ru`. Implementing the pattern matcher
 * needs verification against a reachable deploy — see module
 * docstring. Returns null today; callers should treat that as
 * "DLHD not yet wired", not as a hard failure.
 */
export async function extractDlhdM3u8(
  _channelId: string,
): Promise<string | null> {
  // TODO(phase-3b): replace with the actual extractor. The general
  // shape is:
  //   1. GET https://{domain}/stream/stream-{channelId}.php
  //   2. Find iframe src embedded in the response
  //   3. Follow the iframe, extract the obfuscated JS payload
  //   4. Decode the m3u8 URL (rotating; expect lewblivehdplay.ru
  //      host with a query-string token)
  //   5. Return absolute URL the playlist proxy can fetch with
  //      Referer: ${LEWBLIVEHOST}/
  return null;
}
