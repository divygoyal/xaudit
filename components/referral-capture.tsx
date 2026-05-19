"use client";

import { useEffect } from "react";

const REF_COOKIE = "xaudit_ref";
const ATTRIBUTION_COOKIE = "xaudit_attribution";
const TTL_DAYS = 30;

/**
 * Runs once on `/v/[id]` page load:
 *  1. Persist `?ref=<uuid>` into a 30-day cookie so the auth/callback
 *     route can credit both sides when the visitor eventually signs up.
 *  2. Persist attribution (analysis_id, utm_*) into a separate cookie
 *     so /auth/callback can record a `share_signup` event server-side.
 *  3. Fire a `share_view` analytics beacon immediately.
 */
export function ReferralCapture({
  referrerId,
  analysisId,
}: {
  referrerId: string | null;
  analysisId: string;
}) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const url = new URL(window.location.href);
    const utm_source = url.searchParams.get("utm_source");
    const utm_medium = url.searchParams.get("utm_medium");
    const utm_campaign = url.searchParams.get("utm_campaign");
    const utm_content = url.searchParams.get("utm_content");
    const maxAge = TTL_DAYS * 24 * 60 * 60;

    // 1. Referral cookie
    if (referrerId && /^[0-9a-f-]{36}$/i.test(referrerId)) {
      document.cookie = `${REF_COOKIE}=${encodeURIComponent(referrerId)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }

    // 2. Attribution cookie (small JSON blob) — survives the OAuth/magic-link
    // redirect so /auth/callback can record share_signup with full UTM context.
    try {
      const attribution = {
        a: analysisId,
        r: referrerId,
        s: utm_source,
        m: utm_medium,
        c: utm_campaign,
        co: utm_content,
        t: Date.now(),
      };
      const encoded = encodeURIComponent(JSON.stringify(attribution));
      document.cookie = `${ATTRIBUTION_COOKIE}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } catch {
      // non-fatal — analytics, not auth
    }

    // 3. Fire the share_view beacon. sendBeacon survives nav-away events.
    const payload = JSON.stringify({
      event_type: "share_view",
      analysis_id: analysisId,
      referrer_id: referrerId,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
    });

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/track", blob);
      } else {
        fetch("/api/track", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // never let analytics break the page
    }
  }, [referrerId, analysisId]);

  return null;
}
