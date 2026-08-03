// -----------------------------------------------------------------------------
// STUB / PROVENANCE NOTICE
// -----------------------------------------------------------------------------
// address_filter_pipeline_v2.py (the canonical, already-validated formatting
// script referenced throughout the PRD and CLAUDE.md) is NOT present in this
// repo. Per CLAUDE.md 3.1 / 4.0 ("stub this if address_filter_pipeline_v2.py
// isn't in the repo — flag that it's a stub"), this file is a harness-local
// REIMPLEMENTATION of the rules documented in PRD Section 5, written from the
// spec rather than ported from the real script. Treat its exact output as
// illustrative, not authoritative. Every response carries
// `pipelineImplementation: "harness-stub"` plus this note.
//
// Field schema (2026-08 revision): outputs the onboarding form's actual named
// fields (per the attached Figma) — officeFloorTower, officeBlockBuilding,
// areaLocality, pincode, cityDistrict, state — instead of the earlier generic
// Line 1/2/3. Each field independently holds whichever component(s) it owns;
// there's no more shared 3-line packing constraint, so the old "smallest set
// to drop across 3 lines" search is now scoped per-field (only areaLocality
// realistically combines enough components to ever need dropping).
// -----------------------------------------------------------------------------

export const PIPELINE_PROVENANCE = {
  implementation: "harness-stub",
  note:
    "Reimplements PRD Section 5 rules locally against the Figma's structured fields; NOT the canonical address_filter_pipeline_v2.py, which isn't in this repo.",
};

// PRD Section 5.2 — component priority tiers, now used to decide what drops
// from areaLocality (officeFloorTower/officeBlockBuilding each own a single
// component type and don't compete for space with anything else).
const TIER_BY_TYPE = {
  subpremise: "critical",
  premise: "critical",
  street_number: "critical",
  route: "high",
  sublocality_level_2: "medium",
  sublocality_level_3: "medium",
  sublocality_level_1: "lower",
  neighborhood: "lower",
  landmark: "lower",
};

const TIER_COST = { lower: 1, medium: 3, high: 100 };

// Denominator for the "50%+ components missing" rule (Rashi, 2026-08).
// Deliberately excludes sublocality_level_2/3 and landmark — those are
// legitimately absent on plenty of perfectly fine addresses (see fixtures),
// so counting them would trigger this rule on addresses that are actually
// fine. These 6 are the ones a normal, well-formed office address should
// have most of.
const CORE_COMPONENT_TYPES = ["subpremise", "premise", "street_number", "route", "sublocality_level_1", "neighborhood"];

// Order components combine within Area/Locality when more than one exists.
const AREA_LOCALITY_ORDER = ["route", "sublocality_level_3", "sublocality_level_2", "sublocality_level_1", "neighborhood", "landmark"];

const NON_LINE_TYPE_TO_FIELD = {
  locality: "cityDistrict",
  administrative_area_level_1: "state",
  postal_code: "pincode",
};

const ABBREVIATIONS = [
  [/\broad\b/gi, "Rd"],
  [/\bstreet\b/gi, "St"],
  [/\bbuilding\b/gi, "Bldg"],
  [/\bavenue\b/gi, "Ave"],
  [/\bapartments?\b/gi, "Apt"],
  [/\bfloor\b/gi, "Flr"],
  [/\bextension\b/gi, "Extn"],
  [/\bjunction\b/gi, "Jn"],
];

function abbreviateText(text) {
  let out = text;
  for (const [pattern, replacement] of ABBREVIATIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function rangeArray(n) {
  return Array.from({ length: n }, (_, i) => i);
}

function kCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...tail] = arr;
  const withHead = kCombinations(tail, k - 1).map((c) => [head, ...c]);
  const withoutHead = kCombinations(tail, k);
  return [...withHead, ...withoutHead];
}

// PRD 5.1 step 3 equivalent, scoped to one component's OWN text: shorten at
// its natural internal punctuation first; a mid-word cut is a loud, flagged
// last resort. Returns { text: null, cutMethod: "impossible" } when not even
// one whole word fits — critical-tier fields (officeFloorTower,
// officeBlockBuilding) treat that as genuine non-compliance (TC-4); the
// non-critical areaLocality field falls back to a forced word-cut instead of
// propagating null, since nothing in it is undroppable.
function shortenAtPunctuation(text, maxLen) {
  if (maxLen <= 0) return { text: null, cutMethod: "impossible" };
  if (text.length <= maxLen) return { text, cutMethod: null };

  const slice = text.slice(0, maxLen);
  for (let i = slice.length - 1; i >= 0; i -= 1) {
    if (slice[i] === "," || slice[i] === "-") {
      const cut = text.slice(0, i).trimEnd();
      if (cut.length > 0) return { text: cut, cutMethod: "punctuation" };
      break;
    }
  }
  for (let i = slice.length - 1; i >= 0; i -= 1) {
    if (slice[i] === " ") {
      const cut = text.slice(0, i).trimEnd();
      if (cut.length > 0) return { text: cut, cutMethod: "word" };
      break;
    }
  }
  return { text: null, cutMethod: "impossible" };
}

// Finds the smallest-cost set of areaLocality components to drop so the
// remainder fits maxLen when joined with ", " — same minimal-drop-search
// idea as before (PRD 5.1 step 2), scoped to this one field instead of a
// shared 3-line document.
function dropAreaComponentsToFit(components, maxLen) {
  const join = (list) => list.map((c) => c.text).join(", ");
  if (components.length === 0 || join(components).length <= maxLen) {
    return { kept: components, dropped: [] };
  }

  const idxs = rangeArray(components.length);
  for (let k = 1; k <= idxs.length; k += 1) {
    const combos = kCombinations(idxs, k);
    combos.sort((a, b) => {
      const cost = (combo) => combo.reduce((sum, i) => sum + TIER_COST[TIER_BY_TYPE[components[i].type]], 0);
      return cost(a) - cost(b);
    });
    for (const combo of combos) {
      const dropSet = new Set(combo);
      const kept = components.filter((_, i) => !dropSet.has(i));
      if (join(kept).length <= maxLen) {
        return { kept, dropped: combo.map((i) => components[i]) };
      }
    }
  }
  return { kept: [], dropped: components };
}

function extractNonLineFields(rawComponents) {
  const fields = { cityDistrict: "", state: "", pincode: "" };
  for (const c of rawComponents) {
    const field = NON_LINE_TYPE_TO_FIELD[c.type];
    if (field && !fields[field]) fields[field] = c.text;
  }
  return fields;
}

function buildByType(rawComponents) {
  const byType = {};
  for (const c of rawComponents) {
    if (!byType[c.type]) byType[c.type] = c;
  }
  return byType;
}

/**
 * rawComponents: [{ type, text }], in Google's original order.
 * options: { maxFieldLength, maxAreaLocalityLength }
 *
 * Returns { officeFloorTower, officeBlockBuilding, areaLocality, cityDistrict,
 * state, pincode, filtersApplied, compliant, requiresManualEntry, sparseData }.
 */
export function formatAddress(rawComponents, options = {}) {
  const maxFieldLen = options.maxFieldLength ?? 48;
  const maxAreaLen = options.maxAreaLocalityLength ?? 64;

  const nonLineFields = extractNonLineFields(rawComponents);
  const byType = buildByType(rawComponents);
  const filtersApplied = [];

  // ---- Major callout (Rashi, 2026-08): 50%+ of core components missing ----
  // Strictly more than half missing (not >=) so an exactly-half case like
  // TC-11's Silver Oak fixture keeps its existing "missing digit only"
  // behavior instead of falling into this new, more drastic rule.
  const presentCoreCount = CORE_COMPONENT_TYPES.filter((t) => byType[t]).length;
  const missingCoreCount = CORE_COMPONENT_TYPES.length - presentCoreCount;
  const sparseData = missingCoreCount > CORE_COMPONENT_TYPES.length / 2;

  if (sparseData) {
    // "Entire google location" still excludes plus_code — a Plus Code is a
    // machine geocode string, never meant for human display anywhere
    // (TC-15/OQ-4), sparse fallback included.
    const fullDump = rawComponents
      .filter((c) => c.type !== "plus_code")
      .map((c) => c.text)
      .filter(Boolean)
      .join(", ");
    filtersApplied.push("Flag:SparseDataManualEntryRequired");
    return {
      officeFloorTower: "",
      officeBlockBuilding: "",
      areaLocality: fullDump,
      ...nonLineFields,
      filtersApplied,
      compliant: true,
      requiresManualEntry: false,
      sparseData: true,
    };
  }

  const nonCompliantResult = () => ({
    officeFloorTower: null,
    officeBlockBuilding: null,
    areaLocality: null,
    ...nonLineFields,
    filtersApplied: [...filtersApplied, "Flag:NonCompliantRouteToManualEntry"],
    compliant: false,
    requiresManualEntry: true,
    sparseData: false,
  });

  // ---- Office Floor / Tower <- subpremise (critical: never dropped, only
  // ever shortened at ITS OWN punctuation; genuinely unshortenable -> TC-4) ----
  let officeFloorTower = "";
  if (byType.subpremise) {
    officeFloorTower = abbreviateText(byType.subpremise.text);
    if (officeFloorTower !== byType.subpremise.text) filtersApplied.push("Abbreviation:subpremise");
    if (officeFloorTower.length > maxFieldLen) {
      const { text, cutMethod } = shortenAtPunctuation(officeFloorTower, maxFieldLen);
      if (text == null) return nonCompliantResult();
      officeFloorTower = text;
      filtersApplied.push(cutMethod === "word" ? "Flag:WordLevelCut:officeFloorTower" : "Shortened:PunctuationBoundary:officeFloorTower");
    }
  }

  // ---- Office Block / Building Name <- street_number + premise. Both
  // critical, so street_number stays a fixed prefix and only premise's OWN
  // text gets shortened if the pair is too long together — never at the
  // join comma between them, which would silently swallow the whole
  // building name instead of the intended "shorten one long component". ----
  const streetNumberText = byType.street_number ? abbreviateText(byType.street_number.text) : "";
  let premiseText = byType.premise ? abbreviateText(byType.premise.text) : "";
  if (byType.premise && premiseText !== byType.premise.text) filtersApplied.push("Abbreviation:premise");

  const joinPrefixLen = streetNumberText && premiseText ? streetNumberText.length + 2 : 0;
  const premiseBudget = maxFieldLen - joinPrefixLen;
  if (premiseText.length > premiseBudget) {
    const { text, cutMethod } = shortenAtPunctuation(premiseText, premiseBudget);
    if (text == null) return nonCompliantResult();
    premiseText = text;
    filtersApplied.push(cutMethod === "word" ? "Flag:WordLevelCut:officeBlockBuilding" : "Shortened:PunctuationBoundary:officeBlockBuilding");
  }
  const officeBlockBuilding = [streetNumberText, premiseText].filter(Boolean).join(", ");

  // ---- Area/Locality <- route + sublocality tiers + neighborhood + landmark
  // (all non-critical: nothing here is undroppable, so a forced word-cut is
  // the worst case, never a route to manual entry) ----
  const areaComponents = AREA_LOCALITY_ORDER.map((t) => byType[t]).filter(Boolean);
  const abbreviatedArea = areaComponents.map((c) => ({ ...c, text: abbreviateText(c.text) }));
  abbreviatedArea.forEach((c, i) => {
    if (c.text !== areaComponents[i].text) filtersApplied.push(`Abbreviation:${c.type}`);
  });
  const { kept, dropped } = dropAreaComponentsToFit(abbreviatedArea, maxAreaLen);
  dropped.forEach((c) => {
    filtersApplied.push(`Dropped:${c.type}`);
    if (TIER_BY_TYPE[c.type] === "high") filtersApplied.push(`Flag:HighTierComponentDropped:${c.type}`);
  });
  let areaLocality = kept.map((c) => c.text).join(", ");
  if (areaLocality.length > maxAreaLen) {
    const { text, cutMethod } = shortenAtPunctuation(areaLocality, maxAreaLen);
    areaLocality = text ?? areaLocality.slice(0, maxAreaLen).trim();
    filtersApplied.push(cutMethod === "word" ? "Flag:WordLevelCut:areaLocality" : "Shortened:PunctuationBoundary:areaLocality");
  }

  // ---- Digit-anchor rule: some field must carry a real numeric identifier ----
  // (PRD's "Line 1 must end with a digit" adapted: since there's no single
  // lead line anymore, this now checks the two precise-location fields.)
  const hasDigit = /\d/.test(officeFloorTower) || /\d/.test(officeBlockBuilding);
  if (!hasDigit) {
    officeFloorTower = officeFloorTower ? `1, ${officeFloorTower}` : "1";
    filtersApplied.push("Flag:DefaultNumberInserted");
  }

  return {
    officeFloorTower,
    officeBlockBuilding,
    areaLocality,
    ...nonLineFields,
    filtersApplied,
    compliant: true,
    requiresManualEntry: false,
    sparseData: false,
  };
}

export { TIER_BY_TYPE, CORE_COMPONENT_TYPES };
