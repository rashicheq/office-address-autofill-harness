import { test } from "node:test";
import assert from "node:assert/strict";
import { listSuggestions } from "../src/lib/mockSearch.js";

test("listSuggestions matches a real company name (kind: office)", () => {
  const results = listSuggestions("che");
  assert.equal(results.length, 1);
  assert.equal(results[0].key, "cheq");
  assert.equal(results[0].label, "CheQ Digital Private Limited");
  assert.equal(results[0].kind, "office");
});

test("listSuggestions matches an area entry (kind: area)", () => {
  const results = listSuggestions("koramangala");
  assert.equal(results.length, 1);
  assert.equal(results[0].kind, "area");
});

test("listSuggestions expands a multi-branch company into one row per branch, closest first (TC-1)", () => {
  const results = listSuggestions("vantage");
  assert.equal(results.length, 4);
  for (const r of results) {
    assert.equal(r.key, "tc1-vantage-multi-branch");
    assert.equal(r.kind, "office");
    assert.ok(r.placeId, "each branch row carries its own placeId");
    // Real branch name, not the Dev-Mode-oriented internal label.
    assert.match(r.label, /^Vantage Corp \(.+ Branch\)$/);
  }
  const placeIds = results.map((r) => r.placeId);
  assert.equal(new Set(placeIds).size, 4, "every branch row has a distinct placeId");
  assert.equal(results[0].closest, true);
  assert.equal(results[0].placeId, "MOCK-vantage-koramangala");
  assert.ok(results.slice(1).every((r) => !r.closest));
});

test("listSuggestions excludes internal edge-case scenarios not flagged userFacing", () => {
  const results = listSuggestions("Zylotrex"); // TC-3 no-match scenario's query text
  assert.equal(results.length, 0);
});

test("listSuggestions returns nothing for an empty query", () => {
  assert.deepEqual(listSuggestions(""), []);
  assert.deepEqual(listSuggestions("   "), []);
});

test("listSuggestions returns nothing when nothing matches", () => {
  assert.deepEqual(listSuggestions("Zzzznonexistent"), []);
});
