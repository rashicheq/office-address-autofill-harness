import { CreatureIcon } from "./Icon.jsx";

export function TripWindowCard({ trip }) {
  const { destination, vibe, days, daysUntilDeparture } = trip;

  return (
    <div className="sticker tag-card">
      <div className="tag-punch" />
      <div className="tag-main">
        <label>Where to</label>
        <div className="tag-dest">
          <CreatureIcon creature={vibe.creature} done className="creature-mini" />
          <span>
            {destination.name}, {destination.country}
          </span>
        </div>
        <p className="tag-note">{destination.bestWindowNote}</p>
      </div>

      <div className="route-col">
        <div className="days-stamp">
          <span className="num">{days}</span>
          <span className="lbl">days</span>
        </div>
        <div className="route-track">
          <svg className="path" viewBox="0 0 200 26" preserveAspectRatio="none">
            <path
              d="M6 20 Q60 4 100 14 T194 8"
              fill="none"
              stroke="var(--line)"
              strokeWidth="2"
              strokeDasharray="1 6"
              strokeLinecap="round"
            />
          </svg>
          <CreatureIcon creature={vibe.creature} done className="traveler" style={{ left: "78%" }} />
        </div>
      </div>

      <div className="tag-side">
        {daysUntilDeparture !== null && (
          <span className="deal-stamp">{daysUntilDeparture >= 0 ? `${daysUntilDeparture} days to go` : "Departed"}</span>
        )}
        <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>{destination.tagline}</p>
      </div>
    </div>
  );
}
