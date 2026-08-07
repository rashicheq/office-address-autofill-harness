// Frontend-only address-line config (Rashi, 2026-08 pivot) - replaces the
// backend's tier/drop/shorten rules engine for what User Mode's confirm
// screen shows. No abbreviation, no length budget, no dropping: whichever
// of these raw Google component types are present just gets joined as-is.
// Address Line 1 is never built from this at all - it's always blank until
// the user types it (see UserModeView.jsx), by design, so there is nothing
// here to enforce a line-1-shaped rule against.
//
// This is deliberately NOT a port of formattingPipeline.js's tier system -
// that file (and its confidence-score/FiltersApplied output) keeps running
// unchanged for Dev Mode's own diagnostic view; this config is the only
// thing User Mode's address fields are built from now.

export const ADDRESS_LINE_2_TYPES = ["subpremise", "premise", "street_number"];
export const ADDRESS_LINE_3_TYPES = ["route"];

const CITY_TYPE = "locality";
const STATE_TYPE = "administrative_area_level_1";
const PINCODE_TYPE = "postal_code";

function firstTextByType(addressComponents, types) {
  for (const type of types) {
    const match = addressComponents.find((c) => c.type === type);
    if (match?.text) return match.text;
  }
  return "";
}

function joinTypes(addressComponents, types) {
  return types
    .map((type) => addressComponents.find((c) => c.type === type)?.text)
    .filter(Boolean)
    .join(", ");
}

/**
 * addressComponents: [{ type, text }] - the raw, untouched Google-typed
 * list a search result now carries directly (see mockSearch.js / liveSearch.js).
 *
 * Returns { addressLine2, addressLine3, cityDistrict, state, pincode }.
 * Address Line 1 is intentionally absent - it's user-owned state, not
 * derived from a result at all.
 */
export function buildAddressLines(addressComponents) {
  const components = addressComponents || [];
  return {
    addressLine2: joinTypes(components, ADDRESS_LINE_2_TYPES),
    addressLine3: joinTypes(components, ADDRESS_LINE_3_TYPES),
    cityDistrict: firstTextByType(components, [CITY_TYPE]),
    state: firstTextByType(components, [STATE_TYPE]),
    pincode: firstTextByType(components, [PINCODE_TYPE]),
  };
}
