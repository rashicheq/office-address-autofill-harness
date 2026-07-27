# Office Address Autofill — Test Harness

Local harness for validating the Office Address Autofill V2 ranking, formatting, and confidence-scoring logic against mock data (and now, optionally, real Google Places data). See `CLAUDE.md` for full PM/context and `docs/PRD_Office_Address_Autofill.md` for the product spec.

## Run it

```
npm install
npm run dev
```

This starts the backend on `http://localhost:8787` and the frontend on `http://localhost:5173` (which proxies `/search`, `/search/batch`, `/scenarios`, and `/meta` to the backend). Open the frontend URL and toggle between **User Mode / Developer Mode** and **Mock Data / Live API**.

## Using the Live API (optional — real, billed Google calls)

Mock Data needs no setup and is the default. To also run real searches against Google Places:

1. In a Google Cloud project with **Places API (New)** enabled and billing attached, create an API key.
2. `cp backend/.env.example backend/.env`, then edit `backend/.env` and paste the key into `GOOGLE_PLACES_API_KEY=`. This file is gitignored — it never gets committed.
3. Restart the backend (`npm run dev` again if it was already running). The TopBar's **Live API** button will now show "real calls" instead of "not configured", and `GET /meta` reports `liveApiConfigured: true`.
4. Switch the Data Source toggle to **Live API**. Every search now makes a real, billed call to Google Places Text Search (New) — same formatting pipeline, ranker, and confidence scorer as Mock Data, so results are directly comparable.

Without a key, Live API stays exactly as before: visibly selectable but a clearly-flagged, no-network stub.

### Running a batch of office names

Developer Mode has a **Batch search** section: paste one office name per line (e.g. a list of 20) and click **Run batch** — each name goes through the same per-name pipeline as a single search (mock or live, whichever is toggled), throttled between calls in Live mode to stay under rate limits. Click a row to expand its full result detail (address lines, City/State/Pincode, `FiltersApplied`, confidence breakdown), or **Export CSV** for a spreadsheet-friendly version of the whole batch.

## Structure

- `backend/` — Express API.
  - `src/lib/ranker.js` — `sort_office_addresses.py` ported to JS (haversine distance, fallback_relevance, stable tie-break).
  - `src/lib/formattingPipeline.js` — a **harness-local reimplementation** of the PRD Section 5 formatting rules, now also extracting City/State/Pincode alongside the 3 address lines. `address_filter_pipeline_v2.py` is not in this repo, so this is explicitly flagged as a stand-in, not the canonical script (see the file header and the `pipelineImplementation` field on every response).
  - `src/lib/confidence.js` — the confidence scorer, weights approved by Rashi 2026-07-19 (see CLAUDE.md Section 4.0).
  - `src/lib/fuzzyMatch.js` — office-name matching against the mock fixture set.
  - `src/lib/mockSearch.js` — the Mock Data path: fixture lookup -> formatting pipeline -> ranker -> confidence.
  - `src/lib/livePlacesClient.js` — thin wrapper around Google Places Text Search (New).
  - `src/lib/liveSearch.js` — the Live API path: real Places call -> Google-response normalizer (incl. untyped-component decomposition for messy real data) -> the SAME formatting pipeline / ranker / confidence used by Mock Data. Also the "no key configured" stub.
  - `src/data/fixtures.json` — the 4 real companies from `sort_office_addresses.py` plus named edge-case scenarios.
- `frontend/` — React app (Vite). Single codebase, mode/data-source toggles rather than separate apps. `components/DeveloperMode/BatchRunner.jsx` is the batch-search UI.

## Tests

```
npm run test:backend
```

Covers the ranker, the formatting pipeline's rule precedence, and fuzzy matching.
