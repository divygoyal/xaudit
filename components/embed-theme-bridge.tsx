"use client";

import { useEffect } from "react";

/**
 * Listens for `postMessage({ type: "xaudit-theme", theme: "light"|"dark" })`
 * from the parent frame and toggles the html `.dark` class accordingly.
 * Used by the browser extension's overlay to swap themes without reloading
 * the iframe (avoids Chrome's content-blocker hitting iframe re-navigations).
 *
 * Acks back so the parent knows the bridge is alive.
 */
export function EmbedThemeBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMessage = (event: MessageEvent) => {
      const data = event?.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "xaudit-theme") {
        const theme = data.theme === "light" ? "light" : "dark";
        const root = document.documentElement;
        if (theme === "dark") root.classList.add("dark");
        else root.classList.remove("dark");
        // Acknowledge so the parent can stop retrying if it does.
        try {
          (event.source as Window | null)?.postMessage(
            { type: "xaudit-theme-ack", theme },
            "*"
          );
        } catch {
          // noop
        }
      }
    };
    window.addEventListener("message", onMessage);
    // Signal readiness to the parent (so the parent can apply the saved
    // theme immediately after the iframe is interactive).
    try {
      window.parent?.postMessage({ type: "xaudit-embed-ready" }, "*");
    } catch {
      // noop
    }
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return null;
}
