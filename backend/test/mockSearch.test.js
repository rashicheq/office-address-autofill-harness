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

test("listSuggestions surfaces the multi-branch demo since it's flagged userFacing", () => {
  const results = listSuggestions("vantage");
  assert.equal(results.length, 1);
  assert.equal(results[0].key, "tc1-vantage-multi-branch");
  // Real name, not the Dev-Mode-oriented internal label.
  assert.equal(results[0].label, "Vantage Corp");
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
