// Address-line rules (Rashi, 2026-08 — "the rules script" rewrite). Works
// off Google's own formattedAddress STRING now, not a join of specific
// typed component types — per spec:
//   1. Strip whatever's already captured as City/State/Pincode out of the
//      string first, so it's never repeated inside Line 1/2/3 too.
//   2. Split what's left at comma boundaries only. A comma-delimited
//      element is atomic — it is never split mid-phrase or mid-word (that
//      was the old 32-char-per-line pipeline's mistake; there is no length
//      budget here at all).
//   3. Never drop an element unless it was a City/State/Pincode duplicate.
//   4. The element carrying "the number" anchors Address Line 1; everything
//      else distributes across Line 2/3.
//   5. If nothing has a number, just distribute all elements across Line 1/2/3.
//
// Address Line 1 is therefore no longer purely user-typed state (that was
// OQ-3's 2026-08 resolution) — it now arrives pre-filled same as Line 2/3,
// still editable same as before. Flagging the reversal rather than burying
// it: this is a deliberate instruction this round, not an oversight.

const CITY_TYPE = "locality";
const STATE_TYPE = "administrative_area_level_1";
const PINCODE_TYPE = "postal_code";

function firstTextByType(addressComponents, type) {
  return addressComponents.find((c) => c.type === type)?.text || "";
}

function normalize(s) {
  return (s || "").trim().toLowerCase();
}

// A comma-element counts as a City/State/Pincode duplicate if it equals one
// of those values outright, OR if every word in it belongs to one of those
// values — Google frequently returns state+pincode fused into one element
// ("Karnataka 560048"), which is still 100% duplicate even though it never
// exactly equals "Karnataka" or "560048" alone.
function isKnownDuplicate(element, knownWords) {
  const words = normalize(element).split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => knownWords.has(w));
}

function stripKnownComponents(formattedAddress, known) {
  const knownValues = [known.city, known.state, known.pincode].map(normalize).filter(Boolean);
  const knownWords = new Set(knownValues.flatMap((v) => v.split(/\s+/)));

  return (formattedAddress || "")
    .split(",")
    .map((el) => el.trim())
    .filter(Boolean)
    .filter((el) => !isKnownDuplicate(el, knownWords));
}

// "The element with the number" (rule 4) means an actual plot/building
// number ("7", "36/1", "23B") - not any element that merely contains a
// digit somewhere, which would also catch floor/block descriptors like
// "1st Floor" or "4th Block" and wrongly anchor Line 1 on those instead.
// Falls back to "contains a digit at all" only if no element looks like a
// real number token, so rule 4 still fires per its literal wording when
// the address has no bare plot number to point to.
const PLOT_NUMBER_PATTERN = /^\d+[\d/-]*[a-zA-Z]?$/;
const HAS_DIGIT = /\d/;

function findNumberedIndex(elements) {
  const plotIndex = elements.findIndex((el) => PLOT_NUMBER_PATTERN.test(el));
  if (plotIndex !== -1) return plotIndex;
  return elements.findIndex((el) => HAS_DIGIT.test(el));
}

// Fills groups front-to-back, each group taking ceil(remaining / groupsLeft)
// elements - so a short list fills Line 1 (then 2, then 3) before any line
// is left empty, and a long list only doubles up once every line already
// has something. Order is preserved throughout; nothing is ever dropped.
function distribute(elements, groupCount) {
  const groups = [];
  let rest = elements;
  let groupsLeft = groupCount;
  while (groupsLeft > 0) {
    const take = Math.ceil(rest.length / groupsLeft);
    groups.push(rest.slice(0, take));
    rest = rest.slice(take);
    groupsLeft--;
  }
  return groups;
}

function splitIntoLines(elements) {
  const numberedIndex = findNumberedIndex(elements);

  if (numberedIndex === -1) {
    const [g1, g2, g3] = distribute(elements, 3);
    return { addressLine1: g1.join(", "), addressLine2: g2.join(", "), addressLine3: g3.join(", "), hasNumberInLine1: false };
  }

  const line1 = elements[numberedIndex];
  const rest = elements.filter((_, i) => i !== numberedIndex);
  const [g2, g3] = distribute(rest, 2);
  return { addressLine1: line1, addressLine2: g2.join(", "), addressLine3: g3.join(", "), hasNumberInLine1: true };
}

/**
 * addressComponents: [{ type, text }] - used only for City/State/Pincode
 * now (still a plain, un-tiered passthrough, unchanged).
 * formattedAddress: Google's own comma-joined address string for this
 * result (`rawFormattedAddress` on every search result, mock or live).
 *
 * Returns { addressLine1, addressLine2, addressLine3, cityDistrict, state,
 * pincode, hasNumberInLine1 }. Unlike before, addressLine1 is populated -
 * see the file header.
 */
export function buildAddressLines(addressComponents, formattedAddress) {
  const components = addressComponents || [];
  const cityDistrict = firstTextByType(components, CITY_TYPE);
  const state = firstTextByType(components, STATE_TYPE);
  const pincode = firstTextByType(components, PINCODE_TYPE);

  const elements = stripKnownComponents(formattedAddress, { city: cityDistrict, state, pincode });
  const { addressLine1, addressLine2, addressLine3, hasNumberInLine1 } = splitIntoLines(elements);

  return { addressLine1, addressLine2, addressLine3, cityDistrict, state, pincode, hasNumberInLine1 };
}
