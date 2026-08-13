# PRD: Office Address Auto-Fill — V2 (Google Places-powered)

**Owner:** Rashi | **Stage:** As-built, validated in local test harness | **Last updated:** 7 August 2026
**Supersedes:** `PRD_Office_Address_Autofill.md` (18 July 2026 draft) — that document's problem statement and phasing rationale are still valid background; this document replaces its Section 3 onward with what was actually designed, built, and verified since.

---

## 1. Problem Statement

**Problem:** Users don't remember or don't want to type their office address during the credit card application flow. This step correlates with a steep decline in application submission at this stage of the pre-onboarding funnel.

**Segment:** All applicants who reach the Career Info step.

**Funnel stage:** Pre-onboarding (acquisition / conversion), specifically the **Career Info** screen (Company Name, Designation, Work Email, Years of Experience) and the office-address step immediately downstream of it.

**Baseline metric:** *Still not quantified — carried over as OQ-8, unresolved.* Before this ships, the actual drop-off % at this step, isolated from adjacent steps, is still needed to size the opportunity and set a target. Nothing in the work described below has produced this number; it requires live funnel instrumentation, not a test harness.

**Root cause (unchanged from the original PRD):** Manual free-text address entry is high-effort and error-prone on mobile, especially for office addresses users don't have memorized the way they know their home address.

**Why now:** Ties to this quarter's #1 metric (new cards issued / funnel conversion) — unchanged.

---

## 2. What Actually Got Built vs. the Original V1/V2 Framing

The original PRD proposed shipping **V1** (map-assisted manual pin) first, with **V2** (fully automated fetch-and-arrange) as a fast-follow, and treated them as two candidate flows to choose between for production.

What got designed and validated in the local test harness is neither pure V1 nor pure V2 — it's a **hybrid that fixes on V2's automated fetch as the primary path, with a manual pick step folded in for disambiguation, not for visual pin-confirmation**:

- Google Places Autocomplete-style search *is* the primary interaction (V1's "search box" idea) — but it's a **text list, not a map**. There is no pin-drop, no visual map confirmation anywhere in the final design. Several earlier passes did build a literal map-pin step and then a dummy/mocked map view before landing here — see Section 10 for that history.
- The result of a pick still runs through automated address parsing (V2's core idea) — but the parsing responsibility split in two over the course of this work (Section 5): a backend rules engine that's now Dev-Mode-diagnostic-only, and a much simpler frontend config that's what the user actually sees.
- Multiple branches of one company are disambiguated **in the same suggestion list**, ranked closest-first, not via a separate map or a second screen.

This document describes that hybrid as it now stands, validated against three representative cases (Section 6) in a local harness — **not yet shipped to production**, and not yet measured against the funnel metric above.

---

## 3. The As-Built Flow

1. **Career Info.** User enters Company Name, Designation, Work Email, Years of Experience. Only Company Name feeds anything downstream.
2. **Search sheet opens automatically** on submitting Career Info — a full-page overlay on top of the address screen, search bar pre-filled with the Company Name. Framed throughout as "a search bar like Google Maps, but without the map view."
3. **The user searches an office name, a landmark/tech-park name, or a general area** — the same input handles all three; there's no separate mode switch.
   - Every keystroke shows live suggestions, mixing two kinds: a specific **office** match, or a general **area** match.
   - A company with more than one office shows **every branch as its own row**, closest-to-the-user ranked first and labeled, so picking a branch is a single action.
4. **If nothing matches**, a **"📍 Search area"** action sits directly next to the search bar (not a buried message) to pivot straight into an area search; "Enter address manually instead" is always available as a secondary, always-visible fallback — never a dead end.
5. **Selecting a result closes the sheet** and drops the user onto the address-confirmation screen, fields pre-filled per Section 5 below.
6. **The user always fills in Address Line 1 themselves** (floor number, building/tower name) — this is true for every case: a full office match, an area-only match, or no match at all. Every other field stays editable too.
7. **Confirm and Continue is disabled until Line 1 has text.** Submitting hands the address off to whatever consumes it next (Section 9 — out of scope here).

Office name and the picked area (when applicable) are independent, re-searchable pieces of state — re-searching one never overwrites the other or clears Address Line 1.

---

## 4. Google API Integration — what's real and what's mocked

The user's own framing for this feature is "Google Maps API along with Places Autocomplete." Two different Google APIs are involved, and **only one of them is actually integrated**:

| API | Status in this harness | Detail |
|---|---|---|
| **Places Text Search (New)** | **Real**, gated on a key | `backend/src/lib/livePlacesClient.js` calls `https://places.googleapis.com/v1/places:searchText` with a field mask (`places.id,places.displayName,places.addressComponents,places.plusCode,places.formattedAddress,places.location`) whenever `GOOGLE_PLACES_API_KEY` is present in `backend/.env`. This is what actually fetches an office's address once a specific result is being resolved. |
| **Places Autocomplete** | **Fully mocked** | There is no Places Autocomplete key or setup. The search sheet's live-suggestions list is `GET /suggest?q=`, which fuzzy-matches the typed text against a local fixture set (`backend/src/data/fixtures.json`) — not a real Google call. Selecting a suggestion still triggers a real `/search` (which *can* call real Places Text Search per the row above) — only the type-ahead matching itself is fake. |
| **Maps JavaScript API** | **Not used** | No map is rendered anywhere in the current design (see Section 10 for the earlier map-based passes that were explicitly rejected). |
| **Geocoding API** | **Not used** | The "user's current location" used for proximity ranking (Section 7) is a hardcoded reference point (`CONFIG.DEFAULT_CURRENT_LOCATION`) or a lat/lng passed in directly — never derived from a real address via geocoding. |

**What real Places Autocomplete integration would need**, if this graduates past the test harness:
- A Places Autocomplete (New) API key and its own billing setup (distinct product from Text Search, per Google's API structure).
- Session tokens to batch a user's keystrokes into one billable session rather than one call per keystroke.
- The mocked `GET /suggest` endpoint's contract (`{key, label, kind, placeId?, closest?}`) would need to be replaced by real Autocomplete predictions, then a **second** real Places Details/Text Search call to actually resolve the picked prediction into address components (this repo already has that second half working, since it's how a real Text Search resolves a picked mock suggestion today).
- All of this stays server-side, same as Text Search — the frontend must never hold a Places key directly (Section 11).

Without a key, Live API (Text Search) behaves exactly as if it were never built: visibly selectable in the UI, clearly labeled "not yet integrated," no network call attempted.

---

## 5. Address Field Model

Two different approaches were built for this, in sequence — both still exist in the code, serving different audiences now.

### 5.1 User-facing model (what ships): Address Line 1 / 2 / 3

A small, dependency-free frontend config (`frontend/src/lib/addressLineConfig.js`) builds two fields directly from Google's raw, typed address components — no abbreviation, no length budget, no dropping:

| Field | Built from | Auto-filled? |
|---|---|---|
| **Address Line 1** | *(nothing — always blank)* | **Never.** The user always types this: floor number, building/tower name. Required — "Confirm and Continue" is disabled until it has text. |
| **Address Line 2** | `subpremise` + `premise` + `street_number` (joined) | Yes, whatever's present |
| **Address Line 3** | `route` | Yes, if present |
| City/District | `locality` | Yes |
| State | `administrative_area_level_1` | Yes |
| Pincode | `postal_code` | Yes |

Whichever of these raw types are missing simply leaves that field blank — there is no special-case handling for a thin result. An area-only pick (rather than a specific office) naturally produces emptier Line 2/3 through this same mechanism, with a lightweight notice ("we could only find the general area") rather than a distinct code path.

**Why this replaced the original rule set:** the original design (Section 5.2 below) tried to auto-fill precise floor/building detail and only fell back to asking the user when Google's data was too sparse to trust. The revised plan inverts this: floor/building detail (the part Google is least reliable about) is *always* asked of the user, and only the parts Google is reliably good at (street/route, city, state, pincode) are auto-filled. This is a simpler, more honest contract with the user than a rules engine trying to guess when to trust the data.

### 5.2 Diagnostic model (Dev Mode only, unchanged): the original rules engine

`backend/src/lib/formattingPipeline.js` still exists, still runs, and still populates Dev Mode's per-result inspector (`ResultCard.jsx`) and the batch runner — it was never deleted, just stopped being the thing User Mode reads from. Its rules, in the exact precedence order they execute:

1. **Sparse-data gate:** if more than half of 6 core component types (`subpremise, premise, street_number, route, sublocality_level_1, neighborhood`) are missing, give up on precise fields entirely, dump the full raw location text into one field, and flag `Flag:SparseDataManualEntryRequired`.
2. **Office Floor/Tower** (from `subpremise`) — abbreviate, then shorten at its own punctuation if over budget; genuinely unshortenable routes to manual entry (never dropped, never defaulted).
3. **Office Block/Building Name** (from `street_number` + `premise`) — same shortening rule, budget-adjusted for the fixed street-number prefix; the join between the two is never itself a cut point (a real bug caught and fixed during this work).
4. **Area/Locality** (`route` + sublocality tiers + `neighborhood` + `landmark`) — abbreviate, then drop the cheapest-tier components first to fit a length budget (lower-tier first, then medium, `route` only as an expensive last resort), then a forced word-cut if still too long. Nothing here is undroppable.
5. **Digit-anchor check** — if neither precise field ended up with a digit anywhere, default `"1"` onto Office Floor/Tower and flag `Flag:DefaultNumberInserted`.

Every drop, abbreviation, shorten, or default is recorded in a `FiltersApplied` list, which is what Developer Mode surfaces per result — this is still true, just no longer wired to what the end user sees.

**Open item, not resolved here:** whether Dev Mode's diagnostics should eventually be reworked to match the new Line 1/2/3 model, or stay as a legacy/comparison view indefinitely, hasn't been decided — flagged rather than silently picked, since the confidence weights tied to this pipeline (Section 8) were explicitly approved by Rashi and shouldn't be redefined on a guess.

---

## 6. Verified Scenarios

Three representative cases were named as the ones this harness must demonstrably handle. All three were verified end-to-end against the Line 1/2/3 model with no new mock data needed — the underlying fixtures already existed from earlier passes:

| Case | Fixture used | Behavior confirmed |
|---|---|---|
| **Address found by office name** | CheQ Digital Private Limited | Search sheet returns one match; Line 2/3/City/State/Pincode populate from its real address components; Line 1 starts blank and blocks submission until filled. |
| **Address not found** | A deliberately non-matching query | Search sheet shows the "Search area" CTA next to the bar and "Enter address manually instead" as a fallback; choosing manual entry drops into a fully blank, fully editable form — same Line 1 requirement applies. |
| **Multiple addresses for one company name** | Vantage Corp (4 branches) | All 4 branches appear as individual rows in the same dropdown, closest one labeled, ranked by the same haversine ranker used for proximity sorting elsewhere (Section 7). Picking a specific (non-closest) branch resolves directly to that branch's own address data — confirmed the picked branch's own components populate, not the closest one's. |

A fourth path — picking a bare **area** rather than a specific office (e.g., "Koramangala") — was also verified: Line 2/3 come back empty (an area fixture carries none of the precise component types by design), City/State/Pincode still populate, and the lightweight area notice displays.

---

## 7. Proximity Ranking (unchanged from the original PRD)

- Multiple office matches are sorted by haversine distance from a reference "current address" point, closest first. Ported from `sort_office_addresses.py` into `backend/src/lib/ranker.js` — same edge-case behavior, same `ranking_method` / `distance_km` fields regardless of which language actually runs.
- If no usable current-location geocode is available, the ranker **falls back to preserving Google's own relevance order** rather than fabricating a distance sort, and reports `ranking_method: "fallback_relevance"` — surfaced explicitly in Dev Mode, never silently presented as a real distance sort.
- Equidistant or near-tied candidates keep their original relative order (a stable sort) as the implicit tie-break.
- This same ranker is what orders the multi-branch dropdown in Section 6 — there is no separate "closest office" calculation; it's one ranking implementation used everywhere a result set needs an order.

---

## 8. Confidence Scoring — Dev Mode diagnostic, not user-facing

A weighted score (0–100) was designed and approved (Rashi, 19 July 2026) for Developer Mode's own use, combining four components:

| Component | Weight | What it measures |
|---|---|---|
| Name-match strength | 30% | Similarity between the typed query and Google's returned name. |
| Geocode/component completeness | 25% | Does the raw result have a real door number or floor (strong) vs. only a Plus Code or sublocality-level data (weak)? |
| Formatting integrity | 30% | How much the *diagnostic* rules engine (Section 5.2) had to intervene — abbreviate, drop, shorten, or default — to reach a compliant result. |
| Ranking certainty | 15% | Was this a real distance-ranked result, or `fallback_relevance`? A single candidate with nothing to rank against scores this component as a neutral 1.0 rather than being penalized. |

This score, and its full breakdown, is **Dev Mode only** — it is not shown anywhere in the user-facing flow described in Section 3, and was never part of this PRD's user-facing goals. It exists so a reviewer can see *why* the diagnostic pipeline trusts or distrusts a given result, independent of what the simplified frontend model in Section 5.1 actually does.

---

## 9. Explicitly Out of Scope

- **The backend LLM-powered address-arranging agent.** A separate, backend-only, future step: once a user confirms Address Line 1/2/3 + City/State/Pincode, a yet-to-be-built LLM agent will re-arrange that confirmed address into whatever shape a downstream API needs. In the product owner's own words: *"It has nothing to do with front end, backend will be working on the input."* No key, no output-shape spec, and no request to build it exist yet — nothing is stubbed or mocked for it here, since a fake version with no real spec would just be dishonest scaffolding. This is the natural next phase once this document is socialized.
- **Real Places Autocomplete integration** (Section 4) — the mocked version demonstrates the intended flow; wiring in the real API is separate future work with its own key/billing/session-token requirements.
- **International / remote-employee addressing** (originally TC-5/TC-13/TC-20) — a company with no Indian office, or an employee who's never physically visited their employer's registered office, still needs a dedicated path; out of scope for this harness, a plain "not applicable" stub is enough for now.
- **A real Maps pin-drop / visual confirmation step.** Explicitly tried, then explicitly removed (Section 10) — not part of the current design, though nothing prevents revisiting it later if disambiguation-by-list-picking proves insufficient at volume.
- **Funnel-level measurement** (Section 1's baseline metric, OQ-8) — this harness validates behavior, not conversion impact.

---

## 10. History: how the flow arrived here

Documented in detail, with dates and reasoning, in `CLAUDE.md` — summarized here so this PRD doesn't read as if the current design were the only one considered:

1. **Structured named fields** (Office Pin Code / Office Floor/Tower / Office Block/Building Name / Area/Locality / City/District / State) replaced the original PRD's generic 3-line/32-char model, matching the actual Figma screens.
2. **A literal map-pin confirmation step** (V1's core interaction) was grafted onto this flow, then **replaced with a dummy/mocked map view** when a real Maps key wasn't available, then **replaced again** with the current text-only search sheet when it became clear the map visual wasn't wanted at all — "a search bar like Google Maps, but without the map view."
3. **A 50%-of-components-missing sparse-data rule** was added as a deliberate escape hatch for thin results, then made moot by the Section 5.1 pivot — once Address Line 1 is *always* manual regardless of match quality, there's no longer a meaningfully distinct "we could only find the area" failure mode to special-case.
4. **Multi-branch disambiguation** moved from a second "select your office" screen to every branch appearing directly in the first list — restoring and sharpening the original TC-1 intent that a second screen had drifted away from.
5. The address field model itself moved from the structured named fields (step 1) to the current generic Address Line 1/2/3 model, with Line 1 permanently manual.

Each of these was a real, dated correction from the product owner, not a unilateral rewrite — flagged and reasoned through in `CLAUDE.md` at the time, in keeping with this project's own rule (Section 12) against silently resolving ambiguity.

---

## 11. Security

- The Google Places API key lives only in `backend/.env` (gitignored) and is never sent to or readable from the frontend bundle. All Places calls go through the Express backend.
- The frontend only ever sends `dataSource: "live" | "mock"` — the backend alone decides whether Live is actually configured (`GET /meta` → `liveApiConfigured`), and the frontend never handles a key directly.

---

## 12. Open Questions — current status

| # | Question | Status |
|---|---|---|
| OQ-1 | What's the fallback ordering when current-address geocoding fails? | **Still open.** Implemented default: preserve Google's relevance order (Section 7) — never resolved as *the* answer, just the harness's working assumption. |
| OQ-2 | Should `street_number` outrank `subpremise`/floor for Line 1 when both are present? | **Resolved by restructuring.** The two no longer compete for the same field in either field model (Section 5). |
| OQ-3 | Should the UI prompt for a floor/door number instead of silently defaulting to "1"? | **Resolved in favor of prompting.** Address Line 1 is now *always* a required, user-typed field for every result — prompting won outright, superseding the old silent-default behavior (which still exists in the Section 5.2 diagnostic pipeline only). |
| OQ-4 | Should a Plus Code ever be used as a Line-1 fallback? | **Still open.** Plus codes remain excluded from the line-eligible component pool entirely in the diagnostic pipeline; moot for the user-facing model since Line 1 was never derived from any Google data to begin with. |
| OQ-5 | For remote employees whose employer *does* have a registered India office, is the employee required to use that address? | **Still open** — a compliance/policy call, out of this harness's scope. |
| OQ-6 | Should a location-denied fallback default to a specific city or dynamically to the user's own? | **Still open** — not exercised in this harness; the current reference point is a fixed default, not a real fallback decision. |
| OQ-7 | Should dropped/shortened components ever surface to the end user? | **Still open**, and less consequential now — the user-facing model doesn't drop or shorten anything (Section 5.1), so this only applies to whether Dev Mode's diagnostic view is ever exposed more broadly. |
| OQ-8 | What's the actual baseline drop-off % at this step? | **Still open**, unquantified — needs live funnel data, not something a test harness produces. |

---

## 13. Metrics (ties to the existing funnel Metrics Tree)

**Primary:** Funnel conversion rate at the office-address step (pre- vs. post-launch) — unchanged from the original PRD, still unmeasured.

**Guardrails:**
- % of confirmed addresses where Address Line 2 *and* Line 3 both came back empty (proxy for "Google gave us nothing useful beyond city/state/pincode" — expect this to correlate with area-only picks and pure not-found cases).
- % of sessions where the user edited an auto-filled Line 2 or Line 3 after it populated (high edit rate = the auto-fill isn't actually trustworthy yet).
- KYC/address-correction rate post-submission for auto-filled vs. fully-manual addresses — compliance guardrail, unchanged from the original PRD.

**Leading indicator, available today from the harness:** the confidence score breakdown (Section 8) across a batch of real office names, via Developer Mode's batch runner — a proxy for how often Google's raw data is strong enough to be worth auto-filling anything at all, ahead of any real funnel measurement.
