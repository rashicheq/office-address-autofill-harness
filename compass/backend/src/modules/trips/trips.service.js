import { randomUUID } from "node:crypto";
import * as repo from "./trips.repository.js";
import { newTrip } from "./trips.model.js";
import { NotFoundError } from "../../core/errors.js";
import { requireDestination } from "../destinations/destinations.service.js";
import { requireVibe } from "../vibes/vibes.service.js";
import { seedCategories } from "../tracker/tracker.templates.js";

export function createTrip({ destinationId, days, dateMode, startDate, endDate }) {
  const destination = requireDestination(destinationId);
  const vibe = requireVibe(destination.vibeId);
  const trip = newTrip({
    id: randomUUID(),
    destinationId,
    vibeId: vibe.id,
    days,
    dateMode,
    startDate,
    endDate,
  });
  trip.tracker = seedCategories({ destination, vibe, days });
  return hydrate(repo.create(trip));
}

export function getTrip(id) {
  const trip = repo.findById(id);
  if (!trip) throw new NotFoundError("Trip", id);
  return hydrate(trip);
}

export function getRawTrip(id) {
  const trip = repo.findById(id);
  if (!trip) throw new NotFoundError("Trip", id);
  return trip;
}

export function updateTripWindow(id, patch) {
  const updated = repo.update(id, (trip) => ({
    ...trip,
    ...patch,
    updatedAt: new Date().toISOString(),
  }));
  if (!updated) throw new NotFoundError("Trip", id);
  return hydrate(updated);
}

export function saveTrip(trip) {
  return repo.update(trip.id, () => ({ ...trip, updatedAt: new Date().toISOString() }));
}

// The front end renders trips, it doesn't assemble them — every trip
// response is fully hydrated with its destination and vibe so the client
// never has to join ids across three endpoints to draw one screen.
export function hydrate(trip) {
  const destination = requireDestination(trip.destinationId);
  const vibe = requireVibe(trip.vibeId);
  const daysUntilDeparture =
    trip.dateMode === "fixed" && trip.startDate
      ? Math.ceil((new Date(trip.startDate).getTime() - Date.now()) / 86_400_000)
      : null;

  return {
    ...trip,
    destination,
    vibe,
    daysUntilDeparture,
  };
}
