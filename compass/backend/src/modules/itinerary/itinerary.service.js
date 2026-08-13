import { randomUUID } from "node:crypto";
import { generateItinerary } from "./itinerary.generator.js";
import { getRawTrip, saveTrip, hydrate } from "../trips/trips.service.js";
import { requireDestination } from "../destinations/destinations.service.js";
import { requireVibe } from "../vibes/vibes.service.js";
import { NotFoundError, ValidationError } from "../../core/errors.js";

export function generate(tripId) {
  const trip = getRawTrip(tripId);
  const destination = requireDestination(trip.destinationId);
  const vibe = requireVibe(trip.vibeId);
  const itinerary = generateItinerary({
    destination,
    vibe,
    days: trip.days,
    mustSee: trip.preferences.mustSee,
  });
  const updated = saveTrip({ ...trip, itinerary });
  return hydrate(updated);
}

export function updateDaySlots(tripId, dayIndex, slots) {
  const trip = getRawTrip(tripId);
  if (!trip.itinerary) throw new ValidationError("Generate an itinerary before editing it.");
  const days = [...trip.itinerary.days];
  if (!days[dayIndex]) throw new NotFoundError("Itinerary day", dayIndex);
  const withIds = slots.map((s) => ({ ...s, id: s.id ?? randomUUID() }));
  days[dayIndex] = { ...days[dayIndex], slots: withIds };
  const updated = saveTrip({ ...trip, itinerary: { ...trip.itinerary, days } });
  return hydrate(updated);
}
