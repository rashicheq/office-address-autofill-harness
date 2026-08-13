import { CREATURES } from "../assets/icons/creatures.js";
import { MOTIFS } from "../assets/icons/motifs.js";

// Both maps are trusted, hand-authored SVG strings baked into the app
// bundle — never user input — so dangerouslySetInnerHTML here isn't an
// injection risk.
export function MotifIcon({ name, className, style }) {
  const svg = MOTIFS[name];
  if (!svg) return null;
  return <span className={className} style={style} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function CreatureIcon({ creature, done, className, style }) {
  const svg = CREATURES[`${creature}_${done ? "done" : "idle"}`];
  if (!svg) return null;
  return <span className={className} style={style} dangerouslySetInnerHTML={{ __html: svg }} />;
}
