# letxcook Browser Extension (v0)

Adds an **Audit** button to every X / Twitter post. One click opens letxcook with the post URL pre-filled.

## Install (development / unpacked)

1. Open Chrome (or any Chromium browser) and visit `chrome://extensions`.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked**.
4. Select this `extension/` folder.
5. Visit `https://x.com` — every tweet should now have a vermillion **Audit** button next to the reply / retweet / like row.

## Pointing at localhost during dev

Open `content.js` and change the top of file:

```js
const XAUDIT_URL = "https://letxcook.com"; // change to "http://localhost:3000"
```

Reload the extension at `chrome://extensions` after editing.

## Icons

Currently no icon assets — the extension will load fine but show the default puzzle-piece icon in the toolbar. Drop 16×16, 48×48, and 128×128 PNGs into `icons/` to fix that. Use the same vermillion `>` mark from the main site for consistency.

## How it works

- The content script runs on `x.com` and `twitter.com`.
- Walks the DOM for `article[data-testid="tweet"]` elements.
- Extracts each tweet's permalink from the `/user/status/id` link inside.
- Injects a vermillion **Audit** button into the tweet's action bar (`div[role="group"]`).
- A MutationObserver re-scans as the user scrolls (infinite feed).

## Caveats

- X's DOM changes occasionally. If the button stops appearing, check the selectors in `content.js`:
  - `article[data-testid='tweet']`
  - `a[href*='/status/']`
  - `div[role='group']`
- The extension never reads or stores tweet content — it only parses the URL out of the existing DOM.
