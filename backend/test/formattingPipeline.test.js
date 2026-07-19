import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAddress } from "../src/lib/formattingPipeline.js";

test("fits everything with zero drops when short enough and Line 1 already ends in a digit", () => {
  const result = formatAddress([
    { type: "route", text: "Church Street" },
    { type: "street_number", text: "25" },
  ]);
  assert.equal(result.compliant, true);
  assert.equal(result.requiresManualEntry, false);
  assert.ok(result.lines[0].endsWith("25"));
  assert.ok(!result.filtersApplied.includes("Flag:DefaultNumberInserted"));
});

test("TC-11: defaults a fake '1' and flags it when no digit exists anywhere", () => {
  const result = formatAddress([
    { type: "premise", text: "Silver Oak Business Centre" },
    { type: "route", text: "Assaye Road" },
    { type: "sublocality_level_1", text: "Frazer Town" },
  ]);
  assert.equal(result.compliant, true);
  assert.ok(result.filtersApplied.includes("Flag:DefaultNumberInserted"));
  assert.match(result.lines[0], /^1, /);
});

test("TC-4: routes to manual entry when a critical component can't be shortened without a mid-word cut", () => {
  const result = formatAddress([
    { type: "subpremise", text: "2nd Floor" },
    { type: "premise", text: "Shrivenkateshwaraprecisiontechnopark" },
    { type: "street_number", text: "5" },
    { type: "route", text: "Kadubeesanahalli Main Road" },
    { type: "sublocality_level_1", text: "Kadubeesanahalli" },
  ]);
  assert.equal(result.compliant, false);
  assert.equal(result.requiresManualEntry, true);
  assert.equal(result.lines, null);
});

test("prefers dropping lower-tier components over ever touching route", () => {
  const result = formatAddress([
    { type: "subpremise", text: "1st Floor" },
    { type: "premise", text: "Greenfield Towers" },
    { type: "street_number", text: "10" },
    { type: "route", text: "MG Road" },
    { type: "sublocality_level_1", text: "Extremely Long Neighborhood Name Here Indeed" },
  ]);
  assert.equal(result.compliant, true);
  assert.ok(result.filtersApplied.includes("Dropped:sublocality_level_1"));
  assert.ok(!result.filtersApplied.some((f) => f.startsWith("Dropped:route")));
  assert.ok(result.lines.some((line) => line.includes("MG Rd")));
});

test("Plus Code is excluded from the line-eligible pool entirely (TC-15)", () => {
  const result = formatAddress([
    { type: "plus_code", text: "7J4M+9F" },
    { type: "sublocality_level_1", text: "Pallod Farms" },
  ]);
  // No street_number/subpremise/premise -> falls through to the TC-11 default-1 path.
  assert.ok(result.filtersApplied.includes("Flag:DefaultNumberInserted"));
  assert.ok(!result.lines.some((line) => line.includes("7J4M")));
});
