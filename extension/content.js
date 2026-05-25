// letxcook content script.
//   1. Per-tweet button on every tweet — click opens the in-page overlay (NOT a new tab).
//   2. Extension-icon click → smart context detect → opens overlay for either
//      the compose draft or the current tweet.
//   3. Overlay renders the full RecommendedRewrite via iframe to /v/[id]/embed.
//   4. All cross-origin fetches go through the background worker.

(() => {
  const BUTTON_ATTR = "data-xaudit-injected";
  const OVERLAY_ID = "xaudit-overlay-root";
  // Keep in sync with background.js. For local dev, swap to localhost:3000
  // AND add it back to manifest host_permissions; production must stay
  // on letxcook.com to satisfy Chrome Web Store review.
  const XAUDIT_URL = "https://letxcook.com";
  const UTM = "utm_source=extension&utm_medium=overlay&utm_campaign=ext_v1";
  const THEME_KEY = "xaudit_overlay_theme";

  function getOverlayTheme() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch {}
    return "dark";
  }

  function setOverlayTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }

  function applyOverlayTheme(rootEl, theme) {
    rootEl.classList.toggle("xaudit-light", theme === "light");
  }

  // ─────────────────────────────────────────────────────────────
  // Per-tweet button
  // ─────────────────────────────────────────────────────────────

  function tweetUrlFromArticle(article) {
    const links = article.querySelectorAll("a[href*='/status/']");
    for (const a of links) {
      const m = a.getAttribute("href")?.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/);
      if (m) return `https://x.com/${m[1]}/status/${m[2]}`;
    }
    return null;
  }

  function makeAuditButton(tweetUrl) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "xaudit-btn";
    btn.setAttribute("aria-label", "Audit this post with xAudit");
    btn.innerHTML = `
      <span class="xaudit-btn-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
          <rect x="1" y="1" width="26" height="26" rx="7" fill="currentColor"/>
          <path d="M8.5 9.5 L13.5 14 L8.5 18.5 M14.5 18.5 H19.5"
                stroke="#0c0b09" stroke-width="1.7"
                stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </span>
      <span class="xaudit-btn-label">Audit</span>
    `;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      auditInput({ tweetUrl });
    });
    return btn;
  }

  function injectButton(article) {
    if (article.hasAttribute(BUTTON_ATTR)) return;
    const tweetUrl = tweetUrlFromArticle(article);
    if (!tweetUrl) return;
    const actionBar = article.querySelector("div[role='group']");
    if (!actionBar) return;
    const wrap = document.createElement("div");
    wrap.className = "xaudit-btn-wrap";
    wrap.appendChild(makeAuditButton(tweetUrl));
    actionBar.appendChild(wrap);
    article.setAttribute(BUTTON_ATTR, "1");
  }

  function scanTweets() {
    document.querySelectorAll("article[data-testid='tweet']").forEach(injectButton);
  }

  // ─────────────────────────────────────────────────────────────
  // Compose toolbar button — sits inline with media / GIF / emoji
  // ─────────────────────────────────────────────────────────────

  function injectComposeButtons() {
    const toolbars = document.querySelectorAll("[data-testid='toolBar']");
    toolbars.forEach((toolbar) => {
      if (toolbar.hasAttribute("data-xaudit-toolbar-injected")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "xaudit-compose-btn";
      btn.title = "Audit this draft with xAudit";
      btn.setAttribute("aria-label", "Audit this draft with xAudit");
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="26" height="26" rx="7" fill="currentColor"/>
          <path d="M8.5 9.5 L13.5 14 L8.5 18.5 M14.5 18.5 H19.5"
                stroke="#0c0b09" stroke-width="1.7"
                stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      `;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const draft = readComposeDraft();
        if (!draft || draft.length < 4) {
          // Tiny non-intrusive nudge — pulse the button instead of opening empty overlay
          btn.classList.remove("xaudit-compose-btn-shake");
          // force reflow to restart animation
          void btn.offsetWidth;
          btn.classList.add("xaudit-compose-btn-shake");
          return;
        }
        auditInput({ text: draft });
      });

      const wrap = document.createElement("div");
      wrap.className = "xaudit-compose-btn-wrap";
      wrap.appendChild(btn);

      // The toolbar's first child div holds the icon row (media, GIF, etc.).
      // Append our button at the end of that row.
      const iconRow = toolbar.firstElementChild;
      if (iconRow && iconRow.tagName === "DIV") {
        iconRow.appendChild(wrap);
      } else {
        toolbar.appendChild(wrap);
      }
      toolbar.setAttribute("data-xaudit-toolbar-injected", "1");
    });
  }

  function scan() {
    scanTweets();
    injectComposeButtons();
  }

  // ─────────────────────────────────────────────────────────────
  // Overlay shell
  // ─────────────────────────────────────────────────────────────

  function removeOverlay() {
    document.getElementById(OVERLAY_ID)?.remove();
    document.body.classList.remove("xaudit-no-scroll");
  }

  // Listen for "ready" messages from the embed iframe and (re)push the
  // current overlay theme. Avoids a race where the user toggles before
  // the iframe finishes loading.
  if (!window.__xauditMsgListener) {
    window.__xauditMsgListener = true;
    window.addEventListener("message", (event) => {
      const data = event?.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "xaudit-embed-ready") {
        const root = document.getElementById(OVERLAY_ID);
        const iframe = root?.querySelector(".xaudit-embed-iframe");
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            { type: "xaudit-theme", theme: getOverlayTheme() },
            "*"
          );
        }
      }
    });
  }

  function buildOverlayShell() {
    removeOverlay();
    const root = document.createElement("div");
    root.id = OVERLAY_ID;
    root.innerHTML = `
      <div class="xaudit-overlay-backdrop"></div>
      <div class="xaudit-overlay-card" role="dialog" aria-modal="true" aria-labelledby="xaudit-overlay-title">
        <div class="xaudit-overlay-head">
          <div class="xaudit-overlay-brand">
            <span class="xaudit-overlay-mark">
              <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                <rect x="1" y="1" width="26" height="26" rx="7" fill="currentColor"/>
                <path d="M8.5 9.5 L13.5 14 L8.5 18.5 M14.5 18.5 H19.5"
                      stroke="#0c0b09" stroke-width="1.7"
                      stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
            </span>
            <span class="xaudit-overlay-brand-label">xAudit</span>
          </div>
          <div class="xaudit-overlay-head-actions">
            <button type="button" class="xaudit-theme-toggle" aria-label="Toggle theme" title="Toggle light/dark">
              <span class="xaudit-theme-icon xaudit-theme-icon-sun" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
              </span>
              <span class="xaudit-theme-icon xaudit-theme-icon-moon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </span>
            </button>
            <button type="button" class="xaudit-overlay-close" aria-label="Close">×</button>
          </div>
        </div>
        <div class="xaudit-overlay-body" id="xaudit-overlay-body"></div>
      </div>
    `;
    document.body.appendChild(root);
    document.body.classList.add("xaudit-no-scroll");
    applyOverlayTheme(root, getOverlayTheme());

    root.querySelector(".xaudit-overlay-close")?.addEventListener("click", removeOverlay);
    root.querySelector(".xaudit-overlay-backdrop")?.addEventListener("click", removeOverlay);

    root.querySelector(".xaudit-theme-toggle")?.addEventListener("click", () => {
      const next = getOverlayTheme() === "dark" ? "light" : "dark";
      setOverlayTheme(next);
      applyOverlayTheme(root, next);
      // Tell the iframe to swap theme in place — NO src reload (Chrome's
      // safe-browsing / content-blocker can flag iframe re-navigations).
      const iframe = root.querySelector(".xaudit-embed-iframe");
      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ type: "xaudit-theme", theme: next }, "*");
        } catch {
          // ignore — embed may not be loaded yet; initial src already has the theme
        }
      }
    });

    const onKey = (e) => {
      if (e.key === "Escape") {
        removeOverlay();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);

    return root.querySelector("#xaudit-overlay-body");
  }

  function setOverlayPhase(body, html) {
    body.innerHTML = html;
  }

  // ─────────────────────────────────────────────────────────────
  // Overlay phases
  // ─────────────────────────────────────────────────────────────

  // Signal Processing Engine — loading phase shown while /api/analyze is in flight.
  // 14 ranker signals, 2 s each, ~28 s total budget.
  const SIGNAL_DURATION_MS = 2000;
  const PHRASE_STEP_MS = 600;
  const SKELETON_WIDTHS = ["32%", "94%", "88%", "78%", "92%", "56%"];
  const ENGINE_SIGNALS = [
    { id: "like", label: "Like", kind: "rewarded", desc: "Predicting like rate from text shape.", icon: "heart" },
    { id: "reply", label: "Reply", kind: "rewarded", desc: "Measuring reply-trigger strength.", icon: "messageCircle" },
    { id: "repost", label: "Repost", kind: "rewarded", desc: "Predicting amplification potential.", icon: "repeat" },
    { id: "quote", label: "Quote", kind: "rewarded", desc: "Measuring quote-tweet pull.", icon: "quote" },
    { id: "follow", label: "Follow", kind: "rewarded", desc: "Measuring follow conversion intent.", icon: "userPlus" },
    { id: "profile-click", label: "Profile Click", kind: "rewarded", desc: "Predicting profile-pull signal.", icon: "userRound" },
    { id: "click", label: "Link Click", kind: "rewarded", desc: "Predicting click-through intent.", icon: "mousePointerClick" },
    { id: "video-view", label: "Video View", kind: "rewarded", desc: "Predicting video view-through.", icon: "playCircle" },
    { id: "photo-expand", label: "Image View", kind: "rewarded", desc: "Predicting photo-expand rate.", icon: "image" },
    { id: "dwell", label: "Dwell Time", kind: "rewarded", desc: "Measuring reading dwell quality.", icon: "timer" },
    { id: "not-interested", label: "Expand", kind: "punished", desc: "Checking not-interested risk.", icon: "eyeOff" },
    { id: "bookmark", label: "Bookmark", kind: "punished", desc: "Checking block-trigger risk.", icon: "ban" },
    { id: "share", label: "Share", kind: "punished", desc: "Checking mute risk.", icon: "volumeX" },
    { id: "report", label: "Report Risk", kind: "punished", desc: "Checking policy / spam risk.", icon: "flag" },
  ];

  function engineIcon(name, size = 14) {
    const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    const icons = {
      heart: `<svg ${common}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
      messageCircle: `<svg ${common}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
      repeat: `<svg ${common}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
      quote: `<svg ${common}><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .5-1 1v1c0 .5.5 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h.25c.5 0 .75.25.75.75v1.25c0 1-1 2-2 2s-1 .5-1 1v1c0 .5.5 1 1 1z"/></svg>`,
      userPlus: `<svg ${common}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
      userRound: `<svg ${common}><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>`,
      mousePointerClick: `<svg ${common}><path d="m9 9 5 12 1.8-5.2L21 14Z"/><path d="M7.2 2.2 8 5.1"/><path d="m5.1 8-2.9-.8"/><path d="M14 4.1 12 6"/><path d="m6 12-1.9 2"/></svg>`,
      playCircle: `<svg ${common}><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
      image: `<svg ${common}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      timer: `<svg ${common}><line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="15" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`,
      eyeOff: `<svg ${common}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
      ban: `<svg ${common}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
      volumeX: `<svg ${common}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
      flag: `<svg ${common}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
      sparkles: `<svg ${common}><path d="M12 3 13.5 8.5 19 10 13.5 11.5 12 17 10.5 11.5 5 10 10.5 8.5z"/></svg>`,
      clipboard: `<svg ${common}><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
      penLine: `<svg ${common}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
      lock: `<svg ${common}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
      check: `<svg ${common}><polyline points="20 6 9 17 4 12"/></svg>`,
    };
    return icons[name] || icons.sparkles;
  }

  // Split text into phrases (sentence terminators + newlines) interleaved
  // with gaps so the highlight animation flows phrase-by-phrase, never per-word.
  function tokenizePhrases(text) {
    const tokens = [];
    let buf = "";
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === "\n") {
        if (buf.trim()) tokens.push({ kind: "phrase", content: buf });
        else if (buf) tokens.push({ kind: "gap", content: buf });
        let nl = "";
        while (i < text.length && text[i] === "\n") {
          nl += text[i];
          i++;
        }
        i--;
        tokens.push({ kind: "gap", content: nl });
        buf = "";
        continue;
      }
      buf += c;
      if (/[.!?]/.test(c)) {
        const next = text[i + 1];
        if (!next || /\s/.test(next)) {
          tokens.push({ kind: "phrase", content: buf });
          buf = "";
        }
      }
    }
    if (buf.trim()) tokens.push({ kind: "phrase", content: buf });
    else if (buf) tokens.push({ kind: "gap", content: buf });
    return tokens;
  }

  function renderPhrases(text) {
    const tokens = tokenizePhrases(text);
    let phraseIndex = 0;
    return tokens
      .map((t) => {
        if (t.kind === "gap") return escapeHtml(t.content);
        const delay = phraseIndex * PHRASE_STEP_MS;
        phraseIndex += 1;
        return `<span class="xaudit-engine-phrase" style="animation-delay:${delay}ms">${escapeHtml(t.content)}</span>`;
      })
      .join("");
  }

  function scanningPhase(label, draft = "Your draft") {
    const raw = draft || "Your draft";
    const display = raw.length > 320 ? raw.slice(0, 320).trim() + "…" : raw;
    const charCount = Math.min(String(draft || "").length, 320);
    const first = ENGINE_SIGNALS[0];
    const stepsHtml = ENGINE_SIGNALS.map((_, i) => `
      <div class="xaudit-engine-step${i === 0 ? " is-active" : ""}" data-engine-step="${i}">
        <span class="xaudit-engine-step-num" data-engine-step-num>${i + 1}</span>
        <span class="xaudit-engine-step-check" data-engine-step-check>${engineIcon("check", 11)}</span>
        ${i === 0 ? '<span class="xaudit-engine-step-arrow" aria-hidden></span>' : ""}
      </div>
    `).join("");
    const chipsHtml = ENGINE_SIGNALS.map((signal, i) => `
      <div class="xaudit-engine-chip${i === 0 ? " is-active" : ""}" data-engine-chip="${i}">
        ${engineIcon(signal.icon, 11)}<span>${escapeHtml(signal.label)}</span>
      </div>
    `).join("");
    const skeletonHtml = SKELETON_WIDTHS.map((w, i) => `
      <span class="xaudit-engine-skeleton-line" style="width:${w};${i === SKELETON_WIDTHS.length - 1 ? "margin-left:auto;" : ""}animation-delay:${i * 0.18}s"></span>
    `).join("");

    return `
      <section class="xaudit-engine">
        <header class="xaudit-engine-head">
          <div class="xaudit-engine-head-text">
            <h3>Grading your <span class="xaudit-italic">draft</span></h3>
            <p>${engineIcon("sparkles", 11)} 14 ranker signals · about 28 seconds</p>
          </div>
          <div class="xaudit-engine-head-bar">
            <div class="xaudit-engine-head-track">
              <div class="xaudit-engine-head-fill" data-engine-head-fill style="width:7.14%"></div>
            </div>
            <div class="xaudit-engine-head-meta">
              <span class="xaudit-engine-head-num"><span data-engine-graded>1</span><span class="xaudit-engine-head-num-sep"> / 14</span></span>
              <span class="xaudit-engine-head-label">Signals graded</span>
            </div>
          </div>
        </header>

        <div class="xaudit-engine-grid">
          <article class="xaudit-engine-panel">
            <div class="xaudit-engine-kicker">${engineIcon("clipboard", 11)}<span>Original draft</span></div>
            <div class="xaudit-engine-draft-box">
              <p class="xaudit-engine-draft-text">${renderPhrases(display)}</p>
              <span class="xaudit-engine-char-count">${charCount} characters</span>
            </div>
          </article>

          <div class="xaudit-engine-stage">
            <div class="xaudit-engine-stage-head">
              <div class="xaudit-engine-stage-eyebrow">${engineIcon("sparkles", 11)}<span>Signal Processing Engine</span></div>
              <div class="xaudit-engine-stage-sub">Analyzing 14 ranker signals step by step</div>
            </div>

            <div class="xaudit-engine-steps">
              <div class="xaudit-engine-steps-track" aria-hidden></div>
              <div class="xaudit-engine-steps-fill" aria-hidden data-engine-steps-fill style="width:0%"></div>
              ${stepsHtml}
            </div>

            <div class="xaudit-engine-chips">${chipsHtml}</div>

            <div class="xaudit-engine-active-card" data-engine-active-card>
              <div class="xaudit-engine-active-icon" data-engine-active-icon>${engineIcon(first.icon, 22)}</div>
              <div class="xaudit-engine-active-body">
                <div class="xaudit-engine-active-head">
                  <span class="xaudit-engine-active-name" data-engine-active-name>${escapeHtml(first.label.toUpperCase())}</span>
                  <span class="xaudit-engine-active-pill xaudit-engine-active-pill-${first.kind}" data-engine-active-pill>${first.kind === "rewarded" ? "Rewarded" : "Punished"}</span>
                </div>
                <div class="xaudit-engine-active-desc" data-engine-active-desc>${escapeHtml(first.desc)}</div>
              </div>
            </div>

            <div class="xaudit-engine-progress">
              <div class="xaudit-engine-progress-meta">
                <span class="xaudit-engine-progress-num">Signal <span data-engine-progress-num>1</span> of 14 · mapping engagement signals</span>
                <span class="xaudit-engine-progress-pct"><span data-engine-progress-pct>7</span>%</span>
              </div>
              <div class="xaudit-engine-progress-bar">
                <div class="xaudit-engine-progress-fill" data-engine-progress-fill style="width:7.14%"></div>
              </div>
            </div>
          </div>

          <article class="xaudit-engine-rewrite-panel">
            <div class="xaudit-engine-kicker">${engineIcon("penLine", 11)}<span>Awaiting rewrite</span></div>
            <div class="xaudit-engine-skeleton" aria-hidden>${skeletonHtml}</div>
            <div class="xaudit-engine-rewrite-foot">${engineIcon("lock", 11)}<span>${escapeHtml(label || "Will appear when grading completes")}</span></div>
          </article>
        </div>
      </section>
    `;
  }

  // Advances the engine state every SIGNAL_DURATION_MS while the loading screen is on screen.
  function startStormRotation() {
    const total = ENGINE_SIGNALS.length;
    let i = 0;
    const apply = () => {
      const steps = document.querySelectorAll("[data-engine-step]");
      const chips = document.querySelectorAll("[data-engine-chip]");
      if (!steps.length || !chips.length) return;

      steps.forEach((step, idx) => {
        const isActive = idx === i;
        step.classList.toggle("is-active", isActive);
        step.classList.toggle("is-done", idx < i);
        const arrow = step.querySelector(".xaudit-engine-step-arrow");
        if (isActive && !arrow) {
          const a = document.createElement("span");
          a.className = "xaudit-engine-step-arrow";
          a.setAttribute("aria-hidden", "true");
          step.appendChild(a);
        } else if (!isActive && arrow) {
          arrow.remove();
        }
      });

      chips.forEach((chip, idx) => {
        chip.classList.toggle("is-active", idx === i);
        chip.classList.toggle("is-done", idx < i);
      });

      const current = ENGINE_SIGNALS[i];
      const graded = Math.min(i + 1, total);
      const progressPct = (graded / total) * 100;
      const stepsFillPct = (i / (total - 1)) * 100;

      const iconEl = document.querySelector("[data-engine-active-icon]");
      if (iconEl) iconEl.innerHTML = engineIcon(current.icon, 22);
      const nameEl = document.querySelector("[data-engine-active-name]");
      if (nameEl) nameEl.textContent = current.label.toUpperCase();
      const pillEl = document.querySelector("[data-engine-active-pill]");
      if (pillEl) {
        pillEl.className = `xaudit-engine-active-pill xaudit-engine-active-pill-${current.kind}`;
        pillEl.textContent = current.kind === "rewarded" ? "Rewarded" : "Punished";
      }
      const descEl = document.querySelector("[data-engine-active-desc]");
      if (descEl) descEl.textContent = current.desc;
      const card = document.querySelector("[data-engine-active-card]");
      if (card) {
        card.classList.remove("is-flash");
        void card.offsetWidth;
        card.classList.add("is-flash");
      }

      const headFill = document.querySelector("[data-engine-head-fill]");
      if (headFill) headFill.style.width = `${progressPct}%`;
      const gradedEl = document.querySelector("[data-engine-graded]");
      if (gradedEl) gradedEl.textContent = String(graded);
      const stepsFill = document.querySelector("[data-engine-steps-fill]");
      if (stepsFill) stepsFill.style.width = `${stepsFillPct}%`;
      const progFill = document.querySelector("[data-engine-progress-fill]");
      if (progFill) progFill.style.width = `${progressPct}%`;
      const progNum = document.querySelector("[data-engine-progress-num]");
      if (progNum) progNum.textContent = String(graded);
      const progPct = document.querySelector("[data-engine-progress-pct]");
      if (progPct) progPct.textContent = String(Math.round(progressPct));
    };
    // The template renders i=0 initially. Each tick advances to the next signal,
    // saturating at the last one so the UI doesn't loop back while Gemini finishes.
    return window.setInterval(() => {
      i = Math.min(i + 1, total - 1);
      apply();
    }, SIGNAL_DURATION_MS);
  }

  function errorPhase(msg, openPath) {
    return `
      <div class="xaudit-phase-error">
        <h2 class="xaudit-phase-title">Couldn't grade that.</h2>
        <p class="xaudit-phase-sub">${escapeHtml(msg)}</p>
        ${openPath ? `<button type="button" class="xaudit-btn-primary" data-xaudit-open="${escapeAttr(openPath)}">${openPath === "/login" ? "Sign in to xAudit" : "Open xAudit"}</button>` : ""}
      </div>
    `;
  }

  // Iframe-based result phase — restores the full RecommendedRewrite UI
  // (bridge cards, signal callouts, predicted-lift badge, copy button).
  // X.com's CSP would normally block this iframe, but our manifest
  // declares a declarativeNetRequest rule (rules.json) that strips the
  // CSP header from x.com / twitter.com responses, allowing the iframe
  // to load. Industry-standard pattern for x.com-modifying extensions.
  function resultPhase(result, shareId) {
    const primary =
      (result.rewrites || []).find((r) => r.is_primary) ||
      result.rewrites?.[0] ||
      {};
    const lift = primary.predicted_lift ?? 0;
    const theme = getOverlayTheme();
    return `
      <div class="xaudit-phase-result">
        <iframe class="xaudit-embed-iframe"
                src="${XAUDIT_URL}/v/${shareId}/embed?theme=${theme}"
                title="xAudit comparison"
                loading="eager"></iframe>
        <div class="xaudit-result-actions">
          ${lift > 0 ? `<span class="xaudit-result-lift">↑ +${lift} pts predicted lift</span>` : ""}
          <button type="button" class="xaudit-btn-primary" data-xaudit-open="/v/${shareId}?${UTM}">Open in xAudit ↗</button>
        </div>
      </div>
    `;
  }

  function attachActionHandlers(root) {
    root.querySelectorAll("[data-xaudit-open]").forEach((b) => {
      b.addEventListener("click", (e) => {
        const path = e.currentTarget.getAttribute("data-xaudit-open") || "/";
        chrome.runtime.sendMessage({ type: "XAUDIT_OPEN", path });
        removeOverlay();
      });
    });
    root.querySelectorAll("[data-xaudit-copy]").forEach((b) => {
      b.addEventListener("click", async (e) => {
        const target = e.currentTarget;
        const text = target.getAttribute("data-xaudit-copy") || "";
        try {
          await navigator.clipboard.writeText(text);
          const original = target.textContent;
          target.textContent = "Copied ✓";
          target.classList.add("is-copied");
          window.setTimeout(() => {
            target.textContent = original;
            target.classList.remove("is-copied");
          }, 1400);
        } catch {
          // noop
        }
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function bgFetch(path, init) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "XAUDIT_FETCH", path, init }, (response) => {
        resolve(response);
      });
    });
  }

  function readComposeDraft() {
    const el =
      document.querySelector("[data-testid='tweetTextarea_0']") ||
      document.querySelector("div[role='textbox'][contenteditable='true']");
    if (!el) return null;
    const text = el.innerText.trim();
    return text || null;
  }

  function statusUrlFromPath() {
    const m = window.location.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/);
    return m ? `https://x.com/${m[1]}/status/${m[2]}` : null;
  }

  // ─────────────────────────────────────────────────────────────
  // The unified "audit input" flow
  // ─────────────────────────────────────────────────────────────

  async function auditInput({ text, tweetUrl }) {
    const body = buildOverlayShell();

    // Initial storm shows the user-provided draft (if any). If we're
    // about to fetch the tweet text, we'll rerender with the real text
    // after the fetch lands.
    setOverlayPhase(
      body,
      scanningPhase(
        tweetUrl ? "Pulling the post’s text…" : "Will appear when grading completes",
        text || (tweetUrl ? "Fetching the post…" : "Your draft")
      )
    );
    let chipInterval = startStormRotation();
    const stopStorm = () => {
      if (chipInterval) { window.clearInterval(chipInterval); chipInterval = null; }
    };

    let draftText = text;
    let media = [];
    let tweetMeta = null;

    // Step A: fetch tweet content if URL given
    if (!draftText && tweetUrl) {
      const fetchRes = await bgFetch("/api/fetch-tweet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: tweetUrl }),
      });
      const currentBody = document.getElementById("xaudit-overlay-body");
      if (!currentBody) { stopStorm(); return; }
      if (!fetchRes?.ok || fetchRes.status >= 400) {
        stopStorm();
        let parsed = {};
        try { parsed = JSON.parse(fetchRes?.body ?? "{}"); } catch {}
        setOverlayPhase(currentBody, errorPhase(parsed.error || fetchRes?.error || "Couldn't fetch the post.", null));
        attachActionHandlers(currentBody);
        return;
      }
      let fetched;
      try { fetched = JSON.parse(fetchRes.body); } catch {
        stopStorm();
        setOverlayPhase(currentBody, errorPhase("Couldn't parse the fetched post.", null));
        attachActionHandlers(currentBody);
        return;
      }
      draftText = fetched?.tweet?.text || "";
      media = (fetched?.tweet?.media || []).map((m) => ({
        type: m.type,
        durationSec: m.durationSec,
      }));
      tweetMeta = fetched?.tweet?.author || null;
      // Re-render storm with the real fetched draft so the user sees it
      // being scanned. Restart the chip rotation on the new DOM.
      stopStorm();
      setOverlayPhase(
        currentBody,
        scanningPhase("Will appear when grading completes", draftText)
      );
      chipInterval = startStormRotation();
    }

    if (!draftText) {
      stopStorm();
      const currentBody = document.getElementById("xaudit-overlay-body");
      if (!currentBody) return;
      setOverlayPhase(currentBody, errorPhase("No draft text found on this page.", "/"));
      attachActionHandlers(currentBody);
      return;
    }

    // Step B: analyze
    const analyzeRes = await bgFetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: draftText,
        media,
        tweetUrl,
        tweetAuthor: tweetMeta?.screen_name,
      }),
    });

    stopStorm();

    const currentBody = document.getElementById("xaudit-overlay-body");
    if (!currentBody) return;

    if (!analyzeRes?.ok) {
      setOverlayPhase(currentBody, errorPhase(analyzeRes?.error || "Network error.", "/"));
      attachActionHandlers(currentBody);
      return;
    }
    if (analyzeRes.status >= 400) {
      let parsed = {};
      try { parsed = JSON.parse(analyzeRes.body); } catch {}
      const isGate = analyzeRes.status === 402;
      setOverlayPhase(
        currentBody,
        errorPhase(parsed.error || `HTTP ${analyzeRes.status}`, isGate ? "/login" : "/")
      );
      attachActionHandlers(currentBody);
      return;
    }
    let parsed;
    try { parsed = JSON.parse(analyzeRes.body); } catch {
      setOverlayPhase(currentBody, errorPhase("Couldn't parse response.", null));
      attachActionHandlers(currentBody);
      return;
    }

    const shareId = parsed.share_id;
    if (!shareId) {
      setOverlayPhase(currentBody, errorPhase("Analysis ran but no share link returned. Try Open in xAudit.", "/"));
      attachActionHandlers(currentBody);
      return;
    }

    setOverlayPhase(currentBody, resultPhase(parsed, shareId));
    attachActionHandlers(currentBody);
  }

  // ─────────────────────────────────────────────────────────────
  // Smart context handler (extension icon)
  // ─────────────────────────────────────────────────────────────

  function auditCurrentContext() {
    const pathname = window.location.pathname;
    const draft = readComposeDraft();
    if (draft && draft.length > 5) {
      auditInput({ text: draft });
      return;
    }
    const tweetUrl = statusUrlFromPath();
    if (tweetUrl) {
      auditInput({ tweetUrl });
      return;
    }
    chrome.runtime.sendMessage({ type: "XAUDIT_OPEN", path: `/?${UTM}` });
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "XAUDIT_TRIGGER") {
      auditCurrentContext();
      sendResponse({ ok: true });
    }
    return false;
  });

  // ─────────────────────────────────────────────────────────────
  // Boot
  // ─────────────────────────────────────────────────────────────

  scan();
  const observer = new MutationObserver(() => {
    if (observer._pending) return;
    observer._pending = true;
    requestAnimationFrame(() => {
      observer._pending = false;
      scan();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
