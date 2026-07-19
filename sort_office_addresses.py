"""
Office Address Proximity Sorter
--------------------------------
Sorts multiple Google Places office-address matches by distance from the
user's current-address location, closest to farthest (PRD Section 4 / TC-1).

Handles the two edge cases flagged in the PRD:
  - TC-17/TC-19: current-address geocode unavailable/unreliable -> falls back
    to preserving Google's own relevance order, flagged so this is
    measurable (OQ-1), rather than faking a distance sort.
  - TC-18: tied/near-identical distances -> stable sort preserves the
    original (Google relevance) order among ties, so "closest first" never
    produces an arbitrary-looking flip between two equally-close results.

Expected candidate shape (from Places API `location` field):
    {"name": ..., "place_id": ..., "location": {"latitude": .., "longitude": ..}, ...}
Any extra keys on each candidate (formatted address, components, etc.) are
passed through untouched.
"""

import math

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1, lon1, lat2, lon2):
    """Great-circle distance in km between two lat/lon points."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def sort_office_candidates(current_location, candidates):
    """
    current_location: {"latitude": .., "longitude": ..} or None if unavailable
                       (TC-17/TC-19 - no reliable geocode for current address)
    candidates: list of dicts, each with a "location": {"latitude", "longitude"}
                key, in the order Google Places originally returned them
                (i.e. Google's own relevance order)

    Returns: (sorted_candidates, ranking_method)
        ranking_method is "distance" or "fallback_relevance", so callers can
        log/measure how often distance-ranking actually engages (OQ-1).
        Each returned candidate gets a "distance_km" key added (None if
        ranking_method is "fallback_relevance").
    """
    if current_location is None or "latitude" not in current_location or "longitude" not in current_location:
        # TC-17/TC-19: no usable current-address geocode. Preserve Google's
        # own relevance order rather than inventing a fake distance sort.
        fallback = []
        for c in candidates:
            c2 = dict(c)
            c2["distance_km"] = None
            fallback.append(c2)
        return fallback, "fallback_relevance"

    cur_lat, cur_lon = current_location["latitude"], current_location["longitude"]

    enriched = []
    for c in candidates:
        loc = c.get("location") or {}
        if "latitude" not in loc or "longitude" not in loc:
            # A candidate with no location of its own can't be distance-ranked;
            # push it to the end rather than dropping it or crashing the sort.
            c2 = dict(c)
            c2["distance_km"] = float("inf")
            enriched.append(c2)
            continue
        dist = haversine_km(cur_lat, cur_lon, loc["latitude"], loc["longitude"])
        c2 = dict(c)
        c2["distance_km"] = round(dist, 3)
        enriched.append(c2)

    # Stable sort: candidates with equal (or missing/inf) distance keep their
    # original relative order -- this is the TC-18 tie-break, using Google's
    # own relevance ranking as the implicit secondary sort key.
    enriched.sort(key=lambda c: c["distance_km"])
    return enriched, "distance"


if __name__ == "__main__":
    # Demo using real coordinates from four office addresses validated
    # earlier in this project (see address_validation_results.xlsx).
    candidates = [
        {"name": "Fple Technology Pvt. Ltd. (Novel MSR Building, Marathahalli)",
         "place_id": "ChIJJW0wIgATrjsR-IcU6zYBc9g",
         "location": {"latitude": 12.9564797, "longitude": 77.6998334}},
        {"name": "Scapia Technology Private Limited (Mantri Commercio, Bellandur)",
         "place_id": "ChIJrUYkFaQTrjsRFJK-TvGk3zo",
         "location": {"latitude": 12.933285, "longitude": 77.6834925}},
        {"name": "Kiwi India Pvt Ltd (ZedOne Construction Building, Koramangala)",
         "place_id": "ChIJJVHAWTsVrjsRsCUxFod-8A0",
         "location": {"latitude": 12.9360065, "longitude": 77.6158423}},
        {"name": "CheQ Digital Private Limited (BHIVE Workspace, AKR Tech Park)",
         "place_id": "ChIJV49APAAVrjsRiDOTVDvc9pU",
         "location": {"latitude": 12.8919195, "longitude": 77.6424073}},
    ]

    print("=== Scenario A: user's current address is near Koramangala ===")
    user_location = {"latitude": 12.9352, "longitude": 77.6245}
    sorted_candidates, method = sort_office_candidates(user_location, candidates)
    print(f"ranking_method: {method}")
    for c in sorted_candidates:
        print(f"  {c['distance_km']:>6} km  -  {c['name']}")

    print()
    print("=== Scenario B: current-address geocode unavailable (TC-17/TC-19) ===")
    sorted_candidates, method = sort_office_candidates(None, candidates)
    print(f"ranking_method: {method}")
    for c in sorted_candidates:
        print(f"  distance_km={c['distance_km']}  -  {c['name']}  (original Google order preserved)")
