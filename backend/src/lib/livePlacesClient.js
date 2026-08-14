// Thin wrapper around Google Places Text Search (New). Same endpoint and
// fieldMask as the reference batch-office-search.js script this was adapted
// from, so results are comparable to a standalone run of that script.
// Node 18+ has fetch built in — no HTTP client dependency needed.

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// displayName/addressComponents/plusCode/formattedAddress/location cover
// everything the pipeline needs; widen this only if a later feature
// (photos, reviews, opening hours, ...) needs more. `places.id` is added on
// top of the reference script's mask — this repo's UI keys/selects results
// by place_id (React list keys, "which card is selected"), so every result
// needs a stable unique id, unlike the reference script which never surfaces
// place_id at all.
const FIELD_MASK = "places.id,places.displayName,places.addressComponents,places.plusCode,places.formattedAddress,places.location";

// regionCode biases results toward India and affects address formatting
// (e.g. "Bengaluru" over a transliteration) - this harness has no non-India
// use case anywhere (fixtures, the default reference location, the whole
// product framing), so it's hardcoded rather than threaded through as a
// parameter for a use case that doesn't exist yet.
const REGION_CODE = "IN";

export async function searchPlacesText(textQuery, apiKey) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery, regionCode: REGION_CODE }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const err = new Error(`Places API error (${response.status}) for "${textQuery}": ${errorText}`);
    err.status = response.status;
    throw err;
  }

  const body = await response.json();
  return body.places || [];
}
