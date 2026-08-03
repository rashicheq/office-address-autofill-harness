import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAddress } from "../src/lib/formattingPipeline.js";

test("fits everything with zero drops when a numeric anchor is already present", () => {
  const result = formatAddress([
    { type: "route", text: "Church Street" },
    { type: "street_number", text: "25" },
    { type: "premise", text: "Regal Plaza" },
  ]);
  assert.equal(result.compliant, true);
  assert.equal(result.requiresManualEntry, false);
  assert.equal(result.sparseData, false);
  assert.equal(result.officeBlockBuilding, "25, Regal Plaza");
  assert.ok(!result.filtersApplied.includes("Flag:DefaultNumberInserted"));
});

test("Office Block/Building combines street_number and premise, building first", () => {
  const result = formatAddress([
    { type: "subpremise", text: "1st Floor" },
    { type: "premise", text: "AKR Tech Park" },
    { type: "street_number", text: "7" },
    { type: "route", text: "Kundalahalli Road" },
  ]);
  assert.equal(result.officeFloorTower, "1st Flr");
  assert.equal(result.officeBlockBuilding, "7, AKR Tech Park");
  assert.equal(result.areaLocality, "Kundalahalli Rd");
});

test("TC-11: defaults a fake '1' onto Office Floor/Tower and flags it when no digit exists anywhere", () => {
  const result = formatAddress([
    { type: "premise", text: "Silver Oak Business Centre" },
    { type: "route", text: "Assaye Road" },
    { type: "sublocality_level_1", text: "Frazer Town" },
  ]);
  assert.equal(result.compliant, true);
  assert.ok(result.filtersApplied.includes("Flag:DefaultNumberInserted"));
  assert.equal(result.officeFloorTower, "1");
  assert.equal(result.officeBlockBuilding, "Silver Oak Business Centre");
});

test("TC-4: routes to manual entry when premise can't be shortened without a mid-word cut", () => {
  const result = formatAddress([
    { type: "subpremise", text: "2nd Floor" },
    { type: "premise", text: "Shrivenkateshwaraprecisiontechnoparkinfratechcomplexextended" },
    { type: "street_number", text: "5" },
    { type: "route", text: "Kadubeesanahalli Main Road" },
    { type: "sublocality_level_1", text: "Kadubeesanahalli" },
  ]);
  assert.equal(result.compliant, false);
  assert.equal(result.requiresManualEntry, true);
  assert.equal(result.officeFloorTower, null);
  assert.equal(result.officeBlockBuilding, null);
  assert.equal(result.areaLocality, null);
});

test("never drops the join between street_number and premise at their own comma (regression)", () => {
  // A premise long enough to need shortening, but well within reach via its
  // OWN internal punctuation — must not get truncated down to just the
  // street_number by treating the street_number/premise join-comma as a
  // shortening point.
  const result = formatAddress([
    { type: "street_number", text: "5" },
    { type: "premise", text: "Innovation Hub, Block C, Phase 2, Extended Wing of the Tech Campus" },
    { type: "route", text: "Outer Ring Road" },
  ]);
  assert.equal(result.compliant, true);
  assert.equal(result.sparseData, false);
  assert.ok(result.officeBlockBuilding.startsWith("5, "));
  assert.ok(result.officeBlockBuilding.length > 3, "must not collapse to just the street number");
});

test("prefers dropping lower-tier area components over ever touching route", () => {
  const result = formatAddress([
    { type: "subpremise", text: "1st Floor" },
    { type: "premise", text: "Greenfield Towers" },
    { type: "street_number", text: "10" },
    { type: "route", text: "MG Road" },
    { type: "sublocality_level_1", text: "Extremely Long Neighborhood Name Written Out In Full Here Indeed, Spanning Well Past The Limit" },
  ]);
  assert.equal(result.compliant, true);
  assert.ok(result.filtersApplied.includes("Dropped:sublocality_level_1"));
  assert.ok(!result.filtersApplied.some((f) => f.startsWith("Dropped:route")));
  assert.ok(result.areaLocality.includes("MG Rd"));
});

test("Plus Code is excluded from the line-eligible pool entirely (TC-15)", () => {
  const result = formatAddress([
    { type: "plus_code", text: "7J4M+9F" },
    { type: "sublocality_level_1", text: "Pallod Farms" },
  ]);
  // Only a sublocality name and an unusable Plus Code -> this is exactly the
  // sparse-data case now (5 of 6 core types missing), not just a missing-digit
  // default; either way the Plus Code text itself must never leak anywhere.
  assert.equal(result.sparseData, true);
  assert.ok(!result.areaLocality.includes("7J4M"));
  assert.ok(!result.officeFloorTower?.includes("7J4M"));
  assert.ok(!result.officeBlockBuilding?.includes("7J4M"));
});

test("extracts cityDistrict/state/pincode independently of the other fields", () => {
  const result = formatAddress([
    { type: "street_number", text: "7" },
    { type: "route", text: "Kundalahalli Road" },
    { type: "locality", text: "Bengaluru" },
    { type: "administrative_area_level_1", text: "Karnataka" },
    { type: "postal_code", text: "560048" },
  ]);
  assert.equal(result.cityDistrict, "Bengaluru");
  assert.equal(result.state, "Karnataka");
  assert.equal(result.pincode, "560048");
});

test("cityDistrict/state/pincode are still returned when the address routes to manual entry (TC-4)", () => {
  const result = formatAddress([
    { type: "subpremise", text: "2nd Floor" },
    { type: "premise", text: "Shrivenkateshwaraprecisiontechnoparkinfratechcomplexextended" },
    { type: "street_number", text: "5" },
    { type: "route", text: "Kadubeesanahalli Main Road" },
    { type: "sublocality_level_1", text: "Kadubeesanahalli" },
    { type: "locality", text: "Bengaluru" },
  ]);
  assert.equal(result.requiresManualEntry, true);
  assert.equal(result.cityDistrict, "Bengaluru");
});

test("cityDistrict/state/pincode default to empty strings when the source has none", () => {
  const result = formatAddress([{ type: "route", text: "Church Street" }, { type: "street_number", text: "25" }]);
  assert.equal(result.cityDistrict, "");
  assert.equal(result.state, "");
  assert.equal(result.pincode, "");
});

test("Major callout: 50%+ of core components missing dumps the raw location into Area/Locality", () => {
  const result = formatAddress([
    { type: "sublocality_level_1", text: "Whitefield" },
    { type: "locality", text: "Bengaluru" },
    { type: "administrative_area_level_1", text: "Karnataka" },
    { type: "postal_code", text: "560066" },
  ]);
  assert.equal(result.sparseData, true);
  assert.equal(result.officeFloorTower, "");
  assert.equal(result.officeBlockBuilding, "");
  assert.ok(result.areaLocality.includes("Whitefield"));
  assert.ok(result.filtersApplied.includes("Flag:SparseDataManualEntryRequired"));
  assert.equal(result.compliant, true);
  assert.equal(result.requiresManualEntry, false);
});

test("exactly half of core components missing does NOT trigger the sparse-data rule (stays TC-11-style)", () => {
  // 3 of 6 core types present (premise, route, sublocality_level_1) - exactly
  // half missing, deliberately under the sparse-data threshold.
  const result = formatAddress([
    { type: "premise", text: "Silver Oak Business Centre" },
    { type: "route", text: "Assaye Road" },
    { type: "sublocality_level_1", text: "Frazer Town" },
  ]);
  assert.equal(result.sparseData, false);
});
