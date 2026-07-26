// The only file that knows the backend's URL shape. No Anthropic specifics
// live here or anywhere else in the frontend — every Claude call happens
// server-side (see backend/src/lib/anthropicClient.js).
const BASE = "/api";

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.rawOutput = data.rawOutput ?? null;
    err.day = data.day ?? null;
    throw err;
  }
  return data;
}

export async function fetchSectionMeta() {
  return handle(await fetch(`${BASE}/sections`));
}

export async function fetchSection(key, date) {
  return handle(
    await fetch(`${BASE}/sections/${key}/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    }),
  );
}

export async function regenerateSynthesis(date) {
  return handle(
    await fetch(`${BASE}/synthesis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    }),
  );
}

export async function generateTopCards(date) {
  return handle(
    await fetch(`${BASE}/top-cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    }),
  );
}

export async function listBriefs() {
  return handle(await fetch(`${BASE}/briefs`));
}

export async function clearAllBriefs() {
  return handle(await fetch(`${BASE}/briefs`, { method: "DELETE" }));
}
