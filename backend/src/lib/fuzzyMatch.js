// Fuzzy office-name matching for the mock data source (CLAUDE.md 4.0: "Fuzzy-
// match the typed office name against fixture names so the search box
// behaves like it would against the real API"). Also doubles as the
// "name-match strength" input to the confidence scorer (lib/confidence.js) —
// one definition of "matches", used in both places.

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text) {
  return normalize(text).split(" ").filter(Boolean);
}

function jaccard(tokensA, tokensB) {
  const a = new Set(tokensA);
  const b = new Set(tokensB);
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prevRow = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    const curRow = [i];
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        curRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    prevRow = curRow;
  }
  return prevRow[n];
}

/**
 * 0-1 similarity between a typed query and a candidate name: half token-
 * overlap (Jaccard over normalized word sets), half normalized edit-distance
 * similarity, plus a small bonus when one string contains the other.
 */
export function nameMatchScore(query, candidateName) {
  const normQuery = normalize(query);
  const normName = normalize(candidateName);
  if (!normQuery || !normName) return 0;

  const tokenOverlap = jaccard(tokens(query), tokens(candidateName));
  const maxLen = Math.max(normQuery.length, normName.length, 1);
  const editSimilarity = 1 - levenshtein(normQuery, normName) / maxLen;
  const substringBonus =
    normName.includes(normQuery) || normQuery.includes(normName) ? 0.15 : 0;

  const raw = 0.5 * tokenOverlap + 0.5 * editSimilarity + substringBonus;
  return Math.max(0, Math.min(1, raw));
}

/**
 * pool: array of { names: string[], ...rest } — every alias in `names` is
 * scored against the query and the best-scoring alias wins, so a fixture can
 * register multiple ways a user might type its name.
 * Returns { entry, score } for the best-scoring pool entry, or null if pool is empty.
 */
export function findBestMatch(query, pool) {
  let best = null;
  for (const entry of pool) {
    for (const name of entry.names) {
      const score = nameMatchScore(query, name);
      if (!best || score > best.score) {
        best = { entry, score };
      }
    }
  }
  return best;
}
