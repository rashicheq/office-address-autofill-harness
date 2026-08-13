import { randomUUID } from "node:crypto";
import { getRawTrip, saveTrip } from "../trips/trips.service.js";
import { NotFoundError } from "../../core/errors.js";

export function getTrackerView(tripId) {
  const trip = getRawTrip(tripId);
  return { tracker: trip.tracker, progress: computeProgress(trip.tracker) };
}

export function toggleItem(tripId, itemId, done) {
  const trip = getRawTrip(tripId);
  let found = false;
  const categories = trip.tracker.categories.map((cat) => ({
    ...cat,
    items: cat.items.map((it) => {
      if (it.id !== itemId) return it;
      found = true;
      return { ...it, done: done ?? !it.done };
    }),
  }));
  if (!found) throw new NotFoundError("Tracker item", itemId);
  const tracker = { categories };
  saveTrip({ ...trip, tracker });
  return { tracker, progress: computeProgress(tracker) };
}

// FR-6.2 — the templated checklist is a starting point, not a ceiling.
// Adding to an unknown categoryKey creates a new (visibly custom) category
// rather than silently dropping the item into the nearest existing one.
export function addItem(tripId, { categoryKey, categoryLabel, label, due, assignee }) {
  const trip = getRawTrip(tripId);
  const categories = [...trip.tracker.categories];
  let category = categories.find((c) => c.key === categoryKey);
  const newItem = { id: randomUUID(), label, due: due ?? null, done: false, assignee: assignee ?? null };

  if (category) {
    category.items = [...category.items, newItem];
  } else {
    categories.push({
      key: categoryKey ?? "custom",
      label: categoryLabel ?? "Custom",
      icon: "flag",
      items: [newItem],
    });
  }

  const tracker = { categories };
  saveTrip({ ...trip, tracker });
  return { tracker, progress: computeProgress(tracker) };
}

export function computeProgress(tracker) {
  const allItems = tracker.categories.flatMap((c) => c.items);
  const doneCount = allItems.filter((i) => i.done).length;
  const totalCount = allItems.length;
  return {
    doneCount,
    totalCount,
    pct: totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100),
  };
}
