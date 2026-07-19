# PRD: Office Address Auto-Fill (Pre-Onboarding)

**Owner:** Rashi | **Stage:** Draft for review | **Last updated:** 18 July 2026

---

## 1. Problem Statement

**Problem:** Users don't remember or don't want to type their office address during
the credit card application flow. This step correlates with a steep decline in
application submission at this stage of the pre-onboarding funnel.

**Segment:** All applicants who reach the office/current-address step.

**Funnel stage:** Pre-onboarding (acquisition / conversion).

**Current baseline metric:** *Not yet quantified — open item, see Section 8.*
Before this ships, we need the actual drop-off % at this specific step, isolated
from adjacent steps, to size the opportunity and set a target.

**Suspected root cause:** Manual free-text address entry (3 lines, strict format
rules) is high-effort and error-prone on mobile, especially for office addresses
users don't have memorized the way they know their home address.

**Why now:** Directly ties to this quarter's #1 metric (new cards issued /
funnel conversion).

---

## 2. Goals & Non-Goals

**Goals**
- Reduce manual typing at the office-address step to at most a location pick + confirm.
- Preserve 100% compliance with the downstream API's 3-line, 32-char, Line-1-must-have-a-digit format.
- Never silently produce a wrong or misleading address — every automated decision (drop, default, shorten) must be visible and reviewable.

**Non-Goals (this phase)**
- This PRD does not cover the *current address* (home address) capture flow itself, except where it's a dependency (proximity ranking — see Section 4).
- Not solving for full international address formats (see TC-13, flagged for future scoping).
- Not building a company/employer directory or verified-employer database — we're relying on Google Places as the source of truth, with all the data-quality caveats that implies.

---

## 3. Solution Overview — Phased (V1 → V2)

Both versions solve the same problem — reduce manual address typing — but trade
off effort vs. control differently. Recommend shipping V1 first (lower build
effort, keeps human-in-the-loop pin placement) and V2 as a fast-follow once the
formatting script (already built, see Section 5) is validated at volume.

### V1 — Map-assisted manual pin (lower engineering lift)

**Flow:**
1. User types office name or partial address in a search box.
2. Google Maps opens inline with matching results.
3. User visually selects their office by dropping/confirming a pin.
4. If location permission is **not** granted, results are filtered/biased to
   Bangalore first, then other cities (see Open Question OQ-6 — this default
   needs revisiting).
5. Selected pin's address is passed through the formatting script (Section 5) and pre-filled into the 3 address lines.
6. User reviews and submits.

**Why this first:** The user still visually confirms the exact location (pin),
which is a strong defense against picking the wrong branch of a company with
multiple offices, or a same-named-but-wrong business. Lower risk to ship first.

### V2 — Fully automated fetch-and-arrange

**Flow:**
1. User types office name (free text).
2. Backend calls Google Places API on keystroke-pause / submit.
3. Script (Section 5) arranges the top-matching result(s) into the compliant 3-line format.
4. If multiple addresses match the office name, they are shown **ordered from closest to farthest** from the user's previously-captured current-address location (see Section 4 — this is a hard dependency).
5. User reviews the pre-filled, formatted address and proceeds (edit still allowed).

**Why second:** Removes the manual pin-drop, which is the main friction win —
but increases reliance on the formatting script and on Google's name-matching
being correct without a visual human check. Shipping this after V1 gives us a
volume of real script output (Section 6 test matrix) to validate before removing
the visual-confirmation safety net.

### Phasing rationale (Tech Lead view)
- V1 requires only a Places Autocomplete + Map widget + the existing formatting script.
- V2 requires the same script **plus** reliable proximity-ranking (dependent on current-address geocoding being reliable — not yet validated) **plus** a stronger disambiguation strategy for company-name search (Section 6, TC-9/TC-12).
- Recommend V2 not fully replacing V1, but layering on top: V2's arranged suggestions shown first, with "search on map instead" (V1 flow) always available as a fallback path — not just for failure cases, but as a standing option.

---

## 4. Dependency: Current-Address Capture (Proximity Ranking)

Per the requirement that current address is captured *before* office address,
and used to sort multiple office matches by distance:

- This requires the **current address step itself to produce a reliable
  lat/long**, not just free text. If current address is manually typed (no
  pin/autocomplete), we may not have a clean geocode to rank from.
- **Open question (OQ-1):** What happens when current-address geocoding fails
  or is low-confidence? Proposed: fall back to alphabetical/relevance-score
  ordering, and flag internally (not to the user) that distance-ranking
  wasn't available for that session — this matters for measuring how often
  the "closest to farthest" feature actually works end-to-end.

---

## 5. Address Formatting Script — Rule Precedence

*(This is the `address_filter_pipeline_v2.py` script, already built and validated
against 6 real Google Places responses — see the companion tracking sheet.)*

### 5.1 What gets measured before anything is dropped

Before any component is removed from the address, the script checks, **in this
order**:

1. **Can everything fit, as-is or abbreviated, with zero drops?** The script
   searches every possible way to group components across the 3 lines and
   checks if abbreviation alone (Road→Rd, Building→Bldg, etc.) gets every line
   under 32 characters. If yes, that's the answer — nothing is ever dropped
   just because a *drop* would look tidier; dropping only happens when
   keeping-everything genuinely doesn't fit.
2. **If not, how few components need to go, and which ones?** The script
   ranks every component by a fixed priority tier (below) and searches for the
   *smallest* set of components to remove — preferring to drop the least
   critical ones — such that everything else fits. It is not a rigid "always
   drop Lower tier first" rule: it's "find the cheapest combination that
   works," which occasionally means a nominally-higher-priority component
   (e.g. `route`) has to give way if no combination sparing it succeeds (see
   OQ-2).
3. **Only if a single remaining component still can't fit on its own line**
   does the script shorten *within* that component — and even then, only at
   its own natural punctuation boundaries (commas, dashes), never by cutting
   mid-word. Word-level cutting is an absolute last resort and is loudly
   flagged when it happens, never silent.
4. **The Line-1-digit rule is checked last, independent of the above.** If
   Line 1 ends up without a digit — including the case where the address has
   no digit anywhere at all — the script defaults `"1, "` onto Line 1 rather
   than ship a non-compliant address, and flags this explicitly
   (`Flag:DefaultNumberInserted`) so it's never mistaken for a real building
   number downstream.

### 5.2 Component priority tiers

| Tier | Google types | Droppable? |
|---|---|---|
| Critical | `subpremise`, `premise`, `street_number` | Never |
| High | `route` | Only if no combination sparing it works (rare, flagged) |
| Medium | `sublocality_level_2`, `sublocality_level_3` | Yes, if needed |
| Lower | `sublocality_level_1`, `neighborhood`, `landmark` | Most easily dropped |

### 5.3 What's always visible in the audit trail
Every automated decision — a drop, an abbreviation, a within-component
shorten, or a defaulted "1" — is recorded by name and reason in
`FiltersApplied`. Nothing is inferable-only by diffing input against output.

---

## 6. Test Cases & Edge Cases

Legend: **V** = which version(s) this applies to · **P** = priority (P0 blocks launch, P1 should be handled at launch, P2 can follow)

### 6.1 Core / happy-path

| ID | Scenario | Expected behavior | V | P |
|---|---|---|---|---|
| TC-1 | Office selected has multiple registered addresses (e.g. multiple branches/floors under one company) | Show all matches ordered closest → farthest from user's current-address pin | V1, V2 | P0 |
| TC-2 | User selects "Others" and free-types an office name not in any suggested list | Treat exactly like a normal search query; fetch via Places API on the typed text | V2 | P0 |
| TC-3 | No office address found for the typed name | Show empty state with a clear "Type your office address manually" option — do not block submission | V1, V2 | P0 |
| TC-4 | An address is found, but no combination of the formatting rules (Section 5) can make it compliant even after every fallback (forced word-truncation still exceeds 32, or similar) | Do not silently submit a broken address. Flag for manual entry, same UX as TC-3 | V2 | P0 |
| TC-5 | User works remote for an international/foreign company with no Indian office | See Section 6.4 (International/Remote) — needs a distinct "no office address" path, not routed through Places search at all | V1, V2 | P0 |

### 6.2 Disambiguation & data-quality edge cases

| ID | Scenario | Expected behavior | V | P |
|---|---|---|---|---|
| TC-6 | Office name is generic/common (e.g. "ABC Solutions") and Places returns many unrelated results | Search query should combine employer name + "office"/"corporate office" + user's city context, not name alone, to narrow results; still show a short list, not a firehose | V2 | P0 |
| TC-7 | Office name collides with an unrelated, differently-located business of the same/similar name (e.g. two "Google" listings, a franchise) | V1's visual pin-confirm is the main defense here — reinforces V1-before-V2 sequencing. For V2, surface the company's registered city (if known from employer master data) to bias search, and always show the formatted address for explicit user confirmation, not silent auto-accept | V1, V2 | P0 |
| TC-8 | Office is inside a shared co-working space (WeWork, BHIVE, etc.) where multiple unrelated tenant companies share one building — the returned `subpremise`/floor may belong to a different tenant than the user's actual employer | Do not treat subpremise/floor as ground-truth without a confirm step; the formatted address must be editable, and ideally the UI nudges "confirm your floor/unit" specifically for known co-working addresses | V1, V2 | P1 |
| TC-9 | Office address is stale/outdated in Google (company has physically moved) | User must be able to edit *any* pre-filled field before submitting — auto-fill is a starting point, never a locked value | V1, V2 | P0 |
| TC-10 | Google returns duplicate/near-duplicate listings for the same office (same business, two slightly different pins) | De-duplicate at the search-results level (not just within-line component dedup) before presenting the picker, to avoid showing two visually-identical options | V2 | P1 |
| TC-11 | No numeric component exists anywhere in the address (e.g. a well-known building with no door/floor number in Google's data) | Script defaults Line 1 to `"1, <best available text>"` and flags it (`Flag:DefaultNumberInserted`). **Open UX question (OQ-3):** should the app instead actively prompt "add your floor/unit number" rather than silently show a meaningless "1"? Recommend the latter — see Section 8 | V1, V2 | P0 |
| TC-12 | Address contains a `street_number` type as well as a `subpremise`/floor number — two valid numeric anchors compete for Line 1 | Currently Line 1 defaults to whichever is ordered first (subpremise). **Open question (OQ-2):** should `street_number` (a true door/building number) take precedence over a floor number for Line 1, since it's a stronger locating anchor for a courier/KYC visit? | V1, V2 | P1 |
| TC-13 | Company is entirely outside India (remote/international employer) or Google returns a non-Indian address format | Route to a distinct, non-Places flow — free-text entry with no format constraints beyond basic sanity checks, since the 3-line/32-char Indian-specific rules were designed around Indian address conventions | V1, V2 | P0 |
| TC-14 | User is self-employed / freelancer / has no employer office at all | Office-name step must have an explicit "Not Applicable / No office address" option that skips this step entirely rather than forcing a search | V1, V2 | P0 |
| TC-15 | Only a Google **Plus Code** is available (no real premise/street data) — seen in real testing (OneCard/Pallod Farms II case) | Plus codes are excluded from the line-eligible component pool (not human-writable/courier-usable the way a door number is); falls through to the TC-11 default-"1" behavior. **Open question (OQ-4):** confirm this is preferred over surfacing the plus code itself | V2 | P1 |
| TC-16 | Address components contain data artifacts (stray quote characters, inconsistent casing, e.g. `A" and "B" Block` seen in real testing) | Left verbatim by default (silently "cleaning" text is its own kind of quiet data mangling); optional visible sanitization pass can be added as an explicit, flagged filter step if this proves common at volume | V2 | P2 |

### 6.3 Proximity-ranking edge cases

| ID | Scenario | Expected behavior | V | P |
|---|---|---|---|---|
| TC-17 | User's current-address step didn't produce a usable geocode (manually typed, low-confidence) | Fall back to a non-distance ordering (e.g. Google's own relevance score / alphabetical); do not show a fake or misleading "closest first" order | V2 | P0 |
| TC-18 | Two or more office matches are equidistant / effectively tied | Define an explicit tie-break (recommend: Google's own relevance ranking as secondary sort) | V2 | P2 |
| TC-19 | User denies location permission at the *current address* step (not just office step) | Same fallback as TC-17 — this is the same underlying dependency failure | V1, V2 | P0 |

### 6.4 International / Remote employment

| ID | Scenario | Expected behavior | V | P |
|---|---|---|---|---|
| TC-5 (detailed) | User is a remote employee of a company with no Indian office presence | Recommend a dedicated fork at the office-name step: a toggle/question like "Do you work for a company with a physical India office?" — if no, skip Places search entirely and go to a freeform (or simplified) address entry, since the entire premise of this feature (searching Google Places for an Indian corporate address) doesn't apply | V1, V2 | P0 |
| TC-20 | Remote employee's company *does* have an Indian office, but the user has never physically visited it | Should still be allowed to search/select the registered office address (some banks may require the employer's registered address regardless of the employee's WFH status) — this is a policy question, not just a UX one (see OQ-5) | V1, V2 | P1 |

---

## 7. Cross-Cutting UX Principles (apply to every test case above)

1. **Auto-fill is always a starting point, never a locked value.** Every field
   populated by this feature must remain editable before submission.
2. **No automated decision is ever silent.** Every drop, default, or shorten
   the script performs is visible in principle to whoever needs to audit it —
   the open question is whether/how much of this surfaces to the *end user*
   versus staying in an internal log for Support/Compliance (see OQ-3, OQ-7).
3. **Failure always has a manual path out.** No test case above should be able
   to block application submission — every "not found" / "doesn't fit" case
   routes to manual entry, never a dead end.

---

## 8. Open Questions Requiring Sign-off

| # | Question | Why it matters |
|---|---|---|
| OQ-1 | What's the fallback ordering when current-address geocoding fails? | Affects how often "closest to farthest" actually works — needs a defined behavior, not an accidental one |
| OQ-2 | Should `street_number` outrank `subpremise`/floor for Line 1 when both are present? | Line 1 is meant to be the primary locating anchor; a door number is arguably stronger than a floor number |
| OQ-3 | When no numeric component exists at all, should the UI actively prompt the user for a floor/door number instead of silently defaulting to "1"? | At ~50% no-number rate in early real-data testing, "1" risks becoming meaningless noise at scale rather than a rare edge case |
| OQ-4 | Should a Google Plus Code ever be used as a Line-1 fallback before defaulting to "1"? | Plus codes are Google-derived (better than pure filler) but not human-writable the way a courier needs |
| OQ-5 | For remote employees whose employer *does* have a registered India office, is the employee required to use that address, or can they decline entirely (TC-20)? | This is a compliance/policy call, not a UX call |
| OQ-6 | Should V1's location-denied fallback default to Bangalore specifically, or dynamically to the user's own city (from KYC/current address)? | Hardcoding Bangalore disadvantages every applicant outside Bangalore when location access is denied |
| OQ-7 | For addresses where components had to be dropped (e.g. a landmark or sub-locality), should the user ever see a lightweight version of that ("we simplified your address slightly") or should this stay purely internal/Support-facing? | Ties to overall transparency principle above |
| OQ-8 | *(Carried over, still open)* What is the actual baseline drop-off % at the current office-address step, isolated from other funnel steps? | Needed to size this problem and set a target — currently unquantified |

---

## 9. Metrics (ties to existing funnel Metrics Tree)

**Primary:** Funnel conversion rate at the office-address step (pre- vs. post-launch).

**Guardrails:**
- % of auto-filled addresses accepted **without any edit** vs. % edited by the user (high edit rate = auto-fill isn't actually trustworthy yet).
- % of sessions where `Flag:DefaultNumberInserted` fired (proxy for "no real number available" rate — expect this to inform OQ-3).
- KYC/address-correction rate post-submission for auto-filled vs. manually-typed addresses (compliance guardrail — auto-fill must not increase downstream address errors).

**Leading indicators (pre-launch, from script validation):** % of test addresses achieving `LineLengthCompliant: Y` with zero forced word-truncation, across a representative sample of real Google responses (tracking sheet already in progress).

---

## 10. Phasing Recommendation Summary

1. **Phase 1 (V1):** Map-assisted pin selection + existing formatting script. Lower risk, keeps human visual confirmation.
2. **Phase 2 (V2):** Layer on automated fetch-and-arrange with proximity ranking, V1 remains available as "search on map instead."
3. **Phase 3 (future scope):** International/remote-employee flow (TC-5/TC-13/TC-20) if not already resolved in Phase 1, plus any UX changes arising from OQ-3/OQ-7 (surfacing dropped-component transparency to end users).
