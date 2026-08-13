// Generic token-overlap + substring fuzzy scorer. Deliberately not scoped to
// destinations — anywhere the product needs "did the user's free text mean
// this record" (destination search now, could be activity search or a future
// support/help search later) can reuse this instead of re-deriving it.
export function fuzzyScore(query, candidate) {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q) return 0;
  if (c === q) return 100;
  if (c.startsWith(q)) return 85;
  if (c.includes(q)) return 65;

  const qTokens = q.split(" ").filter(Boolean);
  const cTokens = c.split(" ").filter(Boolean);
  const overlap = qTokens.filter((t) => cTokens.some((ct) => ct.startsWith(t) || t.startsWith(ct)));
  if (overlap.length === 0) return 0;
  return 30 + (overlap.length / qTokens.length) * 30;
}

export function fuzzyRank(query, items, getSearchableText, { minScore = 1, limit = 20 } = {}) {
  return items
    .map((item) => ({ item, score: fuzzyScore(query, getSearchableText(item)) }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item);
}

function normalize(str) {
  return String(str ?? "").trim().toLowerCase();
}
