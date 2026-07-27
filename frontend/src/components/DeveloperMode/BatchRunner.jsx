import { useState } from "react";
import { searchBatch } from "../../api/client.js";
import ConfidenceBreakdown from "./ConfidenceBreakdown.jsx";

function parseNames(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function csvEscape(value) {
  const str = String(value == null ? "" : value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(batch) {
  const rows = [
    [
      "Office Name Searched",
      "Match #",
      "Result Name",
      "Line 1",
      "Line 2",
      "Line 3",
      "City",
      "State",
      "Pincode",
      "Confidence %",
      "Ranking Method",
      "Filters Applied",
    ].join(","),
  ];
  for (const entry of batch) {
    const results = entry.results || [];
    if (results.length === 0) {
      const note = entry.errorLog?.[0]?.message || entry.message || "No results";
      rows.push([csvEscape(entry.officeName), "", "", "", "", "", "", "", "", "", "", csvEscape(note)].join(","));
      continue;
    }
    results.forEach((r, i) => {
      rows.push(
        [
          csvEscape(entry.officeName),
          i + 1,
          csvEscape(r.name),
          csvEscape(r.addressLines?.[0]),
          csvEscape(r.addressLines?.[1]),
          csvEscape(r.addressLines?.[2]),
          csvEscape(r.city),
          csvEscape(r.state),
          csvEscape(r.pincode),
          r.confidence?.score ?? "",
          csvEscape(entry.ranking_method),
          csvEscape((r.FiltersApplied || []).join(" | ")),
        ].join(",")
      );
    });
  }
  return rows.join("\n");
}

function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Runs a whole list of office names (e.g. Rashi's 20 real ones) through the
// exact same per-name /search logic as the single search box above, one
// backend call, one place to review every result. Mock or Live, whichever
// is currently selected up in TopBar.
export default function BatchRunner({ dataSource, liveApiConfigured, currentLocation, simulateGeocodeUnavailable }) {
  const [namesText, setNamesText] = useState("");
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const names = parseNames(namesText);
  const isBlocked = dataSource === "live" && !liveApiConfigured;

  const runBatch = async () => {
    if (names.length === 0 || isBlocked) return;
    setLoading(true);
    setError(null);
    setExpandedIndex(null);
    try {
      const data = await searchBatch({ officeNames: names, dataSource, currentLocation, simulateGeocodeUnavailable });
      setBatch(data.batch);
    } catch (err) {
      setError(err.message || "Batch search failed");
      setBatch(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!batch) return;
    downloadCsv(toCsv(batch), `office-address-batch-${dataSource}.csv`);
  };

  return (
    <div className="batch-runner">
      <h3>Batch search</h3>
      <p className="editor-hint">
        Paste one office name per line (e.g. a list of 20) — each one runs through the same formatting pipeline, ranker,
        and confidence scorer as the single search above.
        {dataSource === "live" && " Live mode adds a short delay between names to stay well under Places API rate limits."}
      </p>
      <textarea
        className="batch-textarea"
        rows={6}
        placeholder={"CheQ Digital Private Limited\nKiwi India Pvt Ltd\n..."}
        value={namesText}
        onChange={(e) => setNamesText(e.target.value)}
      />
      <div className="batch-actions">
        <button
          type="button"
          className="primary-btn"
          onClick={runBatch}
          disabled={isBlocked || loading || names.length === 0}
        >
          {loading ? `Running ${names.length}…` : `Run batch (${names.length})`}
        </button>
        <button type="button" className="link-btn" onClick={handleExport} disabled={!batch || batch.length === 0}>
          Export CSV
        </button>
      </div>

      {isBlocked && (
        <div className="notice notice-blocked">
          Live API selected, but GOOGLE_PLACES_API_KEY isn't set in backend/.env — switch to Mock Data, or add the key.
        </div>
      )}
      {error && <div className="notice notice-error">{error}</div>}

      {batch && (
        <div className="batch-table">
          <div className="batch-row batch-row-head">
            <span>Office name</span>
            <span>Matches</span>
            <span>Best confidence</span>
            <span>Ranking</span>
            <span>Source</span>
            <span />
          </div>
          {batch.map((entry, i) => {
            const results = entry.results || [];
            const scored = results.map((r) => r.confidence?.score).filter((s) => s != null);
            const best = scored.length ? Math.max(...scored) : null;
            const expanded = expandedIndex === i;
            return (
              <div className="batch-row-group" key={`${entry.officeName}-${i}`}>
                <div
                  className="batch-row"
                  onClick={() => setExpandedIndex(expanded ? null : i)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setExpandedIndex(expanded ? null : i)}
                >
                  <span>{entry.officeName}</span>
                  <span>{results.length}</span>
                  <span>{best != null ? `${best}%` : "—"}</span>
                  <span>{entry.ranking_method || "—"}</span>
                  <span>{entry.source || dataSource}</span>
                  <span className="batch-row-toggle">{expanded ? "▲" : "▼"}</span>
                </div>
                {expanded && (
                  <div className="batch-row-detail">
                    {results.length === 0 && (
                      <p className="muted">{entry.errorLog?.[0]?.message || entry.message || "No results."}</p>
                    )}
                    {results.map((r) => (
                      <div className="dev-result-card" key={r.place_id}>
                        <div className="dev-result-header">
                          <strong>{r.name}</strong>
                          {r.distance_km != null && <span className="chip">{r.distance_km} km</span>}
                          {r.distance_km == null && <span className="chip chip-warn">no distance (fallback)</span>}
                          {r.requiresManualEntry && <span className="chip chip-error">non-compliant → manual entry</span>}
                        </div>
                        {r.addressLines && (
                          <div className="dev-result-lines">
                            {r.addressLines.filter(Boolean).map((l, li) => (
                              <div key={li}>{l}</div>
                            ))}
                          </div>
                        )}
                        {(r.city || r.state || r.pincode) && (
                          <div className="dev-result-fields">
                            <span>City: {r.city || <em>—</em>}</span>
                            <span>State: {r.state || <em>—</em>}</span>
                            <span>Pincode: {r.pincode || <em>—</em>}</span>
                          </div>
                        )}
                        {r.FiltersApplied?.length > 0 && (
                          <div className="filters-applied">
                            {r.FiltersApplied.map((f, fi) => (
                              <span className="chip chip-filter" key={fi}>
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                        <ConfidenceBreakdown confidence={r.confidence} />
                      </div>
                    ))}
                    {entry.errorLog?.length > 0 && (
                      <ul className="error-log">
                        {entry.errorLog.map((e, ei) => (
                          <li key={ei} className={`error-log-item level-${e.level}`}>
                            {e.testCase && <span className="chip">{e.testCase}</span>} {e.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
