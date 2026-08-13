import { useState } from "react";
import { CreatureIcon, MotifIcon } from "./Icon.jsx";

export function TrackerPanel({ vibe, tracker, progress, onToggleItem, onAddItem }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [categoryKey, setCategoryKey] = useState(tracker.categories[0]?.key ?? "custom");

  function submitAdd() {
    if (!label.trim()) return;
    onAddItem({ categoryKey, label: label.trim() });
    setLabel("");
    setAdding(false);
  }

  return (
    <div className="tracker-grid">
      <div className="sticker trail-wrap">
        <div className="trail">
          <div className="track-line" />
          <span className="flag" style={{ color: "var(--accent)" }}>
            <MotifIcon name="flag" />
          </span>
          <CreatureIcon creature={vibe.creature} done className="traveler" style={{ left: `${progress.pct}%` }} />
        </div>
        <p className="trail-caption">
          <b>{progress.pct}%</b> ready · {progress.doneCount} of {progress.totalCount} done
        </p>
      </div>

      <div className="sticker card-pad">
        {tracker.categories.map((cat) => (
          <div className="track-cat" key={cat.key}>
            <h4 style={{ color: "var(--accent)" }}>
              <MotifIcon name={cat.icon} />
              <span style={{ color: "var(--ink-soft)" }}>{cat.label}</span>
            </h4>
            {cat.items.map((item) => (
              <div className="track-item" key={item.id}>
                <button
                  type="button"
                  className={"critter-box" + (item.done ? " checked" : "")}
                  aria-pressed={item.done}
                  aria-label={item.label}
                  onClick={() => onToggleItem(item.id, !item.done)}
                >
                  <span className="idle">
                    <CreatureIcon creature={vibe.creature} done={false} />
                  </span>
                  <span className="done">
                    <CreatureIcon creature={vibe.creature} done />
                  </span>
                </button>
                <div className={"track-label" + (item.done ? " strike" : "")}>
                  {item.label}
                  {item.due && <span className="due">{item.due}</span>}
                </div>
              </div>
            ))}
          </div>
        ))}

        {adding ? (
          <div className="add-row" style={{ marginTop: 4 }}>
            <select className="input" style={{ flex: "0 0 auto" }} value={categoryKey} onChange={(e) => setCategoryKey(e.target.value)}>
              {tracker.categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="New item"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAdd()}
              autoFocus
            />
            <button type="button" className="btn btn-sm" onClick={submitAdd}>
              Add
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 6 }} onClick={() => setAdding(true)}>
            + Add your own
          </button>
        )}
      </div>
    </div>
  );
}
