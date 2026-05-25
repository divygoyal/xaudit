# xAudit

> Paste your X draft. See if the algorithm will care.

xAudit grades X (Twitter) post drafts against a directional engagement-signal rubric.

No folklore. No "post at 9am" hacks. Just practical signal checks plus rewrites that strengthen the weakest ones.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Google Gen AI SDK (`gemini-3.5-pro`, swap to `gemini-3.5-flash` for speed/cost)

## Run locally

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>.

### Optional: real Gemini grading

Without a key, `/api/analyze` returns a canned sample analysis with `is_mock: true`.

To enable live grading, create `.env.local` (get a key at <https://aistudio.google.com/apikey>):

```env
GEMINI_API_KEY=AIzaSy...
```

Then restart `npm run dev`. Default model is `gemini-3.5-flash` — swap to `gemini-3.5-pro` in `app/api/analyze/route.ts` for max quality.

## Architecture

- `app/page.tsx` — landing page composition
- `app/api/analyze/route.ts` — POST endpoint; calls Gemini with the signal rubric, falls back to mock if no key
- `lib/rubric.ts` — system prompt with hard rules: signal-based feedback, no invented weights, no folklore
- `lib/sample-data.ts` — the canned analysis used for the public sample + the no-key fallback
- `components/*` — section components (hero, analyzer, signals strip, etc.)
- `tailwind.config.ts` — warm dark palette + display fonts

## Design notes

- **Typography**: Instrument Serif (italic accent) + Geist Sans (body) + Geist Mono (labels)
- **Palette**: warm near-black `#0c0b09` background, paper-cream foreground `#f6f3e9`, vermillion `#ff4500` accent
- **Hero signature**: italic-serif "algorithm" anchored by an animated hand-drawn underline
