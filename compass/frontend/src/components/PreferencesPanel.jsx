import { useState } from "react";
import { MotifIcon } from "./Icon.jsx";

const DIETARY_OPTIONS = ["vegetarian", "vegan", "jain", "halal", "kosher"];

export function PreferencesPanel({ trip, conflicts, onUpdate }) {
  const { vibe, preferences } = trip;
  const [newTravelerName, setNewTravelerName] = useState("");
  const [newMustSee, setNewMustSee] = useState("");

  function toggleTag(key) {
    const selected = preferences.selectedTagKeys.includes(key)
      ? preferences.selectedTagKeys.filter((k) => k !== key)
      : [...preferences.selectedTagKeys, key];
    onUpdate({ selectedTagKeys: selected });
  }

  function addTraveler() {
    if (!newTravelerName.trim()) return;
    onUpdate({ travelers: [...preferences.travelers, { name: newTravelerName.trim(), ageBand: "adult", dietary: [] }] });
    setNewTravelerName("");
  }

  function removeTraveler(id) {
    onUpdate({ travelers: preferences.travelers.filter((t) => t.id !== id) });
  }

  function toggleDietary(travelerId, diet) {
    const travelers = preferences.travelers.map((t) => {
      if (t.id !== travelerId) return t;
      const dietary = t.dietary.includes(diet) ? t.dietary.filter((d) => d !== diet) : [...t.dietary, diet];
      return { ...t, dietary };
    });
    onUpdate({ travelers });
  }

  function addMustSee() {
    if (!newMustSee.trim()) return;
    onUpdate({ mustSee: [...preferences.mustSee, newMustSee.trim()] });
    setNewMustSee("");
  }

  function removeMustSee(item) {
    onUpdate({ mustSee: preferences.mustSee.filter((m) => m !== item) });
  }

  return (
    <div className="prefs-grid">
      <div className="sticker card-pad">
        <h3>Pick a feeling</h3>
        <div className="tag-list">
          {vibe.tags.map((tag) => (
            <button
              key={tag.key}
              type="button"
              className={"pref-tag" + (preferences.selectedTagKeys.includes(tag.key) ? " on" : "")}
              onClick={() => toggleTag(tag.key)}
              aria-pressed={preferences.selectedTagKeys.includes(tag.key)}
            >
              <MotifIcon name={vibe.motif} />
              <span>{tag.label}</span>
            </button>
          ))}
        </div>

        <h3 style={{ marginTop: 22 }}>Must-see (pinned to itinerary)</h3>
        {preferences.mustSee.length === 0 && <p style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Nothing pinned yet.</p>}
        {preferences.mustSee.map((item) => (
          <div key={item} className="traveler-row">
            <span className="name">{item}</span>
            <button type="button" className="icon-btn" aria-label={`Remove ${item}`} onClick={() => removeMustSee(item)}>
              ✕
            </button>
          </div>
        ))}
        <div className="add-row">
          <input
            className="input"
            placeholder="e.g. Hidden waterfall trek"
            value={newMustSee}
            onChange={(e) => setNewMustSee(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMustSee()}
          />
          <button type="button" className="btn btn-sm" onClick={addMustSee}>
            Add
          </button>
        </div>
      </div>

      <div className="sticker card-pad">
        <h3>Who's going</h3>

        {conflicts?.length > 0 && (
          <div className="conflict-banner">
            <span>⚠</span>
            <div>
              {conflicts.map((c, i) => (
                <p key={i} style={{ marginBottom: i < conflicts.length - 1 ? 6 : 0 }}>
                  {c.message}
                </p>
              ))}
            </div>
          </div>
        )}

        {preferences.travelers.map((t) => (
          <div key={t.id} className="traveler-row" style={{ flexWrap: "wrap" }}>
            <span className="name">{t.name}</span>
            <div className="tags">
              {DIETARY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={"mini-tag" + (t.dietary.includes(d) ? "" : "")}
                  style={t.dietary.includes(d) ? { background: "var(--accent-2)", color: "var(--ink)" } : undefined}
                  onClick={() => toggleDietary(t.id, d)}
                >
                  {d}
                </button>
              ))}
            </div>
            <button type="button" className="icon-btn" aria-label={`Remove ${t.name}`} onClick={() => removeTraveler(t.id)}>
              ✕
            </button>
          </div>
        ))}

        <div className="add-row">
          <input
            className="input"
            placeholder="Traveler name"
            value={newTravelerName}
            onChange={(e) => setNewTravelerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTraveler()}
          />
          <button type="button" className="btn btn-sm" onClick={addTraveler}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
