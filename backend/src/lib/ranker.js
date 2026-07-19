// Port of sort_office_addresses.py (repo root) — same edge-case behavior,
// same field names (ranking_method / distance_km) so the frontend doesn't
// need to know whether this ran in Node or Python (CLAUDE.md 3.2).

const EARTH_RADIUS_KM = 6371.0;

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dPhi = toRadians(lat2 - lat1);
  const dLambda = toRadians(lon2 - lon1);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * currentLocation: {latitude, longitude} or null/undefined — TC-17/TC-19,
 *   no reliable geocode for the user's current address.
 * candidates: array of objects with a `location: {latitude, longitude}` key,
 *   in Google's own relevance order (order in = order Google returned them).
 *
 * Returns { candidates, rankingMethod }. rankingMethod is "distance" or
 * "fallback_relevance" (OQ-1: how often distance-ranking actually engages).
 * Each returned candidate gets a distance_km key (null under fallback_relevance).
 */
export function sortOfficeCandidates(currentLocation, candidates) {
  if (
    !currentLocation ||
    currentLocation.latitude == null ||
    currentLocation.longitude == null
  ) {
    return {
      candidates: candidates.map((c) => ({ ...c, distance_km: null })),
      rankingMethod: "fallback_relevance",
    };
  }

  const { latitude: curLat, longitude: curLon } = currentLocation;

  const enriched = candidates.map((c) => {
    const loc = c.location || {};
    if (loc.latitude == null || loc.longitude == null) {
      // No location of its own to rank by — push to the end, don't drop it
      // or crash the sort.
      return { ...c, distance_km: Infinity };
    }
    const dist = haversineKm(curLat, curLon, loc.latitude, loc.longitude);
    return { ...c, distance_km: Math.round(dist * 1000) / 1000 };
  });

  // Explicit comparator (not `a - b`) so Infinity-vs-Infinity never produces
  // NaN, and ties/missing distances fall back cleanly to array order — this
  // is the TC-18 tie-break: Array.prototype.sort is a stable sort (guaranteed
  // since Node 11 / V8 7.0), so equal-distance candidates keep Google's
  // original relative order.
  enriched.sort((a, b) => {
    if (a.distance_km === b.distance_km) return 0;
    if (a.distance_km === Infinity) return 1;
    if (b.distance_km === Infinity) return -1;
    return a.distance_km - b.distance_km;
  });

  return { candidates: enriched, rankingMethod: "distance" };
}
