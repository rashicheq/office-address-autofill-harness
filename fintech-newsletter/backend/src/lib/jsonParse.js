// Loose JSON parsing for model output: strips markdown fences, then repairs
// a response that was cut off mid-array by closing it after the last
// complete top-level object. Both functions throw on failure (rather than
// returning a fallback) so callAnthropicForJson's retry-once logic applies
// uniformly to array and object responses.

function findTopLevelObjectEnds(str) {
  let depth = 0;
  let inStr = false;
  let esc = false;
  const ends = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === "\\") {
      esc = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) ends.push(i);
    }
  }
  return ends;
}

function stripFences(text) {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

export function parseJsonArrayLoose(text) {
  const cleaned = stripFences(text);
  const start = cleaned.indexOf("[");
  const candidate = start >= 0 ? cleaned.slice(start) : cleaned;
  try {
    return JSON.parse(candidate);
  } catch (e) {
    const ends = findTopLevelObjectEnds(candidate);
    if (!ends.length) throw e;
    const repaired = `${candidate.slice(0, ends[ends.length - 1] + 1)}]`;
    return JSON.parse(repaired);
  }
}

export function parseJsonObjectLoose(text) {
  const cleaned = stripFences(text);
  const start = cleaned.indexOf("{");
  const candidate = start >= 0 ? cleaned.slice(start) : cleaned;
  return JSON.parse(candidate);
}
