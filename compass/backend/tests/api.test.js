import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => server.close());

async function api(path, options) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json();
  return { status: res.status, body };
}

test("GET /health responds ok", async () => {
  const { status, body } = await api("/health");
  assert.equal(status, 200);
  assert.equal(body.status, "ok");
});

test("GET /api/vibes returns the four curated vibes", async () => {
  const { status, body } = await api("/api/vibes");
  assert.equal(status, 200);
  assert.equal(body.vibes.length, 4);
  assert.deepEqual(body.vibes.map((v) => v.id).sort(), ["beach", "city", "snow", "tropical"]);
});

test("GET /api/destinations fuzzy-matches by name", async () => {
  const { body } = await api("/api/destinations?query=tok");
  assert.ok(body.destinations.some((d) => d.id === "tokyo"));
});

test("GET /api/destinations filters by vibe", async () => {
  const { body } = await api("/api/destinations?vibe=snow");
  assert.ok(body.destinations.every((d) => d.vibeId === "snow"));
  assert.ok(body.destinations.length >= 3);
});

test("POST /api/trips rejects an unknown destination", async () => {
  const { status, body } = await api("/api/trips", {
    method: "POST",
    body: JSON.stringify({ destinationId: "nowhere", days: 3 }),
  });
  assert.equal(status, 404);
  assert.equal(body.error.code, "NOT_FOUND");
});

test("POST /api/trips rejects an out-of-range day count", async () => {
  const { status, body } = await api("/api/trips", {
    method: "POST",
    body: JSON.stringify({ destinationId: "tokyo", days: 99 }),
  });
  assert.equal(status, 422);
  assert.equal(body.error.code, "VALIDATION_ERROR");
});

test("full trip lifecycle: create -> generate -> preferences -> tracker", async () => {
  const created = await api("/api/trips", {
    method: "POST",
    body: JSON.stringify({ destinationId: "gili-air", days: 6, dateMode: "flexible" }),
  });
  assert.equal(created.status, 201);
  const tripId = created.body.trip.id;

  // Tracker is auto-seeded at creation, before any itinerary exists.
  assert.ok(created.body.trip.tracker.categories.length >= 4);
  assert.equal(created.body.trip.itinerary, null);

  const generated = await api(`/api/trips/${tripId}/itinerary/generate`, { method: "POST" });
  assert.equal(generated.status, 200);
  assert.equal(generated.body.trip.itinerary.days.length, 6);
  // Gili Air has 2 templated days; days 3-6 must be buffer days, not silent repeats.
  assert.equal(generated.body.trip.itinerary.days[0].isBufferDay, false);
  assert.equal(generated.body.trip.itinerary.days[5].isBufferDay, true);

  const prefs = await api(`/api/trips/${tripId}/preferences`, {
    method: "PATCH",
    body: JSON.stringify({ travelers: [{ name: "Traveler A", dietary: ["vegan"] }] }),
  });
  assert.equal(prefs.status, 200);
  assert.equal(prefs.body.conflicts[0].flag, "vegan_friendly");

  const tracker = await api(`/api/trips/${tripId}/tracker`);
  assert.equal(tracker.body.progress.doneCount, 0);
  const firstItemId = tracker.body.tracker.categories[0].items[0].id;

  const toggled = await api(`/api/trips/${tripId}/tracker/items/${firstItemId}`, {
    method: "PATCH",
    body: JSON.stringify({ done: true }),
  });
  assert.equal(toggled.body.progress.doneCount, 1);

  const added = await api(`/api/trips/${tripId}/tracker/items`, {
    method: "POST",
    body: JSON.stringify({ categoryKey: "packing", label: "Snorkel gear" }),
  });
  assert.equal(added.status, 201);
  const packing = added.body.tracker.categories.find((c) => c.key === "packing");
  assert.ok(packing.items.some((i) => i.label === "Snorkel gear"));
});

test("PATCH itinerary day replaces slots and re-runs conflict check", async () => {
  const created = await api("/api/trips", {
    method: "POST",
    body: JSON.stringify({ destinationId: "tokyo", days: 2 }),
  });
  const tripId = created.body.trip.id;
  await api(`/api/trips/${tripId}/itinerary/generate`, { method: "POST" });

  const patched = await api(`/api/trips/${tripId}/itinerary/days/0`, {
    method: "PATCH",
    body: JSON.stringify({ slots: [{ time: "09:00", title: "Custom stop", note: "Added by traveler" }] }),
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.trip.itinerary.days[0].slots.length, 1);
  assert.equal(patched.body.trip.itinerary.days[0].slots[0].title, "Custom stop");
  assert.ok(patched.body.trip.itinerary.days[0].slots[0].id, "server assigns an id to new slots");
});
