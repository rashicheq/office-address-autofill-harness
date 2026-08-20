# Office Address Autofill — Test Harness

Local harness for validating the Office Address Autofill V2 ranking, formatting, and confidence-scoring logic against mock data (and now, optionally, real Google Places data). See `CLAUDE.md` for full PM/context, `docs/PRD_Office_Address_Autofill_V2.md` for the current, as-built product spec (flow, Google API integration split, field model, test cases, open questions), `docs/PRD_Places_Autocomplete_Prefill.md` for the formal FR/AC-numbered spec behind the Career-Info-prefill mechanic and the field-editability rule, and `docs/PRD_Office_Address_Autofill.md` for the original pre-build draft it all supersedes.

**Want to click through the flow without running `npm install`/`npm run dev` at all?** Open `docs/office_address_autofill_prototype.html` directly in any browser — it's a single self-contained file (no server, no build step, works offline) that ports the same Career-Info-to-address-confirm flow, mock data, and field-editability rules into plain HTML/CSS/JS. Useful for demos or sharing with people who don't have Node set up; the full app below is still the source of truth for anything that needs to keep evolving.

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

Developer Mode has a **Batch search** section: paste one office name per line (e.g. a list of 20) and click **Run batch** — each name goes through the same per-name pipeline as a single search (mock or live, whichever is toggled), throttled between calls in Live mode to stay under rate limits. Click a row to expand its full result detail (Office Floor/Tower, Office Block/Building Name, Area/Locality, City/District, State, Pincode, `FiltersApplied`, confidence breakdown), or **Export CSV** for a spreadsheet-friendly version of the whole batch.

### Career Info flow (User Mode)

User Mode opens on **Company Details** (name/designation/email/experience). Submitting it takes you straight to the address page — the only two screens in the whole flow (2026-08: no bottom sheet, no separate search-only step either). That address page always shows the complete form; **"Selected location"** doubles as both the search query box (pre-filled with the company name) and the display of whatever's resolved, with an explicit **Search** button right beside it — nothing is looked up until you click it (or press Enter). This mocks Google Places Autocomplete (no key/setup for that API either) via `GET /suggest`, scanning the fixture set:

- **Office** suggestions (a real company/place) resolve to that candidate's full data.
- **Area** suggestions (a bare locality, e.g. "Koramangala") resolve the same way, just with far fewer raw components to work with — see the field model below.
- Multiple branches (e.g. "Vantage Corp") show **every branch as its own row directly in the dropdown**, closest first — the user picks the specific office they work at in one step, no second picker screen.
- No match → never a dead end: a few **random nearby areas** are suggested anyway (`fallbackAreas`, 3 picked at random from the area fixtures each time), with a "📍 Search a different area" button below them to clear the query and try again; typing straight into the fields below "Selected location" always works too, whether or not you ever search.

**Address fields — "the rules script" (rewritten 2026-08):** `frontend/src/lib/addressLineConfig.js` builds Address Line 1/2/3 from Google's own `formattedAddress` string, not a join of specific typed component types. The rules, in order: (1) strip whatever's already captured as City/State/Pincode out of the string, so it's never repeated in the address lines too; (2) split what's left at comma boundaries only — a comma-element is atomic, never split mid-phrase; (3) never drop an element unless it was a City/State/Pincode duplicate; (4) the element that's an actual plot/building number (not just any element containing a digit, which would wrongly grab a floor descriptor like "1st Floor" instead) anchors **Address Line 1**; everything else splits across Line 2/3; (5) if nothing has a number, just distribute every element across Line 1/2/3 (still never leaving Line 1 empty when there are fewer elements than lines). **This reverses the earlier "Address Line 1 is never auto-filled" rule** — Line 1 is now populated same as Line 2/3 on every result, still the one field that stays editable once the rest lock. A `hasNumberInLine1` flag drives the hint text ("add a building/floor number" when rule 5 fired instead of rule 4). City/District, State, and Pincode are still simple passthroughs, unchanged.

**Field editability (2026-08 Places-Autocomplete-prefill PRD):** once a result comes from a Places pick, every field it populated — Line 2/3, Pincode, City/District, State — is **read-only**; Address Line 1 stays editable regardless. Before anything resolves, every field is a normal editable input. The Search button stays disabled until the query has 3+ characters, and the real Places Text Search call (when a key is configured) sends `regionCode: "IN"` and biases the query text toward office-type results.

No Maps JavaScript API, Geocoding API, or Places Autocomplete API call is made anywhere — see `CLAUDE.md` Section 4.0 for what wiring in the real ones later would need.

## Structure

- `backend/` — Express API.
  - `src/lib/ranker.js` — `sort_office_addresses.py` ported to JS (haversine distance, fallback_relevance, stable tie-break).
  - `src/lib/formattingPipeline.js` — a **harness-local reimplementation** of the PRD Section 5 formatting rules (tiers, abbreviation, drop-to-fit, the sparse-data rule). `address_filter_pipeline_v2.py` is not in this repo, so this is explicitly flagged as a stand-in, not the canonical script (see the file header and the `pipelineImplementation` field on every response). **Dev Mode only as of the 2026-08 field-model pivot** — User Mode's confirm screen no longer consumes this pipeline's output; see `frontend/src/lib/addressLineConfig.js` below and CLAUDE.md's "User Mode field-model pivot" note.
  - `src/lib/confidence.js` — the confidence scorer, weights approved by Rashi 2026-07-19 (see CLAUDE.md Section 4.0).
  - `src/lib/fuzzyMatch.js` — office-name matching against the mock fixture set.
  - `src/lib/mockSearch.js` — the Mock Data path: fixture lookup -> formatting pipeline -> ranker -> confidence.
  - `src/lib/livePlacesClient.js` — thin wrapper around Google Places Text Search (New).
  - `src/lib/liveSearch.js` — the Live API path: real Places call -> Google-response normalizer (incl. untyped-component decomposition for messy real data) -> the SAME formatting pipeline / ranker / confidence used by Mock Data. Also the "no key configured" stub.
  - `src/data/fixtures.json` — the 4 real companies from `sort_office_addresses.py`, named edge-case scenarios (including `sparse-components`, the 50%-missing demo), and `kind: "area"` entries used both by real area suggestions and by the random no-match fallback.
  - `listSuggestions` / `listFallbackAreaSuggestions` (in `mockSearch.js`) — back `GET /suggest`'s two response fields: real matches, and (2026-08) a handful of random area suggestions shown whenever the real match list is empty, so a no-match search is never a dead end.
- `frontend/` — React app (Vite). Single codebase, mode/data-source toggles rather than separate apps.
  - `src/lib/addressLineConfig.js` — "the rules script" for User Mode (2026-08 rewrite): builds Address Line 1/2/3 from a result's raw `formattedAddress` string per the 5 rules above, not a rules engine on the backend. This is what the confirm screen actually uses now; `addressComponents` is still consulted, but only for City/State/Pincode.
  - `components/DeveloperMode/ResultCard.jsx` — the structured-field result display (old rules-engine output), shared by the single-search view and the batch runner. Dev Mode only.
  - `components/DeveloperMode/BatchRunner.jsx` — the batch-search UI.
  - `components/UserMode/CompanyDetailsView.jsx` — the Career Info intake screen (Company Name feeds the search).
  - `components/UserMode/OfficeSearchPanel.jsx` — renders the Search button beside "Selected location" plus, when there's something to show, the results/no-match/fallback-area list underneath — not a separate screen or panel of its own (2026-08).
  - `components/UserMode/UserModeView.jsx` — the one address screen: Selected location + Search, Address Line 1/2/3, City/District, State, Pincode.

## Tests

```
npm run test:backend
npm run test:frontend
```

Backend covers the ranker, the formatting pipeline's rule precedence (including the structured-field mapping and the sparse-data rule), the live-response normalizer, and fuzzy matching. Frontend (new 2026-08, this harness's first) covers `addressLineConfig.js`'s rules script — duplicate-stripping, comma-atomicity, the plot-number-vs-floor-descriptor heuristic, the sparse-address edge case, and traces through the CheQ/Vantage/Koramangala/Silver-Oak fixtures by name.
