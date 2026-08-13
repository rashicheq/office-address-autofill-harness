import { CreatureIcon } from "./Icon.jsx";

export function VibeSwitcher({ vibes, activeVibeId, onSelect }) {
  return (
    <div className="vibe-dock" role="group" aria-label="Trip vibe">
      {vibes.map((vibe) => (
        <button
          key={vibe.id}
          type="button"
          className={"vibe-btn" + (vibe.id === activeVibeId ? " active" : "")}
          onClick={() => onSelect(vibe.id)}
          aria-pressed={vibe.id === activeVibeId}
        >
          <CreatureIcon creature={vibe.creature} done />
          <span>{vibe.label}</span>
        </button>
      ))}
    </div>
  );
}
