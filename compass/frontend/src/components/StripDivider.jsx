import { VIBE_PALETTE } from "../design/vibePalette.js";

export function StripDivider({ vibeId, count = 14 }) {
  const palette = VIBE_PALETTE[vibeId] ?? VIBE_PALETTE.beach;
  const items = Array.from({ length: count }, (_, i) => palette.particles[i % palette.particles.length]);

  return (
    <div className="strip" aria-hidden="true" style={{ color: palette.colors.accent }}>
      {items.map((svg, i) => (
        <span key={i} dangerouslySetInnerHTML={{ __html: svg }} />
      ))}
    </div>
  );
}
