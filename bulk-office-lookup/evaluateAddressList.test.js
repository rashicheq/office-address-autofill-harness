"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");

// extractCityStatePincode isn't exported (evaluateAddressList.js is a CLI
// script, not a library) - exercised through the real code path instead:
// run the whole script as a subprocess against fixed input, then check the
// CSV it actually writes. Duplicating the regexes here to unit-test them
// directly would just drift from the real implementation over time.
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const SCRIPT_PATH = path.join(__dirname, "evaluateAddressList.js");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eval-addr-test-"));
const inputFile = path.join(tmpDir, "in.csv");
const outputFile = path.join(tmpDir, "out.csv");

const rows = [
  ["officeName", "officeAddress"],
  // fused state+pincode (the common case)
  ["CheQ", "First Floor, 5, 17th Cross Rd, 7th Sector, HSR Layout, Bengaluru, Karnataka 560102"],
  // bare/separate pincode segment (Delhi-style, seen in real data)
  ["Delhi Co", "E 53, DSIIDC Industrial Area, Sector 4, Bawana, Delhi, 110039"],
  // trailing country segment after state+pincode
  ["Vantage", "2nd Floor, Vantage Corp, 14, 80 Feet Road, Koramangala, Bengaluru, Karnataka 560095, India"],
  // a lone Plus Code standing in for the city - must not get stripped as "the city"
  ["Sparse Co", "CW45+W8V, Gujarat 394110"],
];

fs.writeFileSync(inputFile, rows.map((r) => r.map((f) => (f.includes(",") ? `"${f}"` : f)).join(",")).join("\n") + "\n");

test("fused state+pincode: city/state/pincode extracted, plot number anchors Line 1", () => {
  execFileSync(process.execPath, [SCRIPT_PATH, inputFile, outputFile]);
  const csv = fs.readFileSync(outputFile, "utf8");
  assert.match(csv, /CheQ,.*,Bengaluru,Karnataka,560102,5,/);
});

test("separate pincode segment (Delhi-style) doesn't crash and still extracts a pincode", () => {
  const csv = fs.readFileSync(outputFile, "utf8");
  assert.match(csv, /Delhi Co,.*,Delhi,110039,/);
  assert.match(csv, /Delhi Co,.*,separate,/);
});

test("trailing country segment doesn't get mistaken for the state", () => {
  const csv = fs.readFileSync(outputFile, "utf8");
  assert.match(csv, /Vantage,.*,Bengaluru,Karnataka,560095,14,/);
});

test("a lone Plus Code is never treated as the city, nor as 'the number' anchoring Line 1", () => {
  const csv = fs.readFileSync(outputFile, "utf8");
  const line = csv.split("\n").find((l) => l.startsWith("Sparse Co"));
  assert.ok(line, "expected a row for Sparse Co");
  // extractedCity must be blank (the quoted officeAddress field contains its
  // own comma, so match on the field boundary rather than a naive split).
  assert.match(line, /^Sparse Co,"CW45\+W8V, Gujarat 394110",,Gujarat,394110,/);
  // the plus code must still survive somewhere in the address lines (rule 3: never drop) -
  // here it's the only element left, so rule 5's plain distribution puts it on Line 1,
  // but hasNumberInLine1 is correctly false since a plus code isn't a real building number.
  assert.match(line, /,CW45\+W8V,,,false,fused,true$/);
});
