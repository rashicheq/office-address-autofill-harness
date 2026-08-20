import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAddressLines } from "./addressLineConfig.js";

const CHEQ_COMPONENTS = [
  { type: "subpremise", text: "BHIVE Workspace, 1st Floor" },
  { type: "premise", text: "AKR Tech Park" },
  { type: "street_number", text: "7" },
  { type: "route", text: "Kundalahalli Road" },
  { type: "sublocality_level_1", text: "Mahadevapura" },
  { type: "locality", text: "Bengaluru" },
  { type: "administrative_area_level_1", text: "Karnataka" },
  { type: "postal_code", text: "560048" },
  { type: "country", text: "India" },
];
const CHEQ_FORMATTED =
  "BHIVE Workspace, 1st Floor, AKR Tech Park, 7, Kundalahalli Road, Mahadevapura, Bengaluru, Karnataka 560048, India";

test("strips City/State/Pincode duplicates out of the line elements (rule 1)", () => {
  const result = buildAddressLines(CHEQ_COMPONENTS, CHEQ_FORMATTED);
  const allLines = `${result.addressLine1} ${result.addressLine2} ${result.addressLine3}`;
  assert.doesNotMatch(allLines, /Bengaluru/);
  assert.doesNotMatch(allLines, /Karnataka/);
  assert.doesNotMatch(allLines, /560048/);
  assert.equal(result.cityDistrict, "Bengaluru");
  assert.equal(result.state, "Karnataka");
  assert.equal(result.pincode, "560048");
});

test("strips a fused state+pincode segment ('Karnataka 560048') even though it never exactly equals either alone", () => {
  const result = buildAddressLines(CHEQ_COMPONENTS, CHEQ_FORMATTED);
  const allLines = `${result.addressLine1}|${result.addressLine2}|${result.addressLine3}`;
  assert.doesNotMatch(allLines, /Karnataka 560048/);
});

test("never splits inside a comma-element (rule 2) - 'AKR Tech Park' stays whole", () => {
  const result = buildAddressLines(CHEQ_COMPONENTS, CHEQ_FORMATTED);
  const allLines = `${result.addressLine1}|${result.addressLine2}|${result.addressLine3}`;
  assert.match(allLines, /AKR Tech Park/);
  assert.doesNotMatch(allLines, /\bAKR\b(?!\sTech)/); // "AKR" never appears detached from "Tech Park"
});

test("prefers a real plot-number token ('7') over a merely digit-bearing descriptor ('1st Floor') for Line 1 (rule 4)", () => {
  const result = buildAddressLines(CHEQ_COMPONENTS, CHEQ_FORMATTED);
  assert.equal(result.addressLine1, "7");
  assert.equal(result.hasNumberInLine1, true);
  // Nothing dropped (rule 3): every non-duplicate element is present somewhere.
  const allLines = `${result.addressLine1} ${result.addressLine2} ${result.addressLine3}`;
  for (const expected of ["BHIVE Workspace", "1st Floor", "AKR Tech Park", "Kundalahalli Road", "Mahadevapura", "India"]) {
    assert.ok(allLines.includes(expected), `expected "${expected}" to survive somewhere in the output`);
  }
});

test("picks a bare number over a route name that happens to start with digits ('100' vs '100 Feet Road')", () => {
  const components = [
    { type: "subpremise", text: "6th Floor" },
    { type: "premise", text: "Vantage Corp" },
    { type: "street_number", text: "100" },
    { type: "route", text: "100 Feet Road" },
    { type: "sublocality_level_1", text: "Indiranagar" },
    { type: "locality", text: "Bengaluru" },
    { type: "administrative_area_level_1", text: "Karnataka" },
    { type: "postal_code", text: "560038" },
  ];
  const formatted = "6th Floor, Vantage Corp, 100, 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038, India";
  const result = buildAddressLines(components, formatted);
  assert.equal(result.addressLine1, "100");
  assert.match(result.addressLine2 + result.addressLine3, /100 Feet Road/);
});

test("falls back to any digit-bearing element when no bare plot-number token exists (rule 4 fallback)", () => {
  const components = [
    { type: "premise", text: "Silver Oak Business Centre" },
    { type: "locality", text: "Bengaluru" },
    { type: "administrative_area_level_1", text: "Karnataka" },
    { type: "postal_code", text: "560005" },
  ];
  const formatted = "Silver Oak Business Centre, Tower 3, Assaye Road, Frazer Town, Bengaluru, Karnataka 560005, India";
  const result = buildAddressLines(components, formatted);
  assert.equal(result.addressLine1, "Tower 3");
  assert.equal(result.hasNumberInLine1, true);
});

test("rule 5: no element has a digit anywhere -> sequential 3-way split, Line 1 still gets content", () => {
  const components = [
    { type: "premise", text: "Silver Oak Business Centre" },
    { type: "locality", text: "Bengaluru" },
    { type: "administrative_area_level_1", text: "Karnataka" },
    { type: "postal_code", text: "560005" },
  ];
  const formatted = "Silver Oak Business Centre, Assaye Road, Frazer Town, Bengaluru, Karnataka 560005, India";
  const result = buildAddressLines(components, formatted);
  assert.equal(result.hasNumberInLine1, false);
  assert.equal(result.addressLine1, "Silver Oak Business Centre, Assaye Road");
  assert.equal(result.addressLine2, "Frazer Town");
  assert.equal(result.addressLine3, "India");
});

test("sparse area-only pick: Line 1 still gets real content, never left empty just because there are fewer elements than lines", () => {
  const components = [
    { type: "sublocality_level_1", text: "Koramangala" },
    { type: "locality", text: "Bengaluru" },
    { type: "administrative_area_level_1", text: "Karnataka" },
    { type: "postal_code", text: "560034" },
  ];
  const formatted = "Koramangala, Bengaluru, Karnataka 560034, India";
  const result = buildAddressLines(components, formatted);
  assert.equal(result.addressLine1, "Koramangala");
  assert.equal(result.addressLine2, "India");
  assert.equal(result.addressLine3, "");
  assert.equal(result.hasNumberInLine1, false);
});

test("co-working subpremise with its own internal comma and digits ('BHIVE Workspace, 3rd Floor, Suite 12') still resolves to the real plot number", () => {
  const components = [
    { type: "subpremise", text: "BHIVE Workspace, 3rd Floor, Suite 12" },
    { type: "premise", text: "AKR Tech Park" },
    { type: "street_number", text: "7" },
    { type: "route", text: "Kundalahalli Road" },
    { type: "sublocality_level_1", text: "Mahadevapura" },
    { type: "locality", text: "Bengaluru" },
    { type: "administrative_area_level_1", text: "Karnataka" },
    { type: "postal_code", text: "560048" },
  ];
  const formatted =
    "BHIVE Workspace, 3rd Floor, Suite 12, AKR Tech Park, 7, Kundalahalli Road, Mahadevapura, Bengaluru, Karnataka 560048, India";
  const result = buildAddressLines(components, formatted);
  assert.equal(result.addressLine1, "7");
});

test("handles a missing/empty formattedAddress without throwing", () => {
  const result = buildAddressLines([{ type: "locality", text: "Bengaluru" }], "");
  assert.equal(result.addressLine1, "");
  assert.equal(result.addressLine2, "");
  assert.equal(result.addressLine3, "");
  assert.equal(result.hasNumberInLine1, false);
});
