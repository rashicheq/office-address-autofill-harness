# PRD: Places Autocomplete Prefill for Office Address Capture

**Last updated:** 14 August 2026 — implemented against the local test harness; see `CLAUDE.md`'s 2026-08 dated notes for the exact code changes this drove.

---

## Objective

Improve fill rate and address accuracy for office addresses in the credit card application journey by using the Places Autocomplete API in Career Info to prefill and accelerate office address capture on the next screen.

This feature applies to **both salaried and self-employed applicants**. The solution uses the Google Places Autocomplete API to search for office addresses based on the office name entered on the previous screen, while preserving full fallback options for manual search and manual address entry.

## Problem Statement

Today, users must manually enter their office address after completing their career details. This creates friction because users often know their office name but may not know the complete address format needed in the application. As a result, office address completion can suffer from lower fill rates, slower completion, and address quality issues.

## Proposed Solution

Capture the office name entered on the Career Info screen and carry it forward to the Office Address screen as a pre-filled search query. When the user clicks the search box, the backend calls the Google Places Autocomplete API using the office name as the initial search input and displays relevant office results in India.

- If relevant results are found, the user can select one and the app auto-populates the supported office address fields.
- If no relevant result is found, the user can refine the search manually by typing an area or alternate location.
- If the user still does not find a match, the user can manually fill all address fields as per existing validation rules.

**Expected outcome:** Faster address completion, fewer user drop-offs on the office address screen, and improved standardisation of downstream office address data.

## User Flow

1. User completes Career Info screen and enters employment type, office/company name, designation, years of experience, and email ID.
2. On submit, the entered office name is passed to the next screen.
3. On the Office Address screen, the address search box is pre-filled with the office name.
4. When the user taps/clicks the search box, Google Places Autocomplete API is triggered using the pre-filled office name.
5. The system shows relevant office suggestions constrained to India and filtered for office as establishment intent.
6. User selects a suggestion.
7. The backend consumes the Places response and populates the address fields per mapping rules.
8. User manually enters Address Line 1, reviews the remaining fields, and proceeds.
9. If no result is selected, the user may search again or complete the address manually.
10. After submission, the captured address is processed by the LLM-based formatter (same as current address) to fit the Bank's downstream API schema.

## Scope

| Area | In Scope | Out of Scope | Notes |
|---|---|---|---|
| Applicant types | Salaried and self-employed | Other employment journeys not using office address capture | Common behavior across both paths |
| Pre-fill behaviour | Office name carried from Career Info to Office Address search box | Backfilling Career Info from address screen | One-way prefilling only |
| Address sourcing | Google Places Autocomplete and manual entry fallback | Alternate third-party address providers | Google Places is primary source |
| Address formatting | LLM transforms captured address to Bank API format | Changes to Bank API contract | Transformation happens after user submission |

## Functional Requirements

**1. Office name carry forward to search section**
- System shall capture the office/company name entered on the Career Info screen.
- System shall persist this value through navigation to the Office Address screen.
- System shall display this value as pre-filled text in the office address search box.

**2. Places Autocomplete Invocation**
- Places Autocomplete API shall be called when the user clicks/taps the search box containing the pre-filled office name, **or** it should be called when the user submits the Career Info screen — **decision yet to be finalised, pending API pricing quotations.**
- Search shall use the office name as the initial query string.
- Search shall be constrained to India.
- Search intent shall prioritise establishment type: office.
- Response fields required for downstream population shall include premise-related and locality-related components needed for address parsing — specifically: Premise, Sub premise, Locality, Route, Postal code, State.

**3. Suggestion Display and Selection**
- User shall see relevant search suggestions based on the pre-filled office name.
- User shall be able to select one of the suggestions.
- User shall be able to edit the search term and trigger a refined search if the initial results are not useful.

**4. Fallback Behaviour**
- If no address is returned for the office name, the user shall be allowed to search by area, locality, or alternate office name query.
- If the user does not select any Places result, the user shall be allowed to manually fill all address fields.
- Manual entry shall continue to follow the same validation and error-handling rules as the current address flow.

**5. Address field population rules**

| Field | Built From | Auto-filled | Rule |
|---|---|---|---|
| Address Line 1 | User input only | No | Always blank by default. User must enter floor number, building/tower name. Required for continuation. |
| Address Line 2 | subpremise + premise + street_number | Yes | Join available components in display order. |
| Address Line 3 | route | Yes | Populate if present in Places response. |
| City/District | locality | Yes | Populate if present. |
| State | administrative_area_level_1 | Yes | Populate if present. |
| Pincode | postal_code | Yes | Populate if present. |

**Critical rule:** Address Line 1 must never be populated by backend or Places response. It remains a mandatory user-entered field, and the CTA remains disabled until it contains valid text. **Also, the user should not be able to edit any of the fields that are pre-filled using the Places API.**

**6. Submission and Transformation**
- After the user confirms the office address, the captured values shall be sent to backend.
- Backend shall retain the structured response from Google Places where applicable.
- An LLM-based transformation layer shall map the captured address into the field structure required by the Bank's API.

## Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-01 | The applicant completes Career Info with a valid office or company name | The applicant submits the Career Info screen | The office name is persisted and carried to the Office Address screen for both salaried and self-employed journeys |
| AC-02 | The Office Address screen is opened with a carried-forward office name | The search field is displayed | The search field is pre-filled with the office name and the applicant can edit it |
| AC-03 | The search field contains an office name or an editable places query | Places search is triggered according to the final invocation decision | The request is scoped to India and prioritises office establishments using the agreed response fields |
| AC-04 | Places returns suggestions in the dropdown after 3 characters are input by the user | The applicant views the search results as they type more characters | Relevant suggestions are displayed and the applicant can select a result |
| AC-05 | The applicant selects a Places result | The address response is processed | Address Line 2 is built from available subpremise, premise, and street_number components; Address Line 3 from route; and City/District, State, and Pincode from locality, administrative_area_level_1, and postal_code respectively |
| AC-06 | A Places result is selected | The address fields are populated | Address Line 1 remains blank and is never populated by Places or the backend; mapped fields are read-only where required by the agreed UX |
| AC-07 | Address Line 1 is empty or invalid | The applicant views or attempts to use Confirm and Continue | Confirm and Continue remains disabled and the applicable validation guidance is shown |
| AC-08 | Places returns no result, an incomplete result, or an error | The applicant continues the address journey | The applicant can refine the search by office name, area, or locality, or switch to full manual entry without being blocked |
| AC-09 | The applicant uses manual entry | They enter the address and submit | The current address validation rules and error messages are applied to all required fields |
| AC-10 | The applicant submits a valid office address | The backend receives the address | The structured Places response, user-entered values, and final address are retained as applicable, and the LLM transformation maps the result to the Bank API schema before submission |

## Detailed UX Behaviour

| Scenario | User Experience | System Behaviour | Expected Result |
|---|---|---|---|
| Office name has strong match | User sees relevant office suggestions immediately | Places query triggered with office name pre-fill | Reduced typing and faster completion |
| Office name has weak or no match | User edits search with area or landmark | System supports refined search attempts | Improved recovery without forcing manual entry immediately |
| No useful Places result | User manually fills address | Existing validations remain applicable | Journey completion remains unblocked |
| Places result selected but partial fields missing | User reviews populated fields and completes remaining required inputs | Only available components are mapped | Graceful handling of incomplete provider response |

## Validation and Error Handling

- Address Line 1 is mandatory and user-entered.
- Confirm and Continue remains disabled until Address Line 1 is entered and all required validations pass.
- For manual entry, the same field-level rules and error messages as the current address flow shall apply.
- If Places API fails, times out, or returns empty results, the user shall still be able to search again or enter the address manually.
- If any mapped field is unavailable in the Places response, the field remains editable and can be completed by the user where allowed by current UX.

## Business Logic Notes

- The pre-filled office name is a search accelerator, not a locked value.
- Autocomplete should optimise for discoverability of office locations rather than strict exact-name matching.
- The solution should work consistently for both corporate offices and self-employed business establishments.
- Structured address output from Places should be preserved as much as possible before LLM transformation to reduce formatting ambiguity.

## Risks and Mitigations

| Risk | Impact | Mitigation | Status |
|---|---|---|---|
| Office name returns irrelevant places | Low trust and lower adoption | Allow user refinement by area/locality and manual entry fallback | |
| Incomplete Places metadata | Partial autofill experience | Populate only available fields and keep fields editable where applicable | |
| Users assume Address Line 1 should auto-fill | Form confusion | Use helper text clarifying that floor/building details must be entered manually | |

## Success Metrics

- Increase in office address screen completion rate.
- Increase in percentage of users selecting a suggested address result.
- Reduction in manual typing effort on office address fields.
- Improvement in address accuracy for downstream processing.
- Reduction in address-related validation failures and backend formatting corrections.

**Final design principle:** The feature should improve speed and accuracy without creating dependency on autocomplete. The journey must always remain recoverable through refined search and full manual entry.

---

## Implementation Notes (harness-specific — not part of the original PRD text above)

What was verified against this PRD in the local test harness, and where reality necessarily diverges from the spec as written:

- **AC-04's 3-character threshold** is implemented exactly: `OfficeSearchSheet.jsx` withholds any suggestion fetch (and the "not found" empty state) until the query has 3+ characters, so a 1- or 2-character query shows nothing rather than a premature "no results."
- **The "read-only pre-filled fields" rule (Section 5's critical rule, AC-06)** is implemented as: once a result comes from a Places pick, Address Line 2, Address Line 3, Pincode, City/District, and State are all disabled inputs — only Address Line 1 accepts typing. In full manual entry (no Places result was ever picked), every field — including City/District and State — is a normal editable input instead, since there's no Places data to protect in that path. Implementing this precisely surfaced and fixed a pre-existing gap: City/District and State were previously disabled *unconditionally*, meaning the manual-entry path could never actually capture a city or state at all.
- **AC-02's "search field... editable" and Section 2's India/office-establishment scoping**: the *mocked* Autocomplete endpoint (`GET /suggest`) has no geography or establishment-type concept to constrain, since it's matching against a small local fixture set, not a real Google index — this is unchanged from the existing "no Autocomplete key, mock it and show the flow" approach documented in `CLAUDE.md`. The scoping requirement **was** implemented against the one real Google call this harness makes — Places Text Search, used to resolve a picked result — via `regionCode: "IN"` and a query-text augmentation that appends "office" when it isn't already present (`buildOfficeIntentQuery` in `liveSearch.js`). A stricter `includedType` filter was deliberately **not** added: Google's Places type taxonomy has no verified, documented enum for a narrow "office" category, and guessing one risks a hard 400 from the real API — flagged here rather than silently attempted.
- **Section 2's invocation-timing question ("on click" vs. "on Career Info submit")** is explicitly left open by this PRD pending a pricing decision — not resolved here either. The harness's current behavior (suggestions become available as soon as the sheet opens, seeded with the pre-filled office name) sits closer to "available immediately" than a strict "wait for a click" gate; revisit once the pricing decision lands.
- **Section 6 / AC-10's LLM-based transformation layer** is the same backend-only agent already flagged as out of scope in `PRD_Office_Address_Autofill_V2.md` — no key, no output-shape spec, not stubbed here.
- **Employment type / self-employed handling**: this PRD's Scope table calls out "salaried and self-employed" as both in-scope, but the Career Info screen in this harness (`CompanyDetailsView.jsx`) doesn't currently branch on employment type — Company Name is captured the same way regardless. Nothing here currently prevents a self-employed applicant's business name from flowing through the same search, but no distinct self-employed path or field set was added — flagged as unverified rather than assumed equivalent.
