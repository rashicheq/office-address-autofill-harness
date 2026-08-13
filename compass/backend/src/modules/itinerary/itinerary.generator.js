import { randomUUID } from "node:crypto";
import { DESTINATION_TEMPLATES, REST_DAY_POOL } from "./itinerary.data.js";

// Rule-based generator (PRD §4.5). Structured so a future Phase 2/3 swap to
// an LLM- or live-API-driven generator only has to replace this function —
// the shape it returns (days[].slots[], each with an id) is the contract
// the rest of the app (tracker seeding, preference-conflict checks,
// PATCH /days/:i) depends on, not on how the content was produced.
export function generateItinerary({ destination, vibe, days, mustSee = [] }) {
  const templates = DESTINATION_TEMPLATES[destination.id] ?? [];
  const restPool = REST_DAY_POOL[vibe.id] ?? [];

  const dayCards = [];
  for (let i = 0; i < days; i++) {
    const template = templates[i];
    const source = template ?? restPool[(i - templates.length) % Math.max(restPool.length, 1)] ?? {
      title: "Open day",
      slots: [],
    };
    dayCards.push({
      id: `day-${i + 1}`,
      dayNumber: i + 1,
      title: source.title,
      meta: `Day ${i + 1} · ${destination.name}`,
      isBufferDay: !template,
      slots: (source.slots ?? []).map((s) => ({ id: randomUUID(), pinned: false, ...s })),
    });
  }

  placeMustSeeItems(dayCards, mustSee);

  return { days: dayCards, generatedAt: new Date().toISOString(), source: "template" };
}

// Simple placement rule (FR-5.1/5.2): drop each must-see item onto the
// least-loaded day so far, tagged `pinned` so the UI can show it came from
// the traveler's own list rather than the generator.
function placeMustSeeItems(dayCards, mustSee) {
  if (!mustSee.length || !dayCards.length) return;
  for (const item of mustSee) {
    const target = dayCards.reduce((min, d) => (d.slots.length < min.slots.length ? d : min), dayCards[0]);
    target.slots.push({ id: randomUUID(), time: "TBD", title: item, note: "Pinned from your must-see list", pinned: true });
  }
}
