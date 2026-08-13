import { useState } from "react";
import { MotifIcon } from "./Icon.jsx";

export function ItineraryDayCard({ day, dayIndex, cornerMotif, accent, onReplaceSlots }) {
  const [adding, setAdding] = useState(false);
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");

  function removeSlot(slotId) {
    onReplaceSlots(dayIndex, day.slots.filter((s) => s.id !== slotId));
  }

  function submitAdd() {
    if (!title.trim()) return;
    onReplaceSlots(dayIndex, [...day.slots, { time: time.trim() || "TBD", title: title.trim(), note: "" }]);
    setTime("");
    setTitle("");
    setAdding(false);
  }

  return (
    <div className="sticker day-card">
      <div className="day-corner" style={{ color: accent }}>
        <MotifIcon name={cornerMotif} />
      </div>
      <div className="day-head">
        <div className="day-num">{day.dayNumber}</div>
        <div className="day-title">{day.title}</div>
        <div className="day-meta">{day.meta}</div>
      </div>
      <div className="day-body">
        {day.slots.length === 0 && (
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", padding: "10px 0" }}>
            {day.isBufferDay ? "Nothing scheduled — that's the point." : "No activities yet."}
          </p>
        )}
        {day.slots.map((slot) => (
          <div className="slot" key={slot.id}>
            <div className="slot-time">{slot.time}</div>
            <div style={{ flex: 1 }}>
              <div className="slot-title">
                {slot.title} {slot.pinned && <span style={{ fontSize: 10, color: "var(--accent)" }}>· pinned</span>}
              </div>
              {slot.note && <div className="slot-note">{slot.note}</div>}
            </div>
            <button type="button" className="icon-btn" aria-label={`Remove ${slot.title}`} onClick={() => removeSlot(slot.id)}>
              ✕
            </button>
          </div>
        ))}

        {adding ? (
          <div className="add-row" style={{ marginTop: 10 }}>
            <input className="input" style={{ width: 70, flex: "0 0 auto" }} placeholder="Time" value={time} onChange={(e) => setTime(e.target.value)} />
            <input
              className="input"
              placeholder="Activity"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAdd()}
              autoFocus
            />
            <button type="button" className="btn btn-sm" onClick={submitAdd}>
              Add
            </button>
          </div>
        ) : (
          <button className="slot-add" type="button" onClick={() => setAdding(true)} style={{ cursor: "pointer" }}>
            + Add activity
          </button>
        )}
      </div>
    </div>
  );
}
