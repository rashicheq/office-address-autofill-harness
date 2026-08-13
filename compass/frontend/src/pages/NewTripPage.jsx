import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { SceneHero } from "../components/SceneHero.jsx";
import { VibeSwitcher } from "../components/VibeSwitcher.jsx";
import { StripDivider } from "../components/StripDivider.jsx";

const HEADLINES = {
  beach: "Somewhere with a tide, and nothing scheduled.",
  snow: "First snowfall, bonfire nights, a slower pace.",
  city: "Neon alleys and markets before sunrise.",
  tropical: "Off the beaten path, canopy overhead.",
};

export function NewTripPage() {
  const navigate = useNavigate();
  const [vibes, setVibes] = useState([]);
  const [activeVibeId, setActiveVibeId] = useState("beach");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [days, setDays] = useState(5);
  const [dateMode, setDateMode] = useState("flexible");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listVibes().then((r) => setVibes(r.vibes)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      api
        .searchDestinations(query, activeVibeId)
        .then((r) => setResults(r.destinations))
        .catch((e) => setError(e.message));
    }, 200);
    return () => clearTimeout(handle);
  }, [query, activeVibeId]);

  async function selectDestination(destination) {
    setCreating(true);
    setError(null);
    try {
      const payload = { destinationId: destination.id, days: Number(days), dateMode };
      if (dateMode === "fixed") {
        payload.startDate = startDate || undefined;
        payload.endDate = endDate || undefined;
      }
      const { trip } = await api.createTrip(payload);
      navigate(`/trip/${trip.id}`);
    } catch (e) {
      setError(e.message);
      setCreating(false);
    }
  }

  return (
    <main>
      <SceneHero
        vibeId={activeVibeId}
        eyebrow="Compass"
        title="Plan the trip, not the spreadsheet."
        subtitle={HEADLINES[activeVibeId]}
      >
        <VibeSwitcher vibes={vibes} activeVibeId={activeVibeId} onSelect={setActiveVibeId} />
      </SceneHero>

      <StripDivider vibeId={activeVibeId} />

      <section className="block">
        <div className="block-head">
          <h2>Where to?</h2>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label>Destination</label>
          <input
            className="input"
            placeholder="Search a place..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div className="field">
            <label>Days</label>
            <input
              className="input"
              type="number"
              min="1"
              max="30"
              style={{ width: 90 }}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Dates</label>
            <select className="input" value={dateMode} onChange={(e) => setDateMode(e.target.value)}>
              <option value="flexible">Flexible</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          {dateMode === "fixed" && (
            <>
              <div className="field">
                <label>Start</label>
                <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="field">
                <label>End</label>
                <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          )}
        </div>

        {error && <p style={{ color: "var(--warn)", marginBottom: 12 }}>{error}</p>}

        <div className="result-list">
          {results.length === 0 && <p className="empty-state">No matches yet — try a different spelling, or browse by vibe above.</p>}
          {results.map((d) => (
            <button key={d.id} type="button" className="result-item" disabled={creating} onClick={() => selectDestination(d)}>
              <div>
                <div className="name">{d.name}</div>
                <div className="place">
                  {d.country} · {d.tagline}
                </div>
              </div>
              <span className="go">Plan this →</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
