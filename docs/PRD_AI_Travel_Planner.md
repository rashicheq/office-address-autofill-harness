# PRD — AI Travel Planner (Codename: "Compass")

**Author:** Product (AI-assisted draft) | **Owner:** Rashi | **Status:** Draft for review
**Doc convention:** Open items are numbered `OQ-#` (open question) and edge cases `TC-#` (test case), matching the harness convention in this repo — resolve or flag, never silently pick.

---

## 1. Problem Statement

> "Users are not able to find one stop shop for all travel related things."

Unpacked, this is three separate failures, not one:

1. **Discovery is fragmented.** Deciding *where* and *when* to go requires cross-referencing flight/hotel pricing calendars, weather, local holiday crowding, and personal leave balance — no single tool holds all four.
2. **Booking is fragmented.** Flights, hotels, activities, visas, and insurance are booked across 5–8 different sites/apps with zero shared context between them.
3. **Execution tracking doesn't exist at all.** Once booked, there is no tool that answers "what have I actually done, and what's left before I leave?" People use Notes apps, WhatsApp threads, or nothing.

Failure #3 is the one with genuinely no incumbent. Failures #1 and #2 have partial incumbents (Google Flights/Hopper for deals, TripIt/Wanderlog for itineraries, MakeMyTrip/Expedia for booking) — none combine planning, booking context, and post-booking tracking in one place. **This PRD scopes Compass to own #1 and #3 fully, and #2 as an assist layer (deep-link + track), not a booking engine**, for the feasibility reasons in OQ-1 below.

---

## 2. Goals & Non-Goals

### 2.1 Goals (with the metric named, per instinct — vague goals get pushed back on elsewhere in this repo, so don't let this doc be the exception)

| Goal | Primary metric | Target (post-launch, define baseline first) |
|---|---|---|
| Replace the "10 tabs open" planning phase | Median # of external tools/tabs used per trip planned in-app (self-reported or referral-click tracked) | Reduce from ~6 to ≤2 |
| Itinerary actually gets used, not just generated | % of generated itineraries with ≥1 edit or ≥1 day marked "done" during the trip window | ≥50% |
| Tracker becomes the trip's source of truth | % of trips with ≥5 tracker items marked complete before departure date | ≥60% |
| Timing/deal recommendations are trusted | % of users who select a recommended date-window over their own initial input | ≥25% (this is the hardest metric to hit — flagging as high-risk, see §9) |
| Retention as a planning habit, not one-off | Trips created per returning user per year | ≥2 |

**North star candidate:** *Trips fully tracked to departure* (itinerary generated **and** tracker ≥80% complete by day of travel). This ties discovery, planning, and tracking into one number instead of optimizing each pillar in isolation. Flag: needs a PM sign-off before instrumentation is built around it — proposing it here, not deciding it unilaterally.

### 2.2 Non-Goals (V1)

- Not a licensed OTA — no in-app payment capture for flights/hotels (OQ-1).
- Not a group-chat/social product — collaborative editing is scoped narrowly (§6.4), not a Splitwise/WhatsApp replacement.
- Not a visa-filing service — we tell users what they need, we do not submit paperwork on their behalf (liability boundary, §7).
- Not real-time flight/price tracking post-booking (rebooking, delay alerts) — that's a different product surface (travel *ops*, not travel *planning*). Revisit post-V1.

---

## 3. Personas

Naming these because "users" is not a segment and the PRD will make wrong tradeoffs if it pretends one persona fits all:

| Persona | Trip pattern | What breaks for them today |
|---|---|---|
| **P1 — Domestic weekend optimizer** | 2–4 trips/year, 2–4 days, long-weekend-driven, budget-conscious | Doesn't know which long weekend is "worth it" (leave + holiday overlap + price dip); over-indexes on Instagram-driven destination choice |
| **P2 — International annual-leave planner** | 1–2 trips/year, 7–14 days, higher spend, visa-bearing | Visa/document research is manual and anxiety-inducing; itinerary planning across multiple cities/countries is spreadsheet hell |
| **P3 — Group/family coordinator** | Varies; is the one person managing bookings + preferences for 3–8 people | Reconciling dietary, budget, and must-see conflicts across a group; nobody else in the group tracks anything, so they carry all of it |
| **P4 — Offbeat/experience-first traveler** | Vibe-driven, not destination-driven ("I want snowfall + cozy," not "I want Manali") | Existing search tools require you to already know the place name; vibe→place discovery barely exists outside blog SEO content |
| **P5 — Bleisure/solo** | Business trip + bolt-on leisure days, or solo leisure | Needs fast, low-input planning; solo safety/logistics info (esp. international) is scattered |

P3 and P2 carry the highest complexity (multi-traveler documents, group preference conflicts, per-country legal requirements) — V1 functional depth should be tested against these two, not P1, or the harder edge cases will surface post-launch instead of in design review.

---

## 4. Functional Requirements

### 4.1 Trip Parameter Stack (destination, duration, season)

**FR-1.1** User can input: city/country/region (free text with autocomplete + typo tolerance), OR skip destination and enter only duration + rough season/month + vibe (feeds into §4.2 discovery flow).
**FR-1.2** Multi-destination trips: user can add multiple cities/countries in one trip with per-leg duration (e.g., "5 days Vietnam: 2 Hanoi, 3 Ha Long Bay"). This is not optional for P2 — most international leisure trips are multi-city.
**FR-1.3** "Most visited places" — surfaced two ways: (a) trending/popular destinations by season+budget+vibe filter combo, (b) user's own visited-places history feeding a "haven't been back in a while" or "similar to places you loved" prompt.
**FR-1.4** Duration input accepts either exact dates or a flexible range ("5-7 days, sometime in Nov") — flexible range is what feeds the deal-optimizer in §4.3, so this can't be an afterthought field.

**Edge cases:**
- TC-1: User enters a destination with no direct flights from their home city — surface layover reality, don't silently compute as if direct.
- TC-2: User enters overlapping/impossible legs (e.g., 2 days in a city that requires 3 to reach and return within trip window) — flag feasibility, don't just render it.
- TC-3: Destination text is ambiguous (e.g., "Georgia" the country vs. "Georgia" the US state) — disambiguate before proceeding, never guess silently.

### 4.2 Vibe-Based Discovery

**FR-2.1** Closed taxonomy, not free text search — free-text "vibe" search is a matching problem with no ground truth and will produce garbage results at launch. Propose 6 axes, ~5 tags each (~30 total, extensible):

| Axis | Example tags |
|---|---|
| Landscape | Beach, mountains/trek, snow, desert, forest/greenery, backwaters |
| Pace | Chill/slow travel, packed/exhaustive, offbeat/unexplored, city/urban buzz |
| Stay style | Cozy homestay, luxury resort, boutique, hostel/backpacker, glamping |
| Food | Exhaustive cuisine/foodie trail, fine dining, street food, dietary-specific (veg-friendly, vegan-friendly, halal-friendly) |
| Activity | Adventure sports, wildlife/safari, wellness/spa, culture & heritage, nightlife |
| Social | Solo-friendly, family-friendly, romantic/couples, group/friends |

**FR-2.2** Multi-tag selection (AND/OR toggle) — "beach AND chill" should return different results than "beach OR chill."
**FR-2.3** Vibe→destination mapping needs a data source. **Resolved (OQ-2):** manually curated by ops for a launch set of ~100–150 destinations. Accurate, doesn't scale past launch by design — revisit LLM-inferred + verification-layer approach once destination count exceeds what ops curation can sustain.

### 4.3 Best-Time-To-Go / Deal Optimizer

This is the feature with the most moving parts and the most feasibility risk — treating it accordingly.

**FR-3.1** For a given destination (or destination-less vibe query), recommend specific date windows scored on three inputs shown transparently (mirroring this repo's own confidence-score pattern — a score with hidden inputs is not trustworthy, don't ship one):
- **Price signal** — historical/seasonal price index for flights+hotels for that route (not live fare prediction — see OQ-3 on data source feasibility).
- **Crowd/rush signal** — school holiday calendars, local festival calendars, and peak-season classification for the destination.
- **Leave-efficiency signal** — for long-weekend optimization specifically: national/regional holiday calendar (destination country's *and* user's home country's, they're different problems) cross-referenced against a genuine weekend, surfaced as "3 days of leave → 7 days off."
**FR-3.2** Personal holiday-calendar import: user uploads their org's yearly leave/holiday calendar (PDF). **OCR pipeline confirmed in scope for V1** (not a fallback — most org calendar PDFs are scanned/exported images, so treat OCR as the expected path, per TC-4). System extracts **dates and holiday/leave-type labels only** — extract-and-discard is the working default for anything else in that document (colleague names, approval chains, etc.), pending the explicit privacy/legal answer still open under OQ-4. Output: a ranked list of "best windows" cross-referencing personal leave availability + destination timing signal + price signal.
**FR-3.3** Output must show the "why" — same principle as the FiltersApplied pattern in this harness's own address pipeline: a ranked date window with no visible reasoning is a black box users won't act on (ties directly to the "trusted enough to override own input" metric in §2.1).

**Edge cases:**
- TC-4: Uploaded PDF is a scanned image, not text — OCR fallback required, with a visible confidence flag on extracted dates (never silently misread a date).
- TC-5: Home-country holiday calendar and destination-country holiday calendar conflict (e.g., destination is *more* crowded on the user's own long weekend, e.g. a domestic hill station on a national holiday) — surface this explicitly as a tradeoff, don't hide the downside just because the window is "optimal" on leave-efficiency.
- TC-6: No date flexibility given at all (fixed dates only) — deal optimizer becomes informational only ("here's how your fixed dates rank"), not prescriptive. Same fallback-transparency principle as this repo's `ranking_method: fallback_relevance`.

### 4.4 Traveler Profile & Preferences

**FR-4.1** Trip-level traveler roster: add travelers (name, relationship/role optional, age band — needed for infant/child-specific logistics, not just headcount).
**FR-4.2** Per-traveler preferences: dietary (veg/non-veg/vegan/jain/halal/kosher/allergy-flagged — allergies are a safety issue, not a preference, and should be visually distinct in the UI, not just another checkbox), mobility/accessibility needs, must-see/must-do list (free text, tagged to itinerary days where possible), budget tier (per-person or trip-pooled — group trips need both, see TC-8).
**FR-4.3** Preference-conflict surfacing for groups (P3): if travelers have contradictory hard constraints (e.g., one vegan + destination/itinerary day has no flagged vegan option), flag it at itinerary-generation time, not silently drop the constraint or silently drop the destination.

**Edge cases:**
- TC-7: Group includes travelers of different nationalities — this fans out into §5 (each nationality has separate visa/document requirements for the *same* trip). Must be modeled per-traveler, not per-trip.
- TC-8: Budget entered inconsistently across a group (some per-person, some "total for family of 4") — force explicit unit selection, never assume.
- TC-9: A traveler is added after itinerary generation — itinerary must re-flag (not silently skip) any new preference conflicts.

### 4.5 Itinerary Generation

**FR-5.1** Generate a day-by-day itinerary from: destination(s)/legs, duration, vibe tags, traveler preferences, must-see list, budget tier.
**FR-5.2** Itinerary items are editable at every level — reorder days, swap/delete/add activities, regenerate a single day without regenerating the whole trip. (Mirrors this repo's own cross-cutting rule: autofill is a starting point, never a locked field — applies here just as much as to address forms.)
**FR-5.3** Each itinerary day shows pacing load (e.g., "3 activities + 2 transit legs" flagged if unrealistic for the time available) — don't generate a physically impossible day silently.
**FR-5.4** Buffer/rest days are a first-class option, not an accident of scheduling gaps — P4/offbeat and family personas explicitly want unscheduled time, and a generator that fills every slot will be actively resented.
**FR-5.5** Regeneration must be conversational/iterative — "swap day 3 for something less packed" as a follow-up input, not a full-form re-entry.

**Edge cases:**
- TC-10: Must-see list items are geographically incompatible with the given duration (e.g., 3 must-sees spread across a country too large to cover in 4 days) — flag the conflict, offer to either extend duration or drop items, never silently produce a physically infeasible itinerary.
- TC-11: Opening hours/seasonal closures at the destination (e.g., an attraction closed for the exact travel month) — itinerary must check this, not just place it on a day.
- TC-12: Multi-country leg crossing a border with limited crossing days/hours (land borders, ferries) — flag transit-day realism, this is a common trip-killer that generic itinerary tools miss.

### 4.6 Trip Tracker (the genuinely unowned feature — build this with the most care)

**FR-6.1** Auto-populated checklist categories seeded from the trip's own data: bookings (flights, hotels, activities — each as a trackable item via confirmation-email import, see below), documents (passport validity, visa, insurance — auto-populated from §5 based on destination+nationality), packing (templated by destination climate/vibe + duration, editable), pre-departure logistics (forex, SIM/roaming, home-side tasks like pet/plant care, bill payments).

**FR-6.1a — Confirmation-email import authorization (Resolved, OQ-5):** consent captured at signup, email ownership verified via OTP before any inbox access is granted. Scope of access is a separate build-time decision from the consent mechanism itself — recommend forwarded/CC'd-confirmations-only for V1 rather than full inbox scan, since it delivers the same feature value for a smaller trust ask.
**FR-6.2** User can add fully custom tracker items and custom categories — the templated list is a starting point, not a ceiling.
**FR-6.3** Tracker items support: due date (auto-suggested relative to departure — e.g., visa items due weeks before per §5, packing due day before), assignee (for group trips — P3 needs to delegate, not carry every item personally), status (not just done/not-done — "in progress," "blocked/waiting on someone else" is a real state worth modeling given P3's pain point).
**FR-6.4** Group trips: shared tracker visible to all travelers with an account, each can check off their own assigned items. **Scoping real-time collaborative editing (simultaneous multi-user editing of the same itinerary) out of V1** — async shared visibility + assignment covers the P3 pain point without the engineering cost of real-time sync (OQ-6).
**FR-6.5** Pre-departure summary view / "are we ready to go" dashboard — % complete by category, surfaced days-before-departure with escalating visibility as the date nears (this is the retention/habit-forming surface — treat its design with the same weight as itinerary generation, not as an afterthought checklist screen).

**Edge cases:**
- TC-13: A booking is cancelled/changed after being tracked as done — tracker must support "undo done" and flag stale-looking confirmations, not just accumulate stale checkmarks.
- TC-14: User never opens the app between booking and departure — tracker needs a notification/reminder surface (email/push) tied to due dates, or it's a feature nobody re-engages with.
- TC-15: Custom item added has no natural due date — default to "no due date," never force a fake one (same non-negotiable as this repo's own rule against fabricating data to fill a field).

---

## 5. International Travel — Legal & Documentation Module

This is the most differentiated, highest-liability part of the product. Domestic trips skip this section entirely; it activates the moment any leg crosses a border.

**FR-7.1** Per-traveler, per-destination-country requirement checklist, driven by nationality (passport-issuing country) × destination country × trip purpose (tourism default) × trip duration:
- Passport validity window (many countries require 6-months-beyond-travel-date validity — flag if the traveler's passport fails this, don't just note the expiry date).
- Visa requirement type: visa-free, e-visa, visa-on-arrival, embassy visa-required, transit-visa-required (for layovers in a third country — commonly missed).
- Vaccination/health requirements (e.g., yellow fever certificate for certain routes).
- Customs/import restrictions relevant to common traveler items (currency declaration thresholds, restricted goods).
- Travel insurance requirement (some countries/visas mandate proof of insurance — flag as required vs. recommended, don't blur the two).
- Local law flags relevant to travelers (e.g., dress codes, alcohol restrictions, LGBTQ+ legal risk, solo-female-safety-relevant advisories) — presented factually and sourced, not editorially, given the sensitivity.
- Driving: International Driving Permit requirement if self-drive is a stated itinerary activity.
- Currency/forex: destination currency, common card acceptance reality, ATM availability notes.
- SIM/roaming/eSIM availability note.
**FR-7.2** Each item shows: requirement, lead time needed (e.g., "e-visa: apply 3–5 business days ahead," "embassy visa: apply 4–6 weeks ahead"), and a data-currency indicator (see OQ-7 — visa rules change, and a stale answer here is actively harmful, not just wrong).
**FR-7.3** This module explicitly informs, does not file — no in-app visa/insurance purchase flow in V1 (ties to OQ-1's non-goal). Deep-link to official government sources and/or trusted partners for the actual application.
**FR-7.4** Multi-nationality group (TC-7 from §4.4): requirement checklist is generated per-traveler, not per-trip, and the tracker (§4.6) assigns each traveler's document items to them individually.

**Edge cases:**
- TC-16: Destination requires a visa type not obtainable from the traveler's current location (must apply from home country in advance) — flag this as a hard planning constraint up front, not a footnote discovered after itinerary is built.
- TC-17: Trip includes a layover country with its own transit-visa rule — must be checked even though the traveler "isn't visiting" that country.
- TC-18: Visa processing time exceeds time-to-departure given the trip's booking date — flag trip as at-risk immediately, this is a case where the product should proactively surface risk, not wait to be asked.
- TC-19: Bilateral relations/travel advisory changes between plan time and departure (visa suspensions, advisory level changes) — out of scope for real-time monitoring in V1 (that's an ops/alerting product, see §2.2 non-goals), but the data-currency indicator (FR-7.2) should make clear the info was correct *as of* a date, not evergreen.
- TC-20: Domestic trip within a country the user is not a citizen of (e.g., a foreign resident planning "domestic" travel within their country of residence) — treat as international from the document-requirements perspective (residency permit / local ID rules may apply), don't misclassify by destination alone.

---

## 6. Non-Functional Requirements

- **Data currency & liability (ties to OQ-7):** Any legal/visa content must be timestamped with "as of" date and a source link. This is the single highest-liability surface in the product — a user missing a flight over bad visa info is a real-world harm, not a UX bug. Recommend a legal/compliance review pass on this module specifically before launch, independent of the rest of the PRD.
- **Privacy:** Holiday-calendar PDF uploads (FR-3.2) and any confirmation-email import (FR-6.1/OQ-5) touch third-party data (colleagues' names in a shared calendar; other travelers' booking details). Extract only what's needed (dates/labels; booking dates/vendor/confirmation #), discard/don't retain the rest, and disclose this in-product at the upload point — not buried in a privacy policy nobody reads.
- **Localization:** Currency display, date formats, and holiday calendars must be geography-aware (home country ≠ destination country, and both matter per §4.3).
- **Accessibility:** Standard WCAG compliance; specifically relevant here because mobility-need flagging (FR-4.2) is a functional input, not just a nice-to-have UI label.
- **Performance:** Itinerary generation and deal-optimizer scoring should complete in a UX-acceptable single-digit-seconds window or show progressive/partial results — these are the two heaviest compute paths in the product.
- **Offline/low-connectivity:** Trip tracker specifically should be usable (view + check off items) with degraded/no connectivity while traveling, syncing on reconnect — this is the one part of the product used *during* the trip, at the destination, where connectivity is least reliable.

---

## 7. Data & Integration Dependencies

| Need | Candidate source | Notes / feasibility flag |
|---|---|---|
| Flight/hotel pricing signals | Aggregator APIs (Skyscanner/Kiwi/Amadeus-class), or scraped/partner feeds | Live fare-level data is expensive and rate-limited at scale — V1 likely needs seasonal/historical indices, not live fares (OQ-3) |
| Destination content, opening hours, attractions | Google Places-class API, curated content | Same category of dependency this repo's own harness already deals with — reuse that integration learning |
| Holiday calendars (destination + home country) | Government sources, timeanddate.com-class data provider | Needs per-country maintenance — not a one-time data pull |
| Visa/document requirements | Government sources, IATA Timatic-class API/data licensing | Highest-value, highest-cost data dependency in the whole PRD — licensing Timatic-grade data is a real budget line, flag early to whoever owns this budget decision |
| Weather/seasonality | Standard weather API | Low risk |
| PDF/calendar parsing | OCR + text extraction pipeline | Confidence-flagged extraction, per FR-3.2/TC-4 |

---

## 8. Phased Roadmap

**Phase 0 (this PRD's scope only):** no code, sign-off on scope, OQs, and the North Star metric.
**Phase 1 (MVP):** Trip parameter stack (§4.1) + itinerary generation (§4.5, single-destination first) + tracker (§4.6, manual entry, no email import) + curated vibe taxonomy for a limited destination set (§4.2) domestic-only. **No deal optimizer, no international legal module yet** — prove itinerary + tracker retention first, since those are the two goals with no incumbent competitor risk.
**Phase 2:** International legal/documentation module (§5) + multi-destination itineraries (FR-1.2) + group/multi-traveler support (§4.4, §4.6 shared tracker) + confirmation-email import (FR-6.1a, consent/OTP flow resolved). §5 ships at current-capability accuracy (sourced, "as of"-dated) per the OQ-7 deferral — the booking-depth call (OQ-1) and monetization model (OQ-8) also get decided explicitly at this phase boundary, not inferred from whatever V1 shipped with.
**Phase 3:** Deal optimizer with live fare-level pricing (OQ-3 scaled up from seasonality/indices) + holiday-calendar PDF import with OCR (§4.3, FR-3.2) — sequenced last because it has the highest data-dependency risk and is not on the product's differentiated critical path (tracker is).

Flagging explicitly: the original ask listed the deal-optimizer/holiday-calendar feature as item #3 of 6, but sequencing it last is a deliberate call, not an oversight — it has the weakest data foundation of any feature here and the itinerary+tracker combination is where the actual competitive gap is. Open to being overruled on this, but not going to sequence it silently.

---

## 9. Open Questions

> **Status legend:** Resolved = decided; Deferred = deliberately not decided now, with an explicit re-visit point (not silence); still-Open = unresolved, needs an owner.

- **OQ-1 — Booking depth.** Aggregator/deep-link only vs. transactional booking-of-record. **Deferred (2026-08-10):** confirmed as "pick up later" — V1 stays deep-link-only per this PRD's assumption, but the licensing/liability/payments call must be made explicitly before Phase 2 scoping starts, not inferred from V1 having shipped that way.
- **OQ-2 — Vibe-tag data source at scale.** **Resolved (2026-08-10):** curated taxonomy for launch markets, as proposed. Revisit (LLM-inferred + verification layer) once destination count exceeds what ops curation can sustain — no fixed trigger number yet; flag when curation backlog becomes visible.
- **OQ-3 — Live fare data feasibility/cost.** **Resolved (2026-08-10):** "best time to go" ships on seasonality + other indices (holiday calendars, historical price index) for V1; live fare-level pricing moves to Phase 2. FR-3.1 already scoped this way — no change needed there, just confirming it's a decision now, not a placeholder.
- **OQ-4 — Holiday-calendar PDF retention policy.** **Partially resolved (2026-08-10) — flagging the gap rather than assuming it's closed:** the answer given ("place an OCR to read the PDF") confirms the *extraction mechanism* — OCR is in scope for V1, not a stretch goal, which strengthens TC-4 from "fallback" to "expected path" since most org calendar PDFs are scanned/exported images, not text. It does **not** answer the *retention* question I actually asked: once OCR extracts dates/labels, do we discard the source PDF and any non-date content (colleague names, approval metadata), or retain it? Keeping extract-and-discard as the working default below (§6, FR-3.2) since it's the safer position, but this still needs an explicit privacy/legal answer before FR-3.2 ships, not a product-team default.
- **OQ-5 — Confirmation-email import for the tracker.** **Resolved (2026-08-10):** consent captured at signup + email ownership verified via OTP flow before any inbox/email access is granted. This covers the *authorization* mechanism; scope of access (full inbox scan vs. forwarded/CC'd confirmations only) is still a build-time decision — recommend forwarded-only for V1 to keep the consent ask proportionate to the feature, full inbox scan is a much bigger trust ask for the same feature value.
- **OQ-6 — Real-time collaborative editing for group trips.** Still open/no input yet. Stays scoped out of V1 (§4.6, async shared tracker) — revisit if P3 feedback says async isn't enough.
- **OQ-7 — Legal/visa content liability model.** **Deferred to Phase 2 (2026-08-10):** V1 ships the international legal/documentation module (§5) at current-capability accuracy (sourced, "as of"-dated content per FR-7.2) without a separate legal sign-off gate first. Flagging plainly: this means §5 launches on a product-team judgment call about acceptable accuracy, not a compliance-reviewed one — worth revisiting explicitly if the module's usage/severity (e.g. visa-type guidance) grows beyond what a disclaimer comfortably covers, rather than waiting for an incident to force the review.
- **OQ-8 — Monetization model.** **Deferred to Phase 2 (2026-08-10)**, consistent with its dependency on OQ-1 (still deferred). No V1 monetization surface is assumed by this PRD as a result — confirming that's intentional, not a gap.

---

## 10. Risks

| Risk | Why it matters | Mitigation direction |
|---|---|---|
| Visa/legal content goes stale or wrong | Real-world harm (missed flights, denied entry) — the single biggest liability in this PRD | "As of" dating + source links (FR-7.2) + legal review gate before launch of §5 |
| Deal-optimizer trust metric (§2.1) is genuinely hard | Users have strong destination-choice priors; overriding them needs the reasoning to be visibly good, not just present | Sequence last (Phase 3), ship with visible reasoning (FR-3.3) from day one, not as a v2 add-on |
| Vibe-tag curation doesn't scale past launch set | Product looks broad in a demo, narrow in real use within months | Track this explicitly (OQ-2) rather than let it surface as a support complaint first |
| Tracker becomes "another checklist app nobody opens" | It's the most differentiated feature — also the one with the weakest habit loop by default | Pre-departure escalating-visibility dashboard (FR-6.5) + notifications (TC-14) are load-bearing, not polish |

---

*End of draft. Flag anything above that should be a decided answer rather than a proposed default — that's the point of the OQ list.*
