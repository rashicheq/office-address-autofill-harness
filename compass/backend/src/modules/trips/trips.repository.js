// In-memory store for Phase 1 (PRD §4.0 — mock-first, no DB dependency yet).
// The function surface (create/findById/update/list) is the seam: swapping
// this file for a Postgres/Mongo-backed one later shouldn't require the
// service layer above it to change at all.
const trips = new Map();

export function create(trip) {
  trips.set(trip.id, trip);
  return trip;
}

export function findById(id) {
  return trips.get(id) ?? null;
}

export function update(id, patchFn) {
  const existing = trips.get(id);
  if (!existing) return null;
  const updated = patchFn(existing);
  trips.set(id, updated);
  return updated;
}

export function list() {
  return Array.from(trips.values());
}

export function _reset() {
  trips.clear();
}
