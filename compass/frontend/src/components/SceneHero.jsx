import { VIBE_PALETTE } from "../design/vibePalette.js";

const PARTICLE_POSITIONS = [
  ["8%", "16%"],
  ["82%", "22%"],
  ["45%", "10%"],
  ["65%", "34%"],
  ["20%", "38%"],
];

export function SceneHero({ vibeId, eyebrow, title, subtitle, children }) {
  const palette = VIBE_PALETTE[vibeId] ?? VIBE_PALETTE.beach;

  return (
    <section className="scene">
      <div className="scene-inner">
        <div className="sun" aria-hidden="true" />
        <svg className="horizon back" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
          <path d={palette.horizon.back} fill={palette.colors.ground2} />
        </svg>
        <svg className="horizon front" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
          <path d={palette.horizon.front} fill={palette.colors.ground} />
        </svg>
        {palette.particles.map((svg, i) => (
          <div
            key={i}
            className="particle"
            aria-hidden="true"
            style={{
              left: PARTICLE_POSITIONS[i % PARTICLE_POSITIONS.length][0],
              top: PARTICLE_POSITIONS[i % PARTICLE_POSITIONS.length][1],
              width: 22,
              color: palette.colors.accent,
              animationDelay: `${i * 0.7}s`,
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ))}

        <div className="hero-copy">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {subtitle && <p className="sub">{subtitle}</p>}
        </div>

        {children}
      </div>
    </section>
  );
}
