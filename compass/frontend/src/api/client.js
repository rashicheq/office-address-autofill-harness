// Thin fetch wrapper — every function here just calls an endpoint and
// returns JSON. No trip logic, no scoring, no itinerary assembly lives in
// this file or anywhere else in the front end; that's the backend's job.
const BASE = import.meta.env.VITE_API_BASE ?? "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error?.message ?? `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return body;
}

export const api = {
  listVibes: () => request("/api/vibes"),
  searchDestinations: (query, vibe) =>
    request(`/api/destinations?query=${encodeURIComponent(query ?? "")}${vibe ? `&vibe=${vibe}` : ""}`),

  createTrip: (payload) => request("/api/trips", { method: "POST", body: JSON.stringify(payload) }),
  getTrip: (tripId) => request(`/api/trips/${tripId}`),
  updateTripWindow: (tripId, payload) =>
    request(`/api/trips/${tripId}`, { method: "PATCH", body: JSON.stringify(payload) }),

  getPreferenceConflicts: (tripId) => request(`/api/trips/${tripId}/preferences`),
  updatePreferences: (tripId, payload) =>
    request(`/api/trips/${tripId}/preferences`, { method: "PATCH", body: JSON.stringify(payload) }),

  generateItinerary: (tripId) => request(`/api/trips/${tripId}/itinerary/generate`, { method: "POST" }),
  replaceDaySlots: (tripId, dayIndex, slots) =>
    request(`/api/trips/${tripId}/itinerary/days/${dayIndex}`, { method: "PATCH", body: JSON.stringify({ slots }) }),

  getTracker: (tripId) => request(`/api/trips/${tripId}/tracker`),
  toggleTrackerItem: (tripId, itemId, done) =>
    request(`/api/trips/${tripId}/tracker/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ done }) }),
  addTrackerItem: (tripId, payload) =>
    request(`/api/trips/${tripId}/tracker/items`, { method: "POST", body: JSON.stringify(payload) }),
};
