// -----------------------------------------------------------------------------
// STUB / PROVENANCE NOTICE
// -----------------------------------------------------------------------------
// address_filter_pipeline_v2.py (the canonical, already-validated formatting
// script referenced throughout the PRD and CLAUDE.md) is NOT present in this
// repo. Per CLAUDE.md 3.1 / 4.0 ("stub this if address_filter_pipeline_v2.py
// isn't in the repo — flag that it's a stub"), this file is a harness-local
// REIMPLEMENTATION of the rules documented in PRD Section 5, written from the
// spec rather than ported from the real script. It is faithful to the
// documented rule precedence (fit-check -> minimal-drop search -> punctuation
// shorten -> Line-1-digit rule) so the harness can actually exercise TC-4/
// TC-11/TC-16, but it has NOT been validated against the same 6 real Google
// responses the canonical script was. Treat its exact output as illustrative,
// not authoritative — swap this module out when the real script lands in the
// repo. Every response carries `pipelineImplementation: "harness-stub"` plus
// this note so it's never mistaken for validated production logic.
// -----------------------------------------------------------------------------

export const PIPELINE_PROVENANCE = {
  implementation: "harness-stub",
  note:
    "Reimplements PRD Section 5 rules locally; NOT the canonical address_filter_pipeline_v2.py, which isn't in this repo.",
};

// PRD Section 5.2 — component priority tiers. Only components in this map
// participate in the 3-line composition; locality/administrative_area/
// postal_code/country are treated as separate fields entirely (standard
// Indian KYC forms already capture City/State/Pincode outside the 3 free
// lines), and a bare `plus_code` type is deliberately absent here so it's
// automatically excluded from the line-eligible pool (TC-15/OQ-4).
const TIER_BY_TYPE = {
  subpremise: "critical",
  premise: "critical",
  street_number: "critical",
  route: "high",
  sublocality_level_2: "medium",
  sublocality_level_3: "medium",
  sublocality_level_1: "lower",
  neighborhood: "lower",
  landmark: "lower",
};

// Cost used only to rank *candidate drop-combinations of the same size*
// cheapest-first — route is penalized heavily so it is only ever chosen when
// no lower-tier combination of the same size succeeds ("high tier only gives
// way if no sparing combination works", PRD Section 5.1 step 2).
const TIER_COST = { lower: 1, medium: 3, high: 100 };

const ABBREVIATIONS = [
  [/\broad\b/gi, "Rd"],
  [/\bstreet\b/gi, "St"],
  [/\bbuilding\b/gi, "Bldg"],
  [/\bavenue\b/gi, "Ave"],
  [/\bapartments?\b/gi, "Apt"],
  [/\bfloor\b/gi, "Flr"],
  [/\bextension\b/gi, "Extn"],
  [/\bjunction\b/gi, "Jn"],
];

function abbreviateText(text) {
  let out = text;
  for (const [pattern, replacement] of ABBREVIATIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function rangeArray(n) {
  return Array.from({ length: n }, (_, i) => i);
}

function kCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...tail] = arr;
  const withHead = kCombinations(tail, k - 1).map((c) => [head, ...c]);
  const withoutHead = kCombinations(tail, k);
  return [...withHead, ...withoutHead];
}

// Tries every way to partition `texts` (in order, never reordered) into 1..
// maxLines contiguous groups, each joined by ", ". PRD 5.1 step 1's
// "searches every possible way to group components across the 3 lines".
// `line1Budget` lets a caller reserve room on Line 1 in advance (e.g. for a
// "1, " prefix the digit rule may need to add) without ever slicing an
// already-composed line after the fact — small input sizes (<=10
// components) make brute force trivial.
//
// Generates EVERY valid grouping (not just the first found) and ranks them:
// (1) a grouping whose Line 1 already ends in a digit wins outright — this
// matters because a real numeric anchor (e.g. street_number) can end up
// pushed onto Line 2/3 by a grouping that's merely length-valid, which would
// otherwise trigger an unnecessary Flag:DefaultNumberInserted even though a
// genuine number exists in the address, just not at the tail of Line 1; (2)
// among equally-digit-compliant options, fewer lines used; (3) a fuller
// Line 1 (packs earlier lines first, a natural reading order).
function tryPartitions(texts, maxLineLen, maxLines, line1Budget = maxLineLen) {
  const n = texts.length;
  if (n === 0) return { fits: true, lines: [] };

  const limitFor = (lineIdx) => (lineIdx === 0 ? line1Budget : maxLineLen);
  const candidates = [];

  const tryCuts = (cutIdxs) => {
    const groups = [];
    let start = 0;
    for (const idx of cutIdxs) {
      groups.push(texts.slice(start, idx + 1));
      start = idx + 1;
    }
    groups.push(texts.slice(start));
    const lines = groups.map((g) => g.join(", "));
    const ok = lines.every((line, idx) => line.length <= limitFor(idx));
    if (ok) candidates.push(lines);
  };

  const gaps = n - 1;
  for (let groups = 1; groups <= Math.min(maxLines, n); groups += 1) {
    const k = groups - 1;
    if (k === 0) {
      tryCuts([]);
    } else {
      for (const combo of kCombinations(rangeArray(gaps), k)) {
        tryCuts(combo);
      }
    }
  }

  if (candidates.length === 0) return { fits: false, lines: null };

  candidates.sort((a, b) => {
    const aDigit = /\d$/.test((a[0] || "").trim());
    const bDigit = /\d$/.test((b[0] || "").trim());
    if (aDigit !== bDigit) return aDigit ? -1 : 1;
    if (a.length !== b.length) return a.length - b.length;
    return (b[0] || "").length - (a[0] || "").length;
  });

  return { fits: true, lines: candidates[0] };
}

// PRD 5.1 step 2: find the smallest set of (non-critical) components to
// remove such that the remainder fits. Enumerates drop-combinations smallest-
// count-first, cheapest-tier-first within a count, and returns the first
// combination whose removal makes the remainder fit.
function minimalDropSearch(orderedComponents, maxLineLen, maxLines, line1Budget) {
  const droppableIdxs = [];
  orderedComponents.forEach((c, i) => {
    if (TIER_BY_TYPE[c.type] !== "critical") droppableIdxs.push(i);
  });

  for (let k = 1; k <= droppableIdxs.length; k += 1) {
    const combos = kCombinations(droppableIdxs, k);
    combos.sort((a, b) => {
      const cost = (combo) =>
        combo.reduce(
          (sum, idx) => sum + TIER_COST[TIER_BY_TYPE[orderedComponents[idx].type]],
          0
        );
      return cost(a) - cost(b);
    });
    for (const combo of combos) {
      const dropSet = new Set(combo);
      const remaining = orderedComponents.filter((_, i) => !dropSet.has(i));
      const fit = tryPartitions(remaining.map((c) => c.text), maxLineLen, maxLines, line1Budget);
      if (fit.fits) {
        return {
          dropped: combo.map((idx) => orderedComponents[idx]),
          remaining,
          lines: fit.lines,
        };
      }
    }
  }
  return null;
}

// PRD 5.1 step 3: shorten a single oversized component at its own natural
// punctuation boundary; word-level (whole-word) truncation is the loudly-
// flagged last resort; a mid-word cut is never performed.
function shortenAtPunctuation(text, maxLen) {
  if (maxLen <= 0) return { text: null, cutMethod: "impossible" };
  if (text.length <= maxLen) return { text, cutMethod: null };

  const slice = text.slice(0, maxLen);

  for (let i = slice.length - 1; i >= 0; i -= 1) {
    if (slice[i] === "," || slice[i] === "-") {
      const cut = text.slice(0, i).trimEnd();
      if (cut.length > 0) return { text: cut, cutMethod: "punctuation" };
      break;
    }
  }

  for (let i = slice.length - 1; i >= 0; i -= 1) {
    if (slice[i] === " ") {
      const cut = text.slice(0, i).trimEnd();
      if (cut.length > 0) return { text: cut, cutMethod: "word" };
      break;
    }
  }

  // Not even one whole word fits inside maxLen — shortening without a
  // mid-word cut is impossible. Caller treats this as TC-4.
  return { text: null, cutMethod: "impossible" };
}

// Only reached once minimalDropSearch has already failed at every drop
// count up to "drop everything droppable" — so `criticalOnly` here really is
// the maximal remaining set. PRD scopes this step to "a single remaining
// component"; if more than one is independently oversized, that's beyond the
// documented algorithm and is treated as TC-4 rather than invented behavior.
function attemptShortenAndFit(criticalOnly, maxLineLen, maxLines, line1Budget) {
  const oversized = criticalOnly.filter((c) => c.text.length > maxLineLen);
  if (oversized.length !== 1) return null;

  const target = oversized[0];
  const { text: shortened, cutMethod } = shortenAtPunctuation(target.text, maxLineLen);
  if (shortened == null) return null;

  const candidateComponents = criticalOnly.map((c) =>
    c === target ? { ...c, text: shortened, shortened: true, cutMethod } : c
  );
  const fit = tryPartitions(candidateComponents.map((c) => c.text), maxLineLen, maxLines, line1Budget);
  if (!fit.fits) return null;

  return { components: candidateComponents, lines: fit.lines, cutMethod };
}

// Runs the full fit -> minimal-drop -> shorten cascade (PRD 5.1 steps 1-3)
// for a given Line-1 budget. Separated out so the Line-1-digit rule (step 4)
// can re-run this ENTIRE tier-aware search with 3 fewer chars reserved on
// Line 1, instead of slicing an already-composed line after the fact — that
// matters because an already-composed Line 1 is a comma-joined mix of
// components, and blindly truncating it at a "convenient" comma could
// silently cut away a critical (never-droppable) component's own text.
function runFullFit(abbreviated, maxLineLen, maxLines, line1Budget) {
  const zeroFit = tryPartitions(abbreviated.map((c) => c.text), maxLineLen, maxLines, line1Budget);
  if (zeroFit.fits) {
    return { lines: zeroFit.lines, filtersApplied: [] };
  }

  const dropResult = minimalDropSearch(abbreviated, maxLineLen, maxLines, line1Budget);
  if (dropResult) {
    const filtersApplied = [];
    dropResult.dropped.forEach((c) => {
      filtersApplied.push(`Dropped:${c.type}`);
      if (TIER_BY_TYPE[c.type] === "high") {
        filtersApplied.push(`Flag:HighTierComponentDropped:${c.type}`);
      }
    });
    return { lines: dropResult.lines, filtersApplied };
  }

  const droppableAll = abbreviated.filter((c) => TIER_BY_TYPE[c.type] !== "critical");
  const criticalOnly = abbreviated.filter((c) => TIER_BY_TYPE[c.type] === "critical");
  const shortenResult = attemptShortenAndFit(criticalOnly, maxLineLen, maxLines, line1Budget);
  if (shortenResult) {
    const filtersApplied = droppableAll.map((c) => `Dropped:${c.type}`);
    filtersApplied.push(
      shortenResult.cutMethod === "word" ? "Flag:WordLevelCut" : "Shortened:PunctuationBoundary"
    );
    return { lines: shortenResult.lines, filtersApplied };
  }

  return null;
}

function padLines(lines, maxLines) {
  const out = [...(lines || [])];
  while (out.length < maxLines) out.push("");
  return out.slice(0, maxLines);
}

// OQ-2 (open, PRD Section 8 / TC-12): when both a subpremise/premise AND a
// street_number are present, which numeric anchor should lead Line 1? This
// reorders components (never drops/renames them) so the chosen anchor sits
// first among them; default ("subpremise_first") is a no-op, matching the
// PRD's documented current behavior.
function applyLine1Precedence(components, mode) {
  if (mode !== "street_number_first") return components;

  const idx = {};
  components.forEach((c, i) => {
    idx[c.type] = i;
  });
  const anchorIdx = Math.min(idx.subpremise ?? Infinity, idx.premise ?? Infinity);
  const streetIdx = idx.street_number;
  if (streetIdx === undefined || anchorIdx === Infinity || streetIdx <= anchorIdx) {
    return components;
  }

  const arr = [...components];
  const [streetComp] = arr.splice(streetIdx, 1);
  arr.splice(anchorIdx, 0, streetComp);
  return arr;
}

const NON_COMPLIANT_RESULT = (filtersApplied) => ({
  lines: null,
  filtersApplied,
  compliant: false,
  requiresManualEntry: true,
});

/**
 * rawComponents: [{ type, text }], in Google's original order.
 * options: { maxLineLength, maxLines, line1NumericPrecedence }
 *
 * Returns { lines: [l1,l2,l3] | null, filtersApplied: string[], compliant,
 * requiresManualEntry }. `lines` is null when requiresManualEntry is true
 * (TC-4 — never ship a broken address, route to manual entry same as TC-3).
 */
export function formatAddress(rawComponents, options = {}) {
  const maxLineLen = options.maxLineLength ?? 32;
  const maxLines = options.maxLines ?? 3;
  const line1NumericPrecedence = options.line1NumericPrecedence ?? "subpremise_first";

  let relevant = rawComponents.filter((c) => TIER_BY_TYPE[c.type]);
  relevant = applyLine1Precedence(relevant, line1NumericPrecedence);

  if (relevant.length === 0) {
    return NON_COMPLIANT_RESULT(["Flag:NoLineEligibleComponents"]);
  }

  const abbreviated = relevant.map((c) => ({ ...c, text: abbreviateText(c.text) }));
  const abbreviationFlags = [];
  abbreviated.forEach((c, i) => {
    if (c.text !== relevant[i].text) abbreviationFlags.push(`Abbreviation:${c.type}`);
  });

  const attempt = runFullFit(abbreviated, maxLineLen, maxLines, maxLineLen);
  if (!attempt) {
    return NON_COMPLIANT_RESULT([...abbreviationFlags, "Flag:NonCompliantRouteToManualEntry"]);
  }

  let filtersApplied = [...abbreviationFlags, ...attempt.filtersApplied];
  let finalLines = attempt.lines;

  const line1 = (finalLines[0] || "").trim();
  if (!/\d$/.test(line1)) {
    let base = finalLines;
    if (line1.length + 3 > maxLineLen) {
      const redo = runFullFit(abbreviated, maxLineLen, maxLines, maxLineLen - 3);
      if (!redo) {
        return NON_COMPLIANT_RESULT([...abbreviationFlags, "Flag:NonCompliantRouteToManualEntry"]);
      }
      filtersApplied = [...abbreviationFlags, ...redo.filtersApplied];
      base = redo.lines;
    }
    const prefixed = `1, ${(base[0] || "").trim()}`.trim();
    finalLines = [prefixed, ...base.slice(1)];
    filtersApplied.push("Flag:DefaultNumberInserted");
  }

  return {
    lines: padLines(finalLines, maxLines),
    filtersApplied,
    compliant: true,
    requiresManualEntry: false,
  };
}

export { TIER_BY_TYPE };
