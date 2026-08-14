import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGooglePlace, isLiveApiConfigured, buildOfficeIntentQuery } from "../src/lib/liveSearch.js";

test("buildOfficeIntentQuery appends 'office' to bias search intent (TC-6)", () => {
  assert.equal(buildOfficeIntentQuery("Vantage Corp"), "Vantage Corp office");
  assert.equal(buildOfficeIntentQuery("Koramangala"), "Koramangala office");
});

test("buildOfficeIntentQuery doesn't double up when 'office' is already present", () => {
  assert.equal(buildOfficeIntentQuery("Vantage Corporate Office"), "Vantage Corporate Office");
  assert.equal(buildOfficeIntentQuery("cheq office"), "cheq office");
});

test("buildOfficeIntentQuery handles empty input without crashing", () => {
  assert.equal(buildOfficeIntentQuery(""), "");
  assert.equal(buildOfficeIntentQuery("   "), "");
  assert.equal(buildOfficeIntentQuery(undefined), "");
});

test("normalizeGooglePlace maps a well-typed Google (New) place into the internal candidate shape", () => {
  const place = {
    id: "ChIJV49APAAVrjsRiDOTVDvc9pU",
    displayName: { text: "CheQ Digital Private Limited" },
    formattedAddress: "AKR Tech Park, 7, Kundalahalli Road, Bengaluru, Karnataka 560048, India",
    location: { latitude: 12.8919195, longitude: 77.6424073 },
    addressComponents: [
      { longText: "7", types: ["street_number"] },
      { longText: "Kundalahalli Road", types: ["route"] },
      { longText: "Bengaluru", types: ["locality", "political"] },
      { longText: "Karnataka", types: ["administrative_area_level_1", "political"] },
      { longText: "560048", types: ["postal_code"] },
      { longText: "7J4M+9F", types: ["plus_code"] },
    ],
  };

  const candidate = normalizeGooglePlace(place);
  assert.equal(candidate.place_id, "ChIJV49APAAVrjsRiDOTVDvc9pU");
  assert.equal(candidate.name, "CheQ Digital Private Limited");
  assert.deepEqual(candidate.location, { latitude: 12.8919195, longitude: 77.6424073 });
  assert.deepEqual(candidate.addressComponents, [
    { type: "street_number", text: "7" },
    { type: "route", text: "Kundalahalli Road" },
    { type: "locality", text: "Bengaluru" },
    { type: "administrative_area_level_1", text: "Karnataka" },
    { type: "postal_code", text: "560048" },
  ]);
  assert.equal(candidate.coworkingAmbiguous, false);
});

test("normalizeGooglePlace decomposes an untyped component into subpremise/premise/landmark", () => {
  const place = {
    id: "test-id",
    displayName: { text: "Vantage Corp" },
    formattedAddress: "6th Floor, Vantage Corp, No.100, near Metro Station, 100 Feet Road, India",
    location: { latitude: 1, longitude: 1 },
    addressComponents: [
      // No `types` at all — the messy real-data pattern this decomposition targets.
      { longText: "6th Floor, Vantage Corp, No.100, near Metro Station" },
      { longText: "100 Feet Road", types: ["route"] },
    ],
  };

  const candidate = normalizeGooglePlace(place);
  const byType = Object.fromEntries(candidate.addressComponents.map((c) => [c.type, c.text]));
  assert.equal(byType.landmark, "Metro Station");
  assert.ok(byType.subpremise.includes("6th Floor"));
  assert.ok(byType.subpremise.includes("No. 100"));
  assert.equal(byType.premise, "Vantage Corp");
  assert.equal(byType.route, "100 Feet Road");
});

test("normalizeGooglePlace flags a co-working/shared-workspace name via keyword heuristic (TC-8)", () => {
  const place = {
    id: "test-id-2",
    displayName: { text: "Some Startup" },
    formattedAddress: "BHIVE Workspace, 1st Floor, AKR Tech Park, India",
    location: { latitude: 1, longitude: 1 },
    addressComponents: [
      { longText: "BHIVE Workspace, 1st Floor", types: ["subpremise"] },
      { longText: "AKR Tech Park", types: ["premise"] },
    ],
  };
  const candidate = normalizeGooglePlace(place);
  assert.equal(candidate.coworkingAmbiguous, true);
});

test("isLiveApiConfigured reflects GOOGLE_PLACES_API_KEY presence", () => {
  const original = process.env.GOOGLE_PLACES_API_KEY;
  try {
    delete process.env.GOOGLE_PLACES_API_KEY;
    assert.equal(isLiveApiConfigured(), false);
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    assert.equal(isLiveApiConfigured(), true);
  } finally {
    if (original === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = original;
  }
});
