import { test } from "node:test";
import assert from "node:assert/strict";
import { sortOfficeCandidates, haversineKm } from "../src/lib/ranker.js";

test("sorts candidates by distance, closest first", () => {
  const current = { latitude: 12.9352, longitude: 77.6245 };
  const candidates = [
    { name: "far", location: { latitude: 12.8452, longitude: 77.6602 } },
    { name: "near", location: { latitude: 12.9279, longitude: 77.6271 } },
  ];
  const { candidates: sorted, rankingMethod } = sortOfficeCandidates(current, candidates);
  assert.equal(rankingMethod, "distance");
  assert.equal(sorted[0].name, "near");
  assert.equal(sorted[1].name, "far");
});

test("falls back to relevance order when current location is unavailable (TC-17/TC-19)", () => {
  const candidates = [
    { name: "a", location: { latitude: 1, longitude: 1 } },
    { name: "b", location: { latitude: 2, longitude: 2 } },
  ];
  const { candidates: sorted, rankingMethod } = sortOfficeCandidates(null, candidates);
  assert.equal(rankingMethod, "fallback_relevance");
  assert.deepEqual(sorted.map((c) => c.name), ["a", "b"]);
  assert.equal(sorted[0].distance_km, null);
});

test("stable-sorts equidistant candidates, preserving original relative order (TC-18)", () => {
  const current = { latitude: 12.9352, longitude: 77.6245 };
  const candidates = [
    { name: "tower-a", location: { latitude: 12.9452, longitude: 77.6245 } },
    { name: "tower-b", location: { latitude: 12.9252, longitude: 77.6245 } },
  ];
  const { candidates: sorted } = sortOfficeCandidates(current, candidates);
  assert.equal(sorted[0].distance_km, sorted[1].distance_km);
  assert.deepEqual(sorted.map((c) => c.name), ["tower-a", "tower-b"]);
});

test("haversineKm returns 0 for identical points", () => {
  assert.equal(haversineKm(12.9, 77.6, 12.9, 77.6), 0);
});
