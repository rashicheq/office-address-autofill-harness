// Central, easy-to-flip constants for open/ambiguous decisions (CLAUDE.md
// Section 7: "pick a reasonable default, implement it behind a flag/constant
// that's easy to flip, and say so"). Nothing here should be hardcoded inline
// elsewhere in the backend.

export const CONFIG = {
  // Per-field max length (2026-08 structured-field revision). Office
  // Floor/Tower and Office Block/Building Name are each normally a single
  // short value, so a generous cap rarely engages; Area/Locality combines
  // more components so gets a larger budget.
  MAX_FIELD_LENGTH: 48,
  MAX_AREA_LOCALITY_LENGTH: 64,

  // Below this name-match score, a fixture is treated as not-a-match at all
  // (i.e. contributes to a TC-3 empty result rather than a weak-but-present one).
  FUZZY_MATCH_THRESHOLD: 0.32,

  // Reference "current address" geocode used when the frontend doesn't supply
  // one — matches the point sort_office_addresses.py's own __main__ demo uses
  // (Scenario A: "user's current address is near Koramangala").
  DEFAULT_CURRENT_LOCATION: { latitude: 12.9352, longitude: 77.6245 },
};

// Surfaced verbatim in GET /meta and in Dev Mode's "open questions" panel —
// per CLAUDE.md Section 5, these are explicit non-goals for this harness:
// don't silently resolve them, just make the current default visible.
export const OPEN_QUESTIONS = [
  {
    id: "OQ-2",
    question: "Should street_number outrank subpremise/floor for Line 1 when both are present?",
    status: "resolved-by-restructuring",
    currentDefault:
      "Moot since the 2026-08 structured-field revision: subpremise now owns Office Floor/Tower and street_number owns (part of) Office Block/Building Name — they no longer compete for the same field.",
    prdRef: "PRD Section 8 / TC-12",
  },
  {
    id: "OQ-3",
    question: "When no numeric component exists at all, should the UI actively prompt for a floor/door number instead of silently defaulting to \"1\"?",
    status: "resolved-by-restructuring",
    currentDefault: "Resolved 2026-08 in favor of prompting: Address Line 1 is now always a required, user-typed field for every result, superseding the silent '1, ' default. That default still exists in formattingPipeline.js, but only for Dev Mode's legacy diagnostic view — User Mode never reads it.",
    prdRef: "PRD_Office_Address_Autofill_V2.md Section 12 / originally PRD Section 8 / TC-11",
  },
  {
    id: "OQ-4",
    question: "Should a Google Plus Code ever be used as a Line-1 fallback before defaulting to \"1\"?",
    status: "open",
    currentDefault: "Plus codes are excluded from the line-eligible component pool entirely and fall through to the TC-11 default-1 behavior.",
    prdRef: "PRD Section 8 / TC-15",
  },
  {
    id: "OQ-7",
    question: "Should dropped/shortened components ever surface to the end user (e.g. 'we simplified your address slightly'), or stay Support-facing only?",
    status: "open",
    currentDefault: "Stays Dev-Mode/internal only in this harness — User Mode shows the final address with no drop disclosure.",
    prdRef: "PRD Section 8",
  },
];
