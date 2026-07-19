# Office Address Autofill — Test Harness

Local harness for validating the Office Address Autofill V2 ranking, formatting, and confidence-scoring logic against mock data. See `CLAUDE.md` for full PM/context and `docs/PRD_Office_Address_Autofill.md` for the product spec.

## Run it

```
npm install
npm run dev
```

This starts the backend on `http://localhost:8787` and the frontend on `http://localhost:5173` (which proxies `/search`, `/scenarios`, and `/meta` to the backend). Open the frontend URL and toggle between **User Mode / Developer Mode** and **Mock Data / Live API**.

Live API is a visible-but-stubbed option in this phase — see CLAUDE.md Section 4.0. No Google API key is required or used anywhere in this repo yet.

## Structure

- `backend/` — Express API.
  - `src/lib/ranker.js` — `sort_office_addresses.py` ported to JS (haversine distance, fallback_relevance, stable tie-break).
  - `src/lib/formattingPipeline.js` — a **harness-local reimplementation** of the PRD Section 5 formatting rules. `address_filter_pipeline_v2.py` is not in this repo, so this is explicitly flagged as a stand-in, not the canonical script (see the file header and the `pipelineImplementation` field on every response).
  - `src/lib/confidence.js` — the confidence scorer, weights approved by Rashi 2026-07-19 (see CLAUDE.md Section 4.0).
  - `src/lib/fuzzyMatch.js` — office-name matching against the mock fixture set.
  - `src/data/fixtures.json` — the 4 real companies from `sort_office_addresses.py` plus named edge-case scenarios.
- `frontend/` — React app (Vite). Single codebase, mode/data-source toggles rather than separate apps.

## Tests

```
npm run test:backend
```

Covers the ranker, the formatting pipeline's rule precedence, and fuzzy matching.
