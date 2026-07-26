# My Fintech Newsletter

A personal daily brief generator for a credit card PM: fetch fintech/card news section by section (each section is its own isolated Claude + web-search call), get a synthesized LinkedIn angle and reflection questions, browse an archive, and pull every Credit Card Deep Dive story across days into one searchable feed.

This is a separate, self-contained app living alongside the (unrelated) Office Address Autofill harness in this repo — it does not share code, dependencies, or tooling with `backend/`/`frontend/` at the repo root.

## Setup

```
cd fintech-newsletter
npm install
cp backend/.env.example backend/.env
# edit backend/.env and set ANTHROPIC_API_KEY
npm run dev
```

This starts the backend on `http://localhost:8788` and the frontend on `http://localhost:5174` (proxies `/api` and `/health` to the backend). Open the frontend URL.

Without `ANTHROPIC_API_KEY` set, the backend still starts (and logs a warning) but every fetch/synthesis/top-cards call will fail — there is no mock mode in this app, every request is a real Claude API call with the web-search tool.

## How it's organized

- `backend/` — Express API. One route per Claude call, matching the "own isolated fetch, own token budget" design from the original prototype:
  - `POST /api/sections/:key/fetch` — fetch one news section for a date (10 sections: Credit Card Deep Dive, Co-Branded Cards, Policy & Regulation, Tech Developments, Partnerships & Deals, User Sentiment, Patterns, Market Shifts, Adjacent Trends, AI & Fintech).
  - `POST /api/synthesis` — regenerate the LinkedIn angle + reflection questions from a date's fetched sections. Non-fatal by design: if it fails, the day's sections are unaffected and synthesis just doesn't update this time.
  - `POST /api/top-cards` — generate "Top Cards of the Month" from a date's fetched signals (or fresh research if none exist yet).
  - `GET /api/briefs`, `GET /api/briefs/:date`, `DELETE /api/briefs` — archive read/clear.
  - `src/lib/anthropicClient.js` — the only place that calls the Anthropic API. Holds the model/effort/web-search-tool constants (`src/config.js`), handles the `refusal` stop reason, and retries once with a stricter "JSON only" instruction if the model's response doesn't parse — after that it surfaces the raw model output in an error field rather than silently losing it.
  - `src/lib/storage.js` — flat JSON files under `data/briefs/YYYY-MM-DD.json`. No separate index file: the directory listing *is* the index, so there's nothing to fall out of sync.
  - `config/system_prompts/*.md` — every system prompt (10 sections + synthesis + top-cards) lives here as its own file, read fresh on every request. Edit a prompt and it takes effect on the next call, no restart needed.
- `frontend/` — React (Vite + Tailwind v4). Four tabs: Today's Brief, Archive, CC Key Insights, Backend (a debug/audit view of what's stored — same idea as Dev Mode in the address-autofill harness, for trust-checking rather than daily reading).

## What's verified vs. not

Verified without a live API key: the server boots, routes are wired up, the JSON-parsing/repair logic (`test/jsonParse.test.js`) passes against synthetic model output (valid JSON, markdown-fenced JSON, and a truncated-object repair case).

**Not verified**: an actual end-to-end Claude + web-search call. This sandbox has no `ANTHROPIC_API_KEY`, so the model name (`claude-opus-5`), the `web_search_20260209` tool, and the effort/thinking configuration in `src/config.js` and `src/lib/anthropicClient.js` are implemented against the current Claude API docs but not exercised against the real API. Run `npm run dev`, fetch one section, and check `backend`'s console output and the raw response before trusting the rest.

## Cost note

Defaults to `claude-opus-5` per current guidance (never silently downgrade for cost). A full "fetch everything" pass is ~12 separate Claude calls (10 sections + synthesis + top cards), each with web search — that adds up over a month of daily use. `src/config.js` has `MODEL` and `EFFORT` as named constants specifically so this is a one-line change to `claude-sonnet-5` (roughly a third of the cost) if the quality trade-off is acceptable for a personal daily-read tool — worth checking output quality on both before deciding.
