// xAudit service worker.
//   1. Handles the toolbar-icon click → sends a "trigger" message to the
//      active tab's content script which decides what to do based on URL.
//   2. Proxies API calls from the content script to our backend so the
//      content script doesn't hit CORS (background has host permissions).

const XAUDIT_URL = "http://localhost:3000"; // ← swap to prod domain when deployed

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  if (!tab.url) return;

  // On x.com / twitter.com → ask the content script to take over.
  if (/^https:\/\/(x|twitter)\.com\//.test(tab.url)) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "XAUDIT_TRIGGER" });
    } catch {
      // Content script wasn't ready. Fall through to open the site.
      chrome.tabs.create({ url: XAUDIT_URL });
    }
    return;
  }

  // Anywhere else → open the site.
  chrome.tabs.create({ url: XAUDIT_URL });
});

// Proxy fetch — content script can't reach our backend on a cross-origin
// fetch from x.com directly (CORS), but the background worker can.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "XAUDIT_FETCH") {
    const { path, init } = msg;
    if (typeof path !== "string" || !path.startsWith("/")) {
      sendResponse({ ok: false, error: "Invalid path." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${XAUDIT_URL}${path}`, {
          ...(init || {}),
          credentials: "include",
        });
        const text = await res.text();
        sendResponse({ ok: true, status: res.status, body: text });
      } catch (err) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Network error.",
        });
      }
    })();
    // Keep the message channel open for the async sendResponse.
    return true;
  }
  if (msg?.type === "XAUDIT_OPEN") {
    const { path } = msg;
    if (typeof path !== "string") return;
    chrome.tabs.create({ url: `${XAUDIT_URL}${path}` });
  }
  return false;
});
