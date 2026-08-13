import { DESTINATIONS, findDestinationById } from "./destinations.data.js";
import { fuzzyRank } from "../../core/fuzzyMatch.js";
import { NotFoundError } from "../../core/errors.js";

export function searchDestinations({ query = "", vibeId } = {}) {
  let pool = DESTINATIONS;
  if (vibeId) pool = pool.filter((d) => d.vibeId === vibeId);
  if (!query.trim()) return pool;
  return fuzzyRank(query, pool, (d) => `${d.name} ${d.country} ${d.tagline}`, { limit: 10 });
}

export function requireDestination(id) {
  const dest = findDestinationById(id);
  if (!dest) throw new NotFoundError("Destination", id);
  return dest;
}
