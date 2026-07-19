import { test } from "node:test";
import assert from "node:assert/strict";
import { nameMatchScore, findBestMatch } from "../src/lib/fuzzyMatch.js";

test("exact match scores highest", () => {
  const score = nameMatchScore("CheQ Digital Private Limited", "CheQ Digital Private Limited");
  assert.ok(score > 0.95);
});

test("unrelated strings score low", () => {
  const score = nameMatchScore("CheQ", "Zylotrex Quantum Dynamics");
  assert.ok(score < 0.3);
});

test("findBestMatch picks the closest alias across multiple entries", () => {
  const pool = [
    { names: ["Fple Technology Pvt. Ltd.", "Fple"], ref: "fple" },
    { names: ["Scapia Technology Private Limited", "Scapia"], ref: "scapia" },
  ];
  const best = findBestMatch("scapia", pool);
  assert.equal(best.entry.ref, "scapia");
});
