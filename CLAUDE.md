# CLAUDE.md — Office Address Autofill Test Harness

This file is read automatically by Claude Code at the start of every session in this repo. It carries the PM context, the PRD, and the build rules so you don't have to re-brief on every session.

---

## 1. Who this is for / operating style

Owner: Rashi, PM on Credit Cards (pre-onboarding funnel). Full working style is in `docs/rashi-pm-operating-charter.md` (copy it into this repo if not already there) — short version: action-oriented, wants direct pushback on vague framing, always wants the metric named, expects feasibility/scale concerns flagged early, wants outside-in context (what other issuers do) where relevant. Apply this to *how you communicate*, not just to product brainstorming — if a build request here is underspecified (e.g. "make it work" with no definition of "confidence"), say so and propose a concrete default rather than silently guessing.

## 2. What this repo is

A **local test harness** — not the production feature — for validating the Office Address Autofill V2 solution (see full PRD at `docs/PRD_Office_Address_Autofill.md`). It exists so Rashi can:

1. Type an office name and see what Google Places actually returns.
2. See those results run through the existing formatting/ranking logic.
3. Toggle into a mode that exposes the raw API call, the raw response, and every decision the pipeline made — so failures are diagnosable, not mysterious.
4. See a self-rated confidence % per result, with the inputs to that score shown, not just the number.

This is explicitly **V2** (fully automated fetch-and-arrange), not V1 (map-assisted manual pin) — see PRD Section 3 for why V1 ships first in production, but this harness is for validating the V2 script/ranking logic ahead of that decision.

## 3. Product requirements this must respect (from the PRD)

### 3.1 Address formatting rules (`address_filter_pipeline_v2.py` — already built, treat as source of truth if present in repo; otherwise stub it out and flag that it's a stub)

Precedence, checked in this exact order — do not reorder:
1. Can all address components fit across 3 lines (each ≤32 chars) using abbreviation only (Road→Rd, Building→Bldg, etc.)? If yes, nothing is dropped.
2. If not, find the *smallest* set of components to drop, by priority tier:
   - **Critical, never droppable:** `subpremise`, `premise`, `street_number`
   - **High, drop only if no sparing combination works (flagged when it happens):** `route`
   - **Medium, droppable if needed:** `sublocality_level_2`, `sublocality_level_3`
   - **Lower, most easily dropped:** `sublocality_level_1`, `neighborhood`, `landmark`
3. Only if a single remaining component still doesn't fit on its own line, shorten it at natural punctuation (comma/dash) — never mid-word. Word-level cuts are a loud, flagged last resort.
4. Line 1 must end with a digit. If none exists anywhere in the address, default `"1, "` onto Line 1 and set `Flag:DefaultNumberInserted` — never silently ship a fake-looking number.

**Every drop, abbreviation, shorten, or default must be recorded in a `FiltersApplied` list** — this is what Developer Mode surfaces per result.

### 3.2 Proximity ranking (`sort_office_addresses.py` — in this repo)

- Sorts multiple office matches by haversine distance from the user's current-address geocode, closest first.
- If current-address geocode is unavailable (TC-17/TC-19), falls back to **preserving Google's own relevance order** — never fabricate a distance sort. Return `ranking_method: "fallback_relevance"` and surface this explicitly in Dev Mode.
- Ties/near-ties (TC-18) keep Google's original relative order (stable sort) as the implicit tie-break.
- Port this Python logic into the backend (Node) or shell out to Python — your call, but keep the same edge-case behavior and the same `ranking_method` / `distance_km` fields so the frontend logic doesn't need to know which.

### 3.3 Test cases the harness should be able to reproduce / demonstrate

Priority P0 cases to actually exercise in this harness (not just document):
- TC-1: multiple branches of one company → ordered closest→farthest
- TC-3: no match found → empty state, never a dead end
- TC-4: address can't be made compliant even after all fallbacks → route to manual entry, same as TC-3
- TC-6: generic office name → query should combine name + "office"/"corporate office" + city context to narrow results
- TC-9: address is stale in Google → every pre-filled field stays editable, always
- TC-11: no numeric component anywhere → `Flag:DefaultNumberInserted` fires and is visible
- TC-17/TC-19: no usable current-address geocode → fallback_relevance, not fake distance

P1/P2 (worth having, not blocking): TC-8 (co-working space subpremise ambiguity), TC-10 (dedup near-identical listings), TC-12 (street_number vs subpremise precedence — OQ-2, still open, make this a config flag not a hardcoded choice), TC-16 (leave artifact characters like stray quotes verbatim by default).

### 3.4 Cross-cutting rules (apply everywhere, no exceptions)
1. Auto-fill is always a starting point — every field stays editable pre-submission.
2. No automated decision is silent — every drop/default/shorten is inspectable (Dev Mode is where "inspectable" lives for this harness).
3. Failure always has a manual path out — never a dead end in the UI.

## 4. What to build

### 4.0 Build sequencing — mock-first, no Google API key required to start

Current phase does **not** require a Google API key at all. Build and validate everything — ranking, formatting, both User/Dev modes, confidence scoring — against local mock data first. Live Google API integration is a **later, separate phase**, done only once a key is provisioned and billing is confirmed.

- Add a third toggle alongside User/Developer Mode: **Data Source — Mock Data / Live API.**
- **Mock Data** is the only functional option right now. It should be fully built out:
  - A small local fixture set (JSON), seeded from the real candidates already in `sort_office_addresses.py` (Fple, Scapia, Kiwi, CheQ — real lat/longs, real place_ids), shaped exactly like a Places Text Search response.
  - Fuzzy-match the typed office name against fixture names so the search box behaves like it would against the real API.
  - Add a handful of named fixture scenarios that deliberately exercise the P0 test cases (see 3.3): a no-match query (TC-3), an address with no numeric component (TC-11), a current-location-unavailable case (TC-17/19), a tie-distance case (TC-18), a co-working shared-building case (TC-8). Dev Mode should let you pick one of these named scenarios directly, not just free-type and hope you hit the edge case.
  - Responses carry `source: "mock"` so Dev Mode can label them clearly as non-live.
- **Live API** should exist in the UI as a visible option but must be **non-functional / disabled** for now — greyed out or selectable-but-blocked with a message like "Requires Google API key setup — not yet integrated." Do not wire any real `fetch` call to Google in this phase, even behind a flag. This avoids a half-wired path that silently fails or accidentally burns free-tier quota.
- When the Google API phase actually starts later: the only change should be implementing the Live API branch of this same toggle and enabling it — the mock branch, the formatting pipeline, the ranker, and both UI modes should all be written so they don't need to change shape to accommodate this later.

### Stack
- Backend: Node/Express. One route, e.g. `POST /search`, that:
  - Reads `dataSource` (`mock` | `live`) from the request.
  - If `mock`: looks up the fixture set, applies fuzzy name-match, returns a Places-shaped response with `source: "mock"`.
  - If `live`: for now, returns a clear "not yet integrated" response rather than attempting a call — this branch is a stub until the later phase (see 4.0). Structure the code so swapping in the real `fetch` to Google Places Text Search (New) later is a small, contained change — same function signature, same return shape.
  - Either way, runs the response through the formatting pipeline + proximity ranker before returning.
  - Returns: raw response (mock or, later, live), formatted/ranked results, `FiltersApplied` per result, `ranking_method`, per-result confidence score + its inputs, timing/latency, and `source`.
- Frontend: React. Modes toggled by switches, not separate apps:
  - **User Mode** — replicate the attached Figma screens: text input for office name → list of returned addresses as selectable options → "Add a Different Address" to free-type/edit. Should look and feel like the real onboarding step, not a debug tool. Works fully against mock data now.
  - **Developer Mode** — same input box, but the output panel shows: the exact request that was made (mock lookup or, later, live), the raw response, `ranking_method`, `distance_km` per result, `FiltersApplied` per result, the confidence score breakdown (see below), `source` (mock/live), a picker for named mock scenarios, and a visible error/failure log (empty results, TC-17/18/19 triggers) with which test case each maps to.

### Confidence score — define before building
This has no existing spec, so pick concrete inputs rather than a black-box number. Reasonable starting components (combine into a weighted score, show the components in Dev Mode, not just the total):
- **Name-match strength**: similarity between typed office name and Google's returned `name` (e.g. token overlap or edit-distance based).
- **Geocode/component completeness**: does the result have `street_number` or `subpremise` (strong) vs. only a Plus Code or sublocality-level data (weak)?
- **Formatting integrity**: did the formatting pipeline need to drop High-tier components or do a word-level cut to hit compliance? (More intervention = lower confidence.)
- **Ranking certainty**: was this a real distance-ranked result, or a `fallback_relevance` result? (Fallback should visibly lower confidence, since we don't actually know it's the closest.)

Do not treat this as solved — flag it back to Rashi as an open item if the weighting feels arbitrary, per the charter's "don't just agree" instinct.

> **Resolved (2026-07-19):** Rashi reviewed and approved the "balanced-risk" weighting — Name-match 30% / Geocode-completeness 25% / Formatting integrity 30% / Ranking certainty 15% — over an equal-weight and a compliance-weighted alternative. Single-candidate results (nothing to rank against) score the ranking-certainty component as a neutral 1.0 rather than being penalized or reweighted. See `backend/src/lib/confidence.js` for the implementation — the weights are a named constant, easy to revisit.

## 5. Explicit non-goals for this harness
- Not building V1 (map-pin) — that's a separate, already-lower-risk flow.
- Not solving OQ-2 (street_number vs subpremise precedence) or OQ-3 (whether to prompt the user for a floor number instead of defaulting "1") — surface these as open flags in Dev Mode, don't silently pick an answer.
- Not handling international/remote-employee addressing (TC-5/TC-13/TC-20) — out of scope for this harness; a plain "not applicable" stub is enough.
- **Not integrating the live Google Places API in this phase** (see 4.0) — do not add a `GOOGLE_PLACES_API_KEY` requirement, do not make real HTTP calls to Google, and do not block on billing/quota setup. That's a deliberately separate later phase.

## 6. Security (applies once the Live API phase begins)
- Google Places API key will live in `.env`, be in `.gitignore`, and never be sent to or readable from the frontend bundle. All Places calls go through the Express backend.
- No `.env` or key handling is needed to build or run this current mock-only phase.

## 7. When something in the PRD is ambiguous or open
Point it out rather than resolving it silently — several Open Questions (OQ-1 through OQ-8) in the PRD are explicitly unresolved. If a build decision here depends on one of them, pick a reasonable default, implement it behind a flag/constant that's easy to flip, and say so — don't bury the assumption.
