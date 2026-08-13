import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { vibeCssVars } from "../design/vibePalette.js";
import { SceneHero } from "../components/SceneHero.jsx";
import { StripDivider } from "../components/StripDivider.jsx";
import { TripWindowCard } from "../components/TripWindowCard.jsx";
import { PreferencesPanel } from "../components/PreferencesPanel.jsx";
import { ItineraryDayCard } from "../components/ItineraryDayCard.jsx";
import { TrackerPanel } from "../components/TrackerPanel.jsx";

export function TripDashboardPage() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [trackerView, setTrackerView] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [tripRes, trackerRes, conflictRes] = await Promise.all([
        api.getTrip(tripId),
        api.getTracker(tripId),
        api.getPreferenceConflicts(tripId),
      ]);
      setTrip(tripRes.trip);
      setTrackerView(trackerRes);
      setConflicts(conflictRes.conflicts);
    } catch (e) {
      setError(e.message);
    }
  }, [tripId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleUpdatePreferences(patch) {
    try {
      const res = await api.updatePreferences(tripId, patch);
      setTrip(res.trip);
      setConflicts(res.conflicts);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await api.generateItinerary(tripId);
      setTrip(res.trip);
      setConflicts(res.conflicts);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleReplaceSlots(dayIndex, slots) {
    try {
      const res = await api.replaceDaySlots(tripId, dayIndex, slots);
      setTrip(res.trip);
      setConflicts(res.conflicts);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleToggleItem(itemId, done) {
    try {
      setTrackerView(await api.toggleTrackerItem(tripId, itemId, done));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAddTrackerItem(payload) {
    try {
      setTrackerView(await api.addTrackerItem(tripId, payload));
    } catch (e) {
      setError(e.message);
    }
  }

  if (error && !trip) return <p className="page-error">{error}</p>;
  if (!trip || !trackerView) return <p className="page-loading">Loading trip…</p>;

  const { destination, vibe } = trip;

  return (
    <main style={vibeCssVars(vibe.id)}>
      <SceneHero vibeId={vibe.id} eyebrow={vibe.label} title={`${destination.name}, ${destination.country}`} subtitle={destination.tagline} />

      <StripDivider vibeId={vibe.id} />

      <section className="block">
        <div className="block-head">
          <h2>Trip window</h2>
        </div>
        <TripWindowCard trip={trip} />
      </section>

      <StripDivider vibeId={vibe.id} />

      <section className="block">
        <div className="block-head">
          <h2>Vibe &amp; preferences</h2>
        </div>
        <PreferencesPanel trip={trip} conflicts={conflicts} onUpdate={handleUpdatePreferences} />
      </section>

      <StripDivider vibeId={vibe.id} />

      <section className="block">
        <div className="block-head">
          <h2>Itinerary</h2>
          <button type="button" className="btn btn-sm" onClick={handleGenerate} disabled={generating} style={{ marginLeft: "auto" }}>
            {generating ? "Generating…" : trip.itinerary ? "Regenerate" : "Generate itinerary"}
          </button>
        </div>
        {!trip.itinerary && <p className="empty-state">No itinerary yet — generate one from your trip window and preferences.</p>}
        {trip.itinerary && (
          <div className="day-stack">
            {trip.itinerary.days.map((day, i) => (
              <ItineraryDayCard
                key={day.id}
                day={day}
                dayIndex={i}
                cornerMotif={vibe.cornerMotif}
                accent="var(--accent)"
                onReplaceSlots={handleReplaceSlots}
              />
            ))}
          </div>
        )}
      </section>

      <StripDivider vibeId={vibe.id} />

      <section className="block">
        <div className="block-head">
          <h2>Tracker</h2>
        </div>
        <TrackerPanel
          vibe={vibe}
          tracker={trackerView.tracker}
          progress={trackerView.progress}
          onToggleItem={handleToggleItem}
          onAddItem={handleAddTrackerItem}
        />
      </section>

      {error && <p style={{ color: "var(--warn)", padding: "0 0 40px" }}>{error}</p>}
    </main>
  );
}
