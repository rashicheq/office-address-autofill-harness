import { test } from "node:test";
import assert from "node:assert/strict";
import { listSuggestions, listFallbackAreaSuggestions } from "../src/lib/mockSearch.js";

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

test("listFallbackAreaSuggestions returns the requested count of area-kind suggestions", () => {
  const results = listFallbackAreaSuggestions(3);
  assert.equal(results.length, 3);
  for (const r of results) {
    assert.equal(r.kind, "area");
    assert.ok(r.key);
    assert.ok(r.label);
  }
});

test("listFallbackAreaSuggestions never duplicates an area within one call", () => {
  const results = listFallbackAreaSuggestions(5);
  const keys = results.map((r) => r.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("listFallbackAreaSuggestions caps at however many area fixtures actually exist", () => {
  const results = listFallbackAreaSuggestions(999);
  assert.ok(results.length > 0);
  assert.ok(results.every((r) => r.kind === "area"));
});
