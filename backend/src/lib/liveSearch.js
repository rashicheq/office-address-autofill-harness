// Live data source: Google Places Text Search (New) -> the SAME
// sortOfficeCandidates / formatAddress / computeConfidence used by
// runMockSearch (mockSearch.js). Deliberately not a parallel pipeline —
// CLAUDE.md 4.0: "the only change should be implementing the Live API
// branch of this same toggle... same function signature, same return shape."

import { searchPlacesText } from "./livePlacesClient.js";
import { sortOfficeCandidates } from "./ranker.js";
import { formatAddress, PIPELINE_PROVENANCE } from "./formattingPipeline.js";
import { computeConfidence, NOT_APPLICABLE_CONFIDENCE } from "./confidence.js";
import { CONFIG } from "../config.js";

export function isLiveApiConfigured() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

// Rough signal for TC-8 (co-working / shared-building ambiguity) on live
// data — mock fixtures set this by hand; live data has no such flag, so this
// is a keyword heuristic over the recovered premise/subpremise text. Expect
// to refine the keyword list once real responses are seen; false negatives
// (a shared building that doesn't say so in its name) are expected.
const COWORKING_KEYWORDS = /\b(co-?working|workspace|business center|business centre|shared office)\b/i;

function detectCoworkingAmbiguous(addressComponents) {
  return addressComponents.some(
    (c) => (c.type === "premise" || c.type === "subpremise") && COWORKING_KEYWORDS.test(c.text)
  );
}

/* ===================== Untyped-component decomposition ===================== */
/**
 * A Google addressComponent with NO `types` array at all is a real, recurring
 * pattern seen in prior real-data testing (see the reference
 * office-address-pipeline.js this was ported from) — usually the densest part
 * of the address (floor + building + door number, sometimes a landmark folded
 * in). Decomposing it recovers a subpremise/premise anchor that formatAddress
 * would otherwise silently ignore entirely (it only looks at recognized
 * `type`s). Tuned to the phrasing seen so far ("near X", "<n>th floor",
 * "no. <n>") — expect to expand as more real live-data examples come in.
 *
 * Any recovered landmark is emitted as a normal type:"landmark" component
 * (CLAUDE.md 3.1: Lower-tier, line-eligible/droppable) rather than pulled out
 * as a separate always-shown field, unlike the reference script's version.
 */
function splitUntypedComponent(rawText) {
  let remaining = rawText;
  const recovered = [];

  const landmarkMatch = remaining.match(/\bnear\b\s+(.+)$/i);
  if (landmarkMatch) {
    recovered.push({ type: "landmark", text: landmarkMatch[1].trim() });
    remaining = remaining.slice(0, landmarkMatch.index).trim().replace(/[,\-\s]+$/, "");
  }

  const subpremiseParts = [];
  const floorMatch = remaining.match(/(\d+\s*(?:st|nd|rd|th)?\s*floor)/i);
  if (floorMatch) {
    subpremiseParts.push(floorMatch[1].trim());
    remaining = (remaining.slice(0, floorMatch.index) + remaining.slice(floorMatch.index + floorMatch[0].length)).trim();
  }

  const doorMatch = remaining.match(/\bno\.?,?\s*(\d+)/i);
  if (doorMatch) {
    subpremiseParts.unshift(`No. ${doorMatch[1]}`);
    remaining = (remaining.slice(0, doorMatch.index) + remaining.slice(doorMatch.index + doorMatch[0].length)).trim();
  }
  if (subpremiseParts.length) {
    recovered.push({ type: "subpremise", text: subpremiseParts.join(", ") });
  }

  remaining = remaining.replace(/^[\s,\-]+|[\s,\-]+$/g, "").replace(/\s{2,}/g, " ");
  if (remaining) recovered.push({ type: "premise", text: remaining });

  return recovered;
}

// Priority order used to pick a single representative type for a Google
// component that carries more than one (e.g. ["sublocality_level_1",
// "political"]) — first recognized match wins.
const RECOGNIZED_TYPES_PRIORITY = [
  "subpremise",
  "premise",
  "street_number",
  "route",
  "sublocality_level_3",
  "sublocality_level_2",
  "sublocality_level_1",
  "neighborhood",
  "landmark",
  "locality",
  "administrative_area_level_2",
  "administrative_area_level_1",
  "postal_code",
  "country",
];

function pickType(types) {
  return RECOGNIZED_TYPES_PRIORITY.find((t) => types.includes(t)) || null;
}

/**
 * Converts one raw Google Places (New) place object into this repo's
 * internal candidate shape — the same shape fixtures.json's hand-authored
 * mock candidates already use, so it flows through sortOfficeCandidates /
 * formatAddress / computeConfidence unchanged.
 */
export function normalizeGooglePlace(place) {
  const rawComponents = place.addressComponents || [];
  const addressComponents = [];

  for (const c of rawComponents) {
    const text = c.longText || "";
    if (!text) continue;
    if (!c.types || c.types.length === 0) {
      addressComponents.push(...splitUntypedComponent(text));
      continue;
    }
    if (c.types.includes("plus_code")) continue; // TC-15/OQ-4 — never line-eligible
    const type = pickType(c.types);
    if (type) addressComponents.push({ type, text });
  }

  return {
    place_id: place.id || null,
    name: (place.displayName && place.displayName.text) || "Office",
    location: place.location
      ? { latitude: place.location.latitude, longitude: place.location.longitude }
      : null,
    formattedAddress: place.formattedAddress || "",
    addressComponents,
    coworkingAmbiguous: detectCoworkingAmbiguous(addressComponents),
  };
}

function buildErrorLogEntries({ rankingMethod, candidateCount }) {
  const log = [];
  if (candidateCount === 0) {
    log.push({
      testCase: "TC-3",
      level: "info",
      message: "No results from Google Places for this query — showing the empty state with a manual-entry option, never a dead end.",
    });
  }
  if (rankingMethod === "fallback_relevance" && candidateCount > 0) {
    log.push({
      testCase: "TC-17/TC-19",
      level: "warn",
      message: "Current-address geocode unavailable — preserved Google's own relevance order instead of faking a distance sort.",
    });
  }
  return log;
}

/**
 * officeName: typed query string, sent verbatim to Google as textQuery.
 * currentLocation: {latitude, longitude} | null | undefined — omitted means
 *   "use the harness's default reference point", NOT "unavailable".
 * simulateGeocodeUnavailable: forces TC-17/19 fallback behavior regardless
 *   of currentLocation, same semantics as the mock path.
 *
 * Never throws — a Places API failure (bad key, quota, network) is caught
 * and surfaced as a normal response with an errorLog entry, so Dev Mode can
 * still show the raw request/response instead of a generic fetch error that
 * would erase all of that (CLAUDE.md: failures must be diagnosable).
 */
export async function runLiveSearch({ officeName, currentLocation, simulateGeocodeUnavailable = false }) {
  const startedAt = Date.now();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  let rawPlaces;
  try {
    rawPlaces = await searchPlacesText(officeName, apiKey);
  } catch (err) {
    return {
      source: "live",
      query: { officeName, currentLocation: currentLocation ?? null, scenarioKey: null, simulateGeocodeUnavailable: Boolean(simulateGeocodeUnavailable) },
      matchedEntryKey: null,
      matchScore: null,
      pipelineImplementation: null,
      pipelineNote: null,
      ranking_method: null,
      results: [],
      errorLog: [{ testCase: null, level: "error", message: err.message }],
      rawResponse: null,
      timing: { startedAt, durationMs: Date.now() - startedAt },
    };
  }

  const candidates = rawPlaces.map(normalizeGooglePlace);

  const effectiveCurrentLocation = simulateGeocodeUnavailable
    ? null
    : currentLocation || CONFIG.DEFAULT_CURRENT_LOCATION;

  const { candidates: ranked, rankingMethod } = sortOfficeCandidates(effectiveCurrentLocation, candidates);

  const errorLog = buildErrorLogEntries({ rankingMethod, candidateCount: ranked.length });

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
        message: `"${candidate.name}" looks like a shared co-working building (name-keyword heuristic) — floor/unit isn't treated as ground truth without a confirm step.`,
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
      // Raw, untouched Google-typed components - User Mode's confirm screen
      // (2026-08 "frontend config" pivot) builds Address Line 2/3 from this
      // directly instead of the tier/drop/shorten fields below, which now
      // exist for Dev Mode's own diagnostic view only.
      addressComponents: candidate.addressComponents,
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
    source: "live",
    query: {
      officeName,
      currentLocation: currentLocation ?? null,
      scenarioKey: null,
      simulateGeocodeUnavailable: Boolean(simulateGeocodeUnavailable),
    },
    matchedEntryKey: null,
    matchScore: null,
    pipelineImplementation: PIPELINE_PROVENANCE.implementation,
    pipelineNote: PIPELINE_PROVENANCE.note,
    ranking_method: rankingMethod,
    results,
    errorLog,
    rawResponse: { places: rawPlaces },
    timing: { startedAt, durationMs: Date.now() - startedAt },
  };
}

// Kept for the "no key configured" case — same shape/spirit as before, just
// re-exported from here now so routes/search.js has one place to import the
// live-branch behavior from.
export function buildLiveStubResponse({ officeName, currentLocation }) {
  const startedAt = Date.now();
  const message =
    "Requires Google API key setup — GOOGLE_PLACES_API_KEY isn't set in backend/.env. See backend/.env.example.";
  return {
    source: "live",
    query: { officeName, currentLocation: currentLocation ?? null, scenarioKey: null },
    matchedEntryKey: null,
    matchScore: null,
    pipelineImplementation: null,
    pipelineNote: null,
    ranking_method: null,
    results: [],
    errorLog: [{ testCase: null, level: "error", message }],
    rawResponse: null,
    notIntegrated: true,
    message,
    timing: { startedAt, durationMs: Date.now() - startedAt },
  };
}
