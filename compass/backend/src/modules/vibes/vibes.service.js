import { VIBES, getVibeById } from "./vibes.data.js";
import { NotFoundError } from "../../core/errors.js";

export function listVibes() {
  return VIBES;
}

export function requireVibe(id) {
  const vibe = getVibeById(id);
  if (!vibe) throw new NotFoundError("Vibe", id);
  return vibe;
}
