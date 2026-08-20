"use strict";

/**
 * "The rules script" - CommonJS port of frontend/src/lib/addressLineConfig.js
 * so this standalone folder doesn't need to reach across into the frontend's
 * ESM module tree. Keep the two in sync by hand if either changes (same
 * policy as the standalone HTML prototype elsewhere in this repo).
 *
 * Splits Address Line 1/2/3 out of Google's own formattedAddress string:
 *   1. Strip whatever's already captured as City/State/Pincode out of the
 *      string, so it's never repeated in the address lines too.
 *   2. Split what's left at comma boundaries only - a comma-element is
 *      atomic, never split mid-phrase.
 *   3. Never drop an element unless it was a duplicate from step 1.
 *   4. The element carrying "the number" (an actual plot/building number,
 *      not just any element that merely contains a digit) anchors Line 1;
 *      everything else splits across Line 2/3.
 *   5. If nothing has a number, distribute every element across Line 1/2/3.
 */

function normalize(s) {
  return (s || "").trim().toLowerCase();
}

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

const PLOT_NUMBER_PATTERN = /^\d+[\d/-]*[a-zA-Z]?$/;
const HAS_DIGIT = /\d/;

// A Google Plus Code ("J6R9+55M") is digit-bearing but isn't a building
// number - real address data can carry one as a stand-in for a proper
// street address, and without this it can win the tier-2 fallback below
// purely because it contains digits, anchoring Line 1 on a plus code
// instead of a real detail. Excluded from both tiers; a plus code still
// survives into whichever line rule 5 or the distribute() below puts it in
// (rule 3: never dropped), it just never anchors Line 1 on its own.
const PLUS_CODE_PATTERN = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}$/i;

function findNumberedIndex(elements) {
  const eligible = (el) => !PLUS_CODE_PATTERN.test(el);
  const plotIndex = elements.findIndex((el) => eligible(el) && PLOT_NUMBER_PATTERN.test(el));
  if (plotIndex !== -1) return plotIndex;
  return elements.findIndex((el) => eligible(el) && HAS_DIGIT.test(el));
}

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
 * known: { city, state, pincode } - already-extracted values (e.g. from
 * Google's typed addressComponents) used only to strip duplicates out of
 * the string, per rule 1.
 */
function buildAddressLines(formattedAddress, known) {
  const elements = stripKnownComponents(formattedAddress, known || {});
  return splitIntoLines(elements);
}

module.exports = { buildAddressLines };
