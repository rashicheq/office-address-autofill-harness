#!/usr/bin/env node
"use strict";

/**
 * Runs "the rules script" (addressLineRules.js) against a list of office
 * addresses you ALREADY have as plain strings - no Google Places call, no
 * API key, no billing. Use this instead of searchOffices.js when you're
 * testing the rules script itself against a known sample of real addresses,
 * rather than looking addresses up fresh.
 *
 * Input: a CSV with two columns, officeName and officeAddress (header row
 * required) - see evaluated-addresses.example.csv. If your data is in
 * Excel, save it as CSV first (File -> Save As -> CSV) with those exact
 * column headers.
 *
 * Unlike searchOffices.js, there are no Google-typed addressComponents here
 * to read City/State/Pincode from - just one raw string per office. This
 * script extracts them itself first (see extractCityStatePincode below),
 * then feeds the result into the same rules script, same as always.
 *
 * Run: node evaluateAddressList.js [input.csv] [output.csv]
 * Defaults: evaluated-addresses.csv -> evaluation-results.csv
 */

const fs = require("fs");
const path = require("path");
const { buildAddressLines } = require("./addressLineRules.js");

const SCRIPT_DIR = __dirname;
const DEFAULT_INPUT_FILE = path.join(SCRIPT_DIR, "evaluated-addresses.csv");
const DEFAULT_OUTPUT_FILE = path.join(SCRIPT_DIR, "evaluation-results.csv");

/* ============================= Minimal CSV parsing/writing (no dependency) ============================= */
// Handles quoted fields with embedded commas/newlines - enough for a plain
// two-column office-name/address export, not a general CSV parser.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); field = "";
      rows.push(row); row = [];
    } else if (c === "\r") {
      // skip - \r\n handled via the \n branch
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/* ============================= City/State/Pincode extraction from a raw string ============================= */
// searchOffices.js gets these from Google's own typed addressComponents;
// there's no such breakdown here, just one string per office, so this
// derives them from the tail of the address instead. Indian addresses
// reliably end "..., City, State Pincode" (fused) or "..., City, State,
// Pincode" (separate segments - seen for Delhi/Chandigarh in a real
// 309-address sample: state and pincode land in their own segments, with
// no distinct city name after "New Delhi"/"Chandigarh" - there isn't
// always a cleaner answer to fall back to for those).
const PINCODE_FUSED = /^(.*\S)\s+(\d{6})$/;
const PINCODE_BARE = /^\d{6}$/;

// Plus Codes ("CW45+W8V") sometimes stand in for a real locality name when
// Google/the source data has nothing better - never treat one as "the
// city" (it would then get wrongly stripped out of the address lines as a
// "duplicate" by rule 1, erasing the one specific detail that address had).
const PLUS_CODE_PATTERN = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}$/i;

function extractCityStatePincode(formattedAddress) {
  let segments = (formattedAddress || "").split(",").map((s) => s.trim()).filter(Boolean);
  // Some sources (e.g. Google's own formattedAddress) append a trailing
  // country segment after state+pincode; the 309-address sample this was
  // built against never does, but drop it first if present so it doesn't
  // get mistaken for the state.
  if (segments.length > 1 && /^india$/i.test(segments[segments.length - 1])) {
    segments = segments.slice(0, -1);
  }
  if (segments.length === 0) return { city: "", state: "", pincode: "", pincodeSource: "none" };

  const last = segments[segments.length - 1];
  let state = "", pincode = "", cityIndex = -1, pincodeSource = "none";

  const fused = PINCODE_FUSED.exec(last);
  if (fused) {
    state = fused[1];
    pincode = fused[2];
    cityIndex = segments.length - 2;
    pincodeSource = "fused";
  } else if (PINCODE_BARE.test(last)) {
    pincode = last;
    state = segments[segments.length - 2] || "";
    cityIndex = segments.length - 3;
    pincodeSource = "separate";
  } else {
    // No 6-digit pincode found anywhere - best-effort guess, flagged via
    // pincodeSource so these rows are easy to filter and check by hand.
    state = last;
    cityIndex = segments.length - 2;
    pincodeSource = "none";
  }

  let city = cityIndex >= 0 ? segments[cityIndex] : "";
  let cityGuardApplied = false;
  if (city && PLUS_CODE_PATTERN.test(city)) {
    city = "";
    cityGuardApplied = true;
  }

  return { city, state, pincode, pincodeSource, cityGuardApplied };
}

/* ============================= Main ============================= */
function readInputRows(inputFile) {
  const text = fs.readFileSync(inputFile, "utf8");
  const rows = parseCsv(text);
  const header = rows[0].map((h) => h.trim());
  const nameIdx = header.indexOf("officeName");
  const addrIdx = header.indexOf("officeAddress");
  if (nameIdx === -1 || addrIdx === -1) {
    throw new Error(`${inputFile} needs "officeName" and "officeAddress" columns - found: ${header.join(", ")}`);
  }
  return rows.slice(1).map((r) => ({ officeName: r[nameIdx] || "", officeAddress: r[addrIdx] || "" }));
}

const OUTPUT_COLUMNS = [
  "officeName", "officeAddress",
  "extractedCity", "extractedState", "extractedPincode",
  "addressLine1", "addressLine2", "addressLine3", "hasNumberInLine1",
  "pincodeSource", "cityGuardApplied",
];

function main() {
  const inputFile = path.resolve(process.argv[2] || DEFAULT_INPUT_FILE);
  const outputFile = path.resolve(process.argv[3] || DEFAULT_OUTPUT_FILE);

  if (!fs.existsSync(inputFile)) {
    console.error(`Can't find ${inputFile}. Pass a path: node evaluateAddressList.js <input.csv> [output.csv]`);
    process.exitCode = 1;
    return;
  }

  const inputRows = readInputRows(inputFile);
  console.log(`Evaluating ${inputRows.length} address(es) from ${inputFile}...`);

  let noPincodeCount = 0;
  let noNumberCount = 0;

  const outRows = inputRows.map(({ officeName, officeAddress }) => {
    const known = extractCityStatePincode(officeAddress);
    const lines = buildAddressLines(officeAddress, known);
    if (known.pincodeSource === "none") noPincodeCount++;
    if (!lines.hasNumberInLine1) noNumberCount++;
    return {
      officeName,
      officeAddress,
      extractedCity: known.city,
      extractedState: known.state,
      extractedPincode: known.pincode,
      addressLine1: lines.addressLine1,
      addressLine2: lines.addressLine2,
      addressLine3: lines.addressLine3,
      hasNumberInLine1: lines.hasNumberInLine1,
      pincodeSource: known.pincodeSource,
      cityGuardApplied: known.cityGuardApplied || false,
    };
  });

  const csvLines = [OUTPUT_COLUMNS.join(","), ...outRows.map((row) => OUTPUT_COLUMNS.map((c) => csvEscape(row[c])).join(","))];
  fs.writeFileSync(outputFile, csvLines.join("\n") + "\n");

  console.log(`Done: ${outRows.length} rows written to ${outputFile}.`);
  console.log(`${noNumberCount} address(es) had no plot/building number found (rule 5 fired instead of rule 4).`);
  console.log(`${noPincodeCount} address(es) had no 6-digit pincode detected at all - worth a manual look.`);
}

main();
