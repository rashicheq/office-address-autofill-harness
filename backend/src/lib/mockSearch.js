// Orchestrates the mock data source: fixture lookup (fuzzy-matched or
// explicitly scenario-picked) -> formatting pipeline -> proximity ranker ->
// confidence scorer -> response envelope. This is the only place that knows
// about fixtures.json's shape.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { findBestMatch, nameMatchScore } from "./fuzzyMatch.js";
import { sortOfficeCandidates } from "./ranker.js";
import { formatAddress, PIPELINE_PROVENANCE } from "./formattingPipeline.js";
import { computeConfidence, NOT_APPLICABLE_CONFIDENCE } from "./confidence.js";
import { CONFIG } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(
  readFileSync(path.join(__dirname, "../data/fixtures.json"), "utf-8")
);

const entryByKey = new Map(fixtures.entries.map((e) => [e.key, e]));

export function listScenarios() {
  return fixtures.entries.map((e) => ({
    key: e.key,
    kind: e.kind,
    testCase: e.testCase ?? null,
    label: e.label ?? e.names[0],
    description: e.description ?? null,
    names: e.names,
  }));
}

// Mocks Google Places Autocomplete for the User Mode search sheet — Rashi
// doesn't have a key/setup for that API yet (2026-08 flow-correction note,
// CLAUDE.md 4.0), so this scans the same fixture set instead of calling out.
// Only companies, area entries, and scenarios explicitly flagged
// `userFacing` are suggestible — the rest (TC-3/TC-4/TC-11/... edge cases)
// stay Dev-Mode-only, reached via the named-scenario picker, not by someone
// typing a real-looking office name.
const SUGGESTIBLE_KINDS = new Set(["company", "area"]);

export function listSuggestions(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];

  const suggestible = fixtures.entries.filter((e) => SUGGESTIBLE_KINDS.has(e.kind) || e.userFacing);
  const matches = suggestible.filter((e) => e.names.some((n) => n.toLowerCase().includes(q)));

  return matches.flatMap((e) => {
    const kind = e.kind === "area" ? "area" : "office";

    // TC-1: a company with multiple branches shows every branch as its own
    // row, closest first (same ranker /search uses) — the user picks the
    // specific office they work at right here, rather than a single
    // collapsed row hiding a second picker screen behind it.
    if (e.candidates.length > 1) {
      const { candidates: ranked } = sortOfficeCandidates(CONFIG.DEFAULT_CURRENT_LOCATION, e.candidates);
      return ranked.map((c, i) => ({
        key: e.key,
        placeId: c.place_id,
        label: c.name,
        kind,
        closest: i === 0,
      }));
    }

    return [{
      key: e.key,
      // Always the real name (e.names[0]), never e.label — label is Dev
      // Mode's own scenario-description text (e.g. "Multiple branches —
      // ordered closest to farthest"), not something a real user should
      // see here.
      label: e.names[0],
      kind,
    }];
  });
}

function resolveEntry(entryKey) {
  const entry = entryByKey.get(entryKey);
  if (!entry) return null;
  if (entry.reuseCandidatesFrom) {
    const source = entryByKey.get(entry.reuseCandidatesFrom);
    return { ...entry, candidates: source ? source.candidates : [] };
  }
  return entry;
}

function buildErrorLogEntries({ entry, rankingMethod, candidateCount, officeName }) {
  const log = [];
  if (candidateCount === 0) {
    log.push({
      testCase: "TC-3",
      level: "info",
      message: `No office address found for "${officeName}" — showing the empty state with a manual-entry option, never a dead end.`,
    });
  }
  if (rankingMethod === "fallback_relevance" && candidateCount > 0) {
    log.push({
      testCase: "TC-17/TC-19",
      level: "warn",
      message: "Current-address geocode unavailable — preserved Google's own relevance order instead of faking a distance sort.",
    });
  }
  if (entry?.testCase === "TC-18" && candidateCount > 1) {
    log.push({
      testCase: "TC-18",
      level: "info",
      message: "Two or more candidates are equidistant — stable sort kept their original relative order as the tie-break.",
    });
  }
  return log;
}

/**
 * officeName: typed query string.
 * currentLocation: {latitude, longitude} | null | undefined — omitted entirely
 *   means "use the harness's default reference point", NOT "unavailable".
 * scenarioKey: optional fixture entry key — bypasses fuzzy match entirely
 *   (Dev Mode's named-scenario picker).
 * simulateGeocodeUnavailable: explicit flag to force TC-17/19 behavior on any
 *   query/scenario, independent of whatever currentLocation was supplied.
 */
export function runMockSearch({
  officeName,
  currentLocation,
  scenarioKey,
  simulateGeocodeUnavailable = false,
}) {
  const startedAt = Date.now();
  const errorLog = [];

  let entry = null;
  let matchScore = null;

  if (scenarioKey) {
    entry = resolveEntry(scenarioKey);
    if (!entry) {
      errorLog.push({
        testCase: null,
        level: "error",
        message: `Unknown scenario key "${scenarioKey}" — falling back to a normal search.`,
      });
    }
  }

  if (!entry) {
    const pool = fixtures.entries
      .filter((e) => !e.reuseCandidatesFrom) // alias-only scenarios (e.g. tc17) aren't reachable by free-typing
      .map((e) => ({ names: e.names, ref: e }));
    const best = findBestMatch(officeName, pool);
    if (best && best.score >= CONFIG.FUZZY_MATCH_THRESHOLD) {
      entry = best.entry.ref;
      matchScore = best.score;
    }
  }

  const rawCandidates = entry ? entry.candidates : [];

  const effectiveCurrentLocation =
    entry?.forceCurrentLocationUnavailable || simulateGeocodeUnavailable
      ? null
      : currentLocation || CONFIG.DEFAULT_CURRENT_LOCATION;

  const { candidates: ranked, rankingMethod } = sortOfficeCandidates(
    effectiveCurrentLocation,
    rawCandidates
  );

  errorLog.push(
    ...buildErrorLogEntries({
      entry,
      rankingMethod,
      candidateCount: ranked.length,
      officeName,
    })
  );

  const results = ranked.map((candidate) => {
    const formatted = formatAddress(candidate.addressComponents, {
      maxFieldLength: CONFIG.MAX_FIELD_LENGTH,
      maxAreaLocalityLength: CONFIG.MAX_AREA_LOCALITY_LENGTH,
    });

    const filtersApplied = [...formatted.filtersApplied];

    if (formatted.requiresManualEntry) {
      errorLog.push({
        testCase: "TC-4",
        level: "warn",
        message: `"${candidate.name}" could not be made compliant even after every fallback — routed to manual entry, same as TC-3.`,
      });
    }
    if (filtersApplied.includes("Flag:DefaultNumberInserted")) {
      errorLog.push({
        testCase: "TC-11",
        level: "info",
        message: `"${candidate.name}" had no numeric component anywhere — defaulted "1, " onto Office Floor/Tower.`,
      });
    }
    if (formatted.sparseData) {
      errorLog.push({
        testCase: null,
        level: "warn",
        message: `"${candidate.name}" is missing 50%+ of its core address components — the full raw location was placed in Area/Locality and Office Floor/Tower + Office Block/Building Name were left blank for manual entry.`,
      });
    }
    if (candidate.coworkingAmbiguous) {
      filtersApplied.push("Flag:CoworkingSharedBuildingUnconfirmed");
      errorLog.push({
        testCase: "TC-8",
        level: "info",
        message: `"${candidate.name}" is in a shared co-working building — floor/unit isn't treated as ground truth without a confirm step.`,
      });
    }

    const confidence = formatted.requiresManualEntry
      ? NOT_APPLICABLE_CONFIDENCE
      : computeConfidence({
          query: officeName,
          name: candidate.name,
          rawComponents: candidate.addressComponents,
          filtersApplied,
          rankingMethod,
          totalCandidateCount: ranked.length,
        });

    return {
      place_id: candidate.place_id,
      name: candidate.name,
      location: candidate.location,
      distance_km: candidate.distance_km,
      rawFormattedAddress: candidate.formattedAddress,
      officeFloorTower: formatted.officeFloorTower,
      officeBlockBuilding: formatted.officeBlockBuilding,
      areaLocality: formatted.areaLocality,
      cityDistrict: formatted.cityDistrict,
      state: formatted.state,
      pincode: formatted.pincode,
      compliant: formatted.compliant,
      requiresManualEntry: formatted.requiresManualEntry,
      sparseData: Boolean(formatted.sparseData),
      FiltersApplied: filtersApplied,
      confidence,
      coworkingAmbiguous: Boolean(candidate.coworkingAmbiguous),
    };
  });

  return {
    source: "mock",
    query: {
      officeName,
      currentLocation: currentLocation ?? null,
      scenarioKey: scenarioKey ?? null,
      simulateGeocodeUnavailable: Boolean(simulateGeocodeUnavailable),
    },
    matchedEntryKey: entry?.key ?? null,
    matchScore,
    pipelineImplementation: PIPELINE_PROVENANCE.implementation,
    pipelineNote: PIPELINE_PROVENANCE.note,
    ranking_method: rankingMethod,
    results,
    errorLog,
    rawResponse: { places: rawCandidates },
    timing: { startedAt, durationMs: Date.now() - startedAt },
  };
}

// buildLiveStubResponse (the "no key configured" case) and runLiveSearch
// (the real Google Places branch) now live in ./liveSearch.js.

export { nameMatchScore };
