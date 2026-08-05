async function postJSON(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function search(params) {
  return postJSON("/search", params);
}

export function searchBatch(params) {
  return postJSON("/search/batch", params);
}

export function fetchScenarios() {
  return getJSON("/scenarios");
}

export function fetchMeta() {
  return getJSON("/meta");
}

export function fetchSuggestions(query) {
  return getJSON(`/suggest?q=${encodeURIComponent(query)}`);
}
