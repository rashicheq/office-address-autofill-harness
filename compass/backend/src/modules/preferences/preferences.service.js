import { randomUUID } from "node:crypto";
import { getRawTrip, saveTrip, hydrate } from "../trips/trips.service.js";

const DIETARY_NEEDING_FLAG = {
  vegan: "vegan_friendly",
  vegetarian: "vegetarian_friendly",
  jain: "jain_friendly",
  halal: "halal_friendly",
  kosher: "kosher_friendly",
};

export function updatePreferences(tripId, patch) {
  const trip = getRawTrip(tripId);
  const travelers = (patch.travelers ?? trip.preferences.travelers).map((t) => ({
    ...t,
    id: t.id ?? randomUUID(),
  }));
  const preferences = {
    travelers,
    selectedTagKeys: patch.selectedTagKeys ?? trip.preferences.selectedTagKeys,
    mustSee: patch.mustSee ?? trip.preferences.mustSee,
  };
  const updated = saveTrip({ ...trip, preferences });
  return hydrate(updated);
}

// FR-4.3 — flag, don't silently drop, a hard dietary constraint the current
// itinerary has no matching option for. Only meaningful once an itinerary
// exists; an ungenerated trip has nothing to check against yet.
export function detectPreferenceConflicts(tripId) {
  const trip = getRawTrip(tripId);
  if (!trip.itinerary) return [];

  const requiredFlags = new Set();
  for (const traveler of trip.preferences.travelers) {
    for (const diet of traveler.dietary) {
      if (DIETARY_NEEDING_FLAG[diet]) requiredFlags.add(DIETARY_NEEDING_FLAG[diet]);
    }
  }
  if (requiredFlags.size === 0) return [];

  const allSlots = trip.itinerary.days.flatMap((d) => d.slots);
  const conflicts = [];
  for (const flag of requiredFlags) {
    const hasMatch = allSlots.some((s) => s.dietaryFlags?.includes(flag));
    if (!hasMatch) {
      conflicts.push({
        type: "dietary_unmet",
        flag,
        message: `No itinerary stop is flagged "${flag.replace("_", " ")}" — check meal options for this traveler before booking.`,
      });
    }
  }
  return conflicts;
}
