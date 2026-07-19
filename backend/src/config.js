// Central, easy-to-flip constants for open/ambiguous decisions (CLAUDE.md
// Section 7: "pick a reasonable default, implement it behind a flag/constant
// that's easy to flip, and say so"). Nothing here should be hardcoded inline
// elsewhere in the backend.

export const CONFIG = {
  MAX_LINE_LENGTH: 32,
  MAX_LINES: 3,

  // Below this name-match score, a fixture is treated as not-a-match at all
  // (i.e. contributes to a TC-3 empty result rather than a weak-but-present one).
  FUZZY_MATCH_THRESHOLD: 0.32,

  // Reference "current address" geocode used when the frontend doesn't supply
  // one — matches the point sort_office_addresses.py's own __main__ demo uses
  // (Scenario A: "user's current address is near Koramangala").
  DEFAULT_CURRENT_LOCATION: { latitude: 12.9352, longitude: 77.6245 },

  // OQ-2 (PRD Section 8, TC-12): when both a subpremise/floor AND a
  // street_number are present, which numeric anchor should lead Line 1?
  // "subpremise_first" matches the PRD's documented *current* behavior.
  // "street_number_first" is the raised-but-unresolved alternative. This is
  // deliberately a config flag, not a hardcoded pick — flip it to compare.
  LINE1_NUMERIC_PRECEDENCE: "subpremise_first",
};

// Surfaced verbatim in GET /meta and in Dev Mode's "open questions" panel —
// per CLAUDE.md Section 5, these are explicit non-goals for this harness:
// don't silently resolve them, just make the current default visible.
export const OPEN_QUESTIONS = [
  {
    id: "OQ-2",
    question: "Should street_number outrank subpremise/floor for Line 1 when both are present?",
    status: "open",
    currentDefault: `CONFIG.LINE1_NUMERIC_PRECEDENCE = "${CONFIG.LINE1_NUMERIC_PRECEDENCE}" (backend/src/config.js)`,
    prdRef: "PRD Section 8 / TC-12",
  },
  {
    id: "OQ-3",
    question: "When no numeric component exists at all, should the UI actively prompt for a floor/door number instead of silently defaulting to \"1\"?",
    status: "open",
    currentDefault: "Silent default '1, ' + Flag:DefaultNumberInserted only — the harness implements the PRD's documented current behavior, not the recommended prompt-instead alternative.",
    prdRef: "PRD Section 8 / TC-11",
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
