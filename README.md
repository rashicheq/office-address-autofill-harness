# Office Address Autofill — Test Harness

Local harness for validating the Office Address Autofill V2 ranking, formatting, and confidence-scoring logic against mock data (and now, optionally, real Google Places data). See `CLAUDE.md` for full PM/context, `docs/PRD_Office_Address_Autofill_V2.md` for the current, as-built product spec (flow, Google API integration split, field model, test cases, open questions), `docs/PRD_Places_Autocomplete_Prefill.md` for the formal FR/AC-numbered spec behind the Career-Info-prefill mechanic and the field-editability rule, and `docs/PRD_Office_Address_Autofill.md` for the original pre-build draft it all supersedes.

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

User Mode opens on **Company Details** (name/designation/email/experience). Submitting it opens a full-page bottom sheet immediately — a search bar pre-filled with the company name ("like Google Maps' search bar, but without the map view"), with live suggestions as you type. This mocks Google Places Autocomplete (no key/setup for that API either) via `GET /suggest`, scanning the fixture set:

- **Office** suggestions (a real company/place) resolve to that candidate's full data.
- **Area** suggestions (a bare locality, e.g. "Koramangala") resolve the same way, just with far fewer raw components to work with — see the field model below.
- Multiple branches (e.g. "Vantage Corp") show **every branch as its own row directly in the dropdown**, closest first — the user picks the specific office they work at in one step, no second picker screen.
- No match → a **"📍 Search area" CTA sits right next to the search bar** (not a buried message) so you can pivot straight into an area search; "Enter address manually instead" stays as a secondary fallback — never a dead end.

Office name and area are independent once resolved: the confirm screen shows **two rows** — "Office name" (a plain editable field, no re-search action of its own) and "Area" (only when a locality match was picked, with its own "Search area" button that reopens the sheet seeded with the area's current value).

**Address fields (2026-08 pivot):** the confirm screen no longer uses the backend rules engine at all. `frontend/src/lib/addressLineConfig.js` builds **Address Line 2** (subpremise + premise + street_number) and **Address Line 3** (route) directly from the raw Google-typed components — no abbreviation, no dropping, no length budget. **Address Line 1 is never auto-filled, for any result** — the user always types it (floor number, building/tower name), and "Confirm and Continue" is disabled until it has text. City/District, State, and Pincode are still simple passthroughs, unchanged. This is independent, user-owned state exactly like Office name — re-searching the office or area never clears whatever's already typed into Line 1.

**Field editability (2026-08 Places-Autocomplete-prefill PRD):** once a result comes from a Places pick, every field it populated — Line 2/3, Pincode, City/District, State — is **read-only**; only Address Line 1 accepts typing. In full manual entry (no Places result at all), every field is a normal editable input. The search sheet also now withholds suggestions until the query has 3+ characters, and the real Places Text Search call (when a key is configured) sends `regionCode: "IN"` and biases the query text toward office-type results.

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
  - `src/data/fixtures.json` — the 4 real companies from `sort_office_addresses.py`, named edge-case scenarios (including `sparse-components`, the 50%-missing demo), and `kind: "area"` entries used by the search-sheet's area suggestions.
  - `listSuggestions` (in `mockSearch.js`) — backs `GET /suggest`, the mocked autocomplete for the search sheet.
- `frontend/` — React app (Vite). Single codebase, mode/data-source toggles rather than separate apps.
  - `src/lib/addressLineConfig.js` — the **2026-08 field-model pivot**: builds Address Line 2/3 directly from a result's raw `addressComponents`, no rules engine involved. This is what User Mode's confirm screen actually uses now.
  - `components/DeveloperMode/ResultCard.jsx` — the structured-field result display (old rules-engine output), shared by the single-search view and the batch runner. Dev Mode only.
  - `components/DeveloperMode/BatchRunner.jsx` — the batch-search UI.
  - `components/UserMode/CompanyDetailsView.jsx` — the Career Info intake screen (Company Name feeds the search).
  - `components/UserMode/OfficeSearchSheet.jsx` — the search-bar bottom sheet (office/area suggestions + multi-branch picker).
  - `components/UserMode/UserModeView.jsx` — the confirm screen: Office name, Area (when applicable), Address Line 1/2/3, City/District, State, Pincode.

## Tests

```
npm run test:backend
```

Covers the ranker, the formatting pipeline's rule precedence (including the structured-field mapping and the sparse-data rule), the live-response normalizer, and fuzzy matching.
