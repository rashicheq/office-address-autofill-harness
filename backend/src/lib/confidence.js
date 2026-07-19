// Confidence scorer. Weighting approved by Rashi 2026-07-19 — "balanced-risk"
// over an equal-weight and a compliance-weighted alternative (see CLAUDE.md
// Section 4.0 and the chat log). Weights are a named constant specifically so
// this can be revisited without touching call sites; every sub-score is
// returned alongside the total so Dev Mode never shows a black-box number.

import { nameMatchScore } from "./fuzzyMatch.js";

export const CONFIDENCE_WEIGHTS = {
  nameMatch: 0.3,
  completeness: 0.25,
  formattingIntegrity: 0.3,
  rankingCertainty: 0.15,
};

// "Does the raw place data have a real door number or floor/suite, or only
// a rough area-level pin / Plus Code?" — independent of what the formatting
// pipeline later does with it.
export function scoreCompleteness(rawComponents = []) {
  const types = new Set(rawComponents.map((c) => c.type));
  const hasStreetNumber = types.has("street_number");
  const hasSubpremise = types.has("subpremise");
  const hasRoute = types.has("route");
  const hasPlusCode = types.has("plus_code");
  const hasNumericAnchor = hasStreetNumber || hasSubpremise;

  if (hasStreetNumber && hasSubpremise) return 1.0;
  if (hasNumericAnchor && hasRoute) return 0.85;
  if (hasNumericAnchor) return 0.65;
  if (hasRoute) return 0.5;
  if (hasPlusCode) return 0.15; // TC-15: Plus Code only, no human-writable anchor
  return 0.3; // only sublocality/neighborhood-level data
}

// "How hard did the formatting pipeline have to fight to make this
// compliant?" — table-driven so it's visible and easy to retune, not a
// black box. Penalties stack (e.g. a route drop pushes both a generic
// Dropped: penalty and the extra HighTierComponentDropped penalty),
// intentionally making a route drop cost more than a lower-tier drop.
const INTEGRITY_PENALTIES = [
  { prefix: "Abbreviation:", penalty: 0.02 },
  { prefix: "Dropped:", penalty: 0.08 },
  { prefix: "Flag:HighTierComponentDropped:", penalty: 0.25 },
  { prefix: "Shortened:PunctuationBoundary", penalty: 0.15 },
  { prefix: "Flag:WordLevelCut", penalty: 0.35 },
  { prefix: "Flag:DefaultNumberInserted", penalty: 0.45 },
];

export function scoreFormattingIntegrity(filtersApplied = []) {
  let score = 1.0;
  for (const flag of filtersApplied) {
    const match = INTEGRITY_PENALTIES.find((p) => flag.startsWith(p.prefix));
    if (match) score -= match.penalty;
  }
  return Math.max(0, Math.min(1, score));
}

// Approved answer to the single-candidate question: nothing was there to
// rank, so score neutral/full confidence rather than penalizing or
// reweighting. Otherwise, fallback_relevance visibly costs confidence since
// we don't actually know the result is the closest one (PRD TC-17/18/19).
export function scoreRankingCertainty(rankingMethod, totalCandidateCount) {
  if (totalCandidateCount <= 1) return 1.0;
  return rankingMethod === "distance" ? 1.0 : 0.4;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * query: the typed office name.
 * name: the candidate's returned name.
 * rawComponents: the candidate's original (pre-formatting) address components.
 * filtersApplied: the formatting pipeline's FiltersApplied list for this candidate.
 * rankingMethod: "distance" | "fallback_relevance".
 * totalCandidateCount: how many candidates were in this response batch.
 *
 * Returns { score: 0-100, breakdown: { <component>: {value, weight, contribution} } }.
 */
export function computeConfidence({
  query,
  name,
  rawComponents,
  filtersApplied,
  rankingMethod,
  totalCandidateCount,
}) {
  const values = {
    nameMatch: nameMatchScore(query, name),
    completeness: scoreCompleteness(rawComponents),
    formattingIntegrity: scoreFormattingIntegrity(filtersApplied),
    rankingCertainty: scoreRankingCertainty(rankingMethod, totalCandidateCount),
  };

  const breakdown = {};
  let weightedTotal = 0;
  for (const key of Object.keys(CONFIDENCE_WEIGHTS)) {
    const value = values[key];
    const weight = CONFIDENCE_WEIGHTS[key];
    const contribution = value * weight;
    weightedTotal += contribution;
    breakdown[key] = { value: round2(value), weight, contribution: round2(contribution) };
  }

  return { score: Math.round(weightedTotal * 100), breakdown };
}

// Shape used when a result never reached a real address (TC-4 / no line-
// eligible components) — confidence doesn't apply to something that isn't
// being shown as a usable auto-fill.
export const NOT_APPLICABLE_CONFIDENCE = {
  score: null,
  breakdown: null,
  notApplicable: true,
  reason: "Address could not be made compliant — routed to manual entry, no score computed.",
};
