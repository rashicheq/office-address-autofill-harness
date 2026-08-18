#!/usr/bin/env node
"use strict";

/**
 * Bulk office address lookup against Google Places API (New) — Text Search.
 *
 * What this does: reads a list of office names (one per line, see
 * office-names.example.txt), looks each one up on Google Places, and writes
 * one JSON object per office to results.json — the full raw Google response
 * plus a clean set of extracted fields (locality, sub-locality, route,
 * premise, pincode, state, city, district).
 *
 * Setup (see the walkthrough for the full version):
 *   1. Google Cloud Console (console.cloud.google.com) -> a project with
 *      "Places API (New)" enabled and billing attached -> create an API key.
 *   2. Copy .env.example to .env in this folder, paste the key in.
 *   3. Put your 100 office names in office-names.txt (one per line).
 *   4. From this folder: node searchOffices.js
 *
 * No npm install needed - Node 18+ has fetch built in, and the .env reader
 * below is a few lines rather than a dependency.
 */

const fs = require("fs");
const path = require("path");

const SCRIPT_DIR = __dirname;
const DEFAULT_INPUT_FILE = path.join(SCRIPT_DIR, "office-names.txt");
const DEFAULT_OUTPUT_FILE = path.join(SCRIPT_DIR, "results.json");

// Same gap the rest of this project's batch runner uses (backend/src/routes/
// search.js) - comfortably under Places API rate limits without making a
// 100-name run take forever.
const REQUEST_DELAY_MS = 200;
const RETRY_DELAY_MS = 1000;
const MIN_QUERY_LENGTH = 1;

/* ============================= .env loading (no dependency) ============================= */
function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv(path.join(SCRIPT_DIR, ".env"));

/* ============================= Google Places API (New) ============================= */
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// Same field mask as this repo's own backend/src/lib/livePlacesClient.js -
// enough to fill every field below without paying for fields nothing uses
// (Places API bills by field mask breadth).
const FIELD_MASK =
  "places.id,places.displayName,places.addressComponents,places.formattedAddress,places.location";

// "Establishment: Office" (checked, not guessed): Google's Places API (New)
// type taxonomy has no verified, documented generic "office" or
// "corporate_office" enum value usable as includedType - confirmed against
// an actively-maintained community mirror of Google's place-types list
// (github.com/brycekbargar/google-place-types) since developers.google.com
// itself isn't reachable from this environment. Guessing a type string here
// risks a hard 400 on every single one of your 100 calls, so this biases
// toward office establishments the same safe way the rest of this repo
// already does: appending "office" to the query text (only when the name
// doesn't already say it), not a type filter. If Google later ships a real
// office type, swap it in here as `includedType` in buildRequestBody below.
const OFFICE_INTENT_KEYWORD = /\boffice\b/i;
function buildOfficeIntentQuery(officeName) {
  const trimmed = (officeName || "").trim();
  if (!trimmed || OFFICE_INTENT_KEYWORD.test(trimmed)) return trimmed;
  return `${trimmed} office`;
}

// "Search area: India".
const REGION_CODE = "IN";

function buildRequestBody(textQuery) {
  return { textQuery, regionCode: REGION_CODE };
}

async function callPlacesApi(textQuery, apiKey, attempt = 1) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(buildRequestBody(textQuery)),
  });

  if (!response.ok) {
    // One retry for transient rate-limit/server errors only - a 4xx other
    // than 429 (bad key, bad request) won't succeed on retry, so don't waste
    // the call.
    if ((response.status === 429 || response.status >= 500) && attempt === 1) {
      await sleep(RETRY_DELAY_MS);
      return callPlacesApi(textQuery, apiKey, 2);
    }
    const errorText = await response.text();
    const err = new Error(`Places API error (${response.status}): ${errorText}`);
    err.status = response.status;
    throw err;
  }

  const body = await response.json();
  return body.places || [];
}

/* ============================= Field extraction ============================= */
// Google can attach more than one type to a component (e.g. ["locality",
// "political"]) and, separately, can return more than one component that
// matches a given field at different granularities (sublocality_level_1 vs
// the plain, untiered sublocality) - so this scans every component once,
// keeps the first text seen per raw Google type, then resolves each of our
// named fields through its own fallback chain of acceptable Google types.
const FIELD_TYPE_FALLBACKS = {
  // Google's own "locality" type IS what's normally meant by "city" - you
  // asked for both "locality" and "city" as separate fields, so both are
  // filled from the same Google component. Flagging this rather than
  // guessing you wanted something else: if you actually wanted "locality"
  // to mean the sub-locality/area instead, swap its fallback chain below to
  // match "sublocality"'s.
  locality: ["locality"],
  city: ["locality"],
  sublocality: ["sublocality_level_1", "sublocality", "sublocality_level_2", "sublocality_level_3"],
  route: ["route"],
  premise: ["premise"],
  pincode: ["postal_code"],
  state: ["administrative_area_level_1"],
  // Google frequently leaves this blank for well-known metro cities (it
  // isn't always populated the way a district-level government form would
  // expect) - a null here means Google genuinely didn't return one, not a
  // bug in this script.
  district: ["administrative_area_level_2"],
};

function extractFields(addressComponents) {
  const textByType = {};
  for (const c of addressComponents || []) {
    const text = c.longText || c.shortText || "";
    if (!text) continue;
    for (const t of c.types || []) {
      if (!(t in textByType)) textByType[t] = text;
    }
  }
  const fields = {};
  for (const [outKey, googleTypes] of Object.entries(FIELD_TYPE_FALLBACKS)) {
    fields[outKey] = googleTypes.map((t) => textByType[t]).find(Boolean) || null;
  }
  return fields;
}

function normalizePlace(place) {
  return {
    placeId: place.id || null,
    name: (place.displayName && place.displayName.text) || null,
    formattedAddress: place.formattedAddress || null,
    location: place.location
      ? { lat: place.location.latitude, lng: place.location.longitude }
      : null,
    fields: extractFields(place.addressComponents),
    // Entire raw Google address component list, untouched - everything the
    // extracted fields above came from, in case you need something this
    // script didn't think to name.
    addressComponents: place.addressComponents || [],
  };
}

/* ============================= Batch runner ============================= */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readOfficeNames(inputFile) {
  const text = fs.readFileSync(inputFile, "utf8");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length >= MIN_QUERY_LENGTH && !line.startsWith("#"));
}

function writeResults(outputFile, results) {
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
}

async function main() {
  const inputFile = path.resolve(process.argv[2] || DEFAULT_INPUT_FILE);
  const outputFile = path.resolve(process.argv[3] || DEFAULT_OUTPUT_FILE);

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error(
      "GOOGLE_PLACES_API_KEY isn't set. Copy .env.example to .env in this folder and paste your key in, then run this again."
    );
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`Can't find ${inputFile}. Copy office-names.example.txt to office-names.txt and fill in your list, or pass a path: node searchOffices.js <file>`);
    process.exitCode = 1;
    return;
  }

  const officeNames = readOfficeNames(inputFile);
  if (officeNames.length === 0) {
    console.error(`${inputFile} has no office names in it (one per line).`);
    process.exitCode = 1;
    return;
  }

  console.log(`Looking up ${officeNames.length} office name(s) from ${inputFile}...`);
  console.log(`Writing results to ${outputFile} as each one completes.\n`);

  const results = [];
  let okCount = 0;
  let noMatchCount = 0;
  let errorCount = 0;

  for (let i = 0; i < officeNames.length; i++) {
    const officeName = officeNames[i];
    const queryText = buildOfficeIntentQuery(officeName);
    const progress = `[${i + 1}/${officeNames.length}]`;

    try {
      const rawPlaces = await callPlacesApi(queryText, apiKey);
      const normalized = rawPlaces.map(normalizePlace);

      if (normalized.length === 0) {
        noMatchCount++;
        console.log(`${progress} ${officeName} -> no match`);
        results.push({
          officeName,
          queryText,
          status: "no_match",
          error: null,
          matchCount: 0,
          topResult: null,
          allResults: [],
          rawResponse: { places: [] },
        });
      } else {
        okCount++;
        console.log(`${progress} ${officeName} -> ${normalized.length} result(s), top: ${normalized[0].formattedAddress || normalized[0].name}`);
        results.push({
          officeName,
          queryText,
          status: "ok",
          error: null,
          matchCount: normalized.length,
          topResult: normalized[0],
          allResults: normalized,
          rawResponse: { places: rawPlaces },
        });
      }
    } catch (err) {
      errorCount++;
      console.log(`${progress} ${officeName} -> ERROR: ${err.message}`);
      results.push({
        officeName,
        queryText,
        status: "error",
        error: err.message,
        matchCount: 0,
        topResult: null,
        allResults: [],
        rawResponse: null,
      });
    }

    // Save after every office, not just at the end - a 100-call run that
    // gets interrupted partway through shouldn't lose everything already done.
    writeResults(outputFile, results);

    if (i < officeNames.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  console.log(`\nDone: ${okCount} matched, ${noMatchCount} no match, ${errorCount} errored. Full results in ${outputFile}.`);
}

main();
