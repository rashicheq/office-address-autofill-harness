import { useEffect, useState } from "react";
import { fetchScenarios, fetchMeta } from "../../api/client.js";
import ConfidenceBreakdown from "./ConfidenceBreakdown.jsx";
import BatchRunner from "./BatchRunner.jsx";

// Same input box as User Mode (CLAUDE.md 4: "same input box, but the output
// panel shows...") plus everything needed to diagnose a failure: the exact
// request, the raw response, ranking_method, distance_km, FiltersApplied,
// the confidence breakdown, source, a named-scenario picker, and a visible
// error/failure log tagged by test case.
export default function DeveloperModeView({ searchState, dataSource, liveApiConfigured }) {
  const { response, loading, error, lastRequest, runSearch } = searchState;
  const [officeName, setOfficeName] = useState("CheQ");
  const [scenarioKey, setScenarioKey] = useState("");
  const [scenarios, setScenarios] = useState([]);
  const [meta, setMeta] = useState(null);
  const [lat, setLat] = useState("12.9352");
  const [lng, setLng] = useState("77.6245");
  const [simulateUnavailable, setSimulateUnavailable] = useState(false);

  useEffect(() => {
    fetchScenarios()
      .then((d) => setScenarios(d.scenarios))
      .catch(() => setScenarios([]));
    fetchMeta()
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  const currentLocation =
    lat.trim() !== "" && lng.trim() !== ""
      ? { latitude: Number(lat), longitude: Number(lng) }
      : null;

  const fireSearch = (name, scenario) => {
    runSearch({
      officeName: name,
      scenario: scenario || null,
      currentLocation,
      simulateGeocodeUnavailable: simulateUnavailable,
    });
  };

  const handleScenarioChange = (e) => {
    const key = e.target.value;
    setScenarioKey(key);
    const picked = scenarios.find((s) => s.key === key);
    const nextName = picked ? picked.names[0] : officeName;
    if (picked) setOfficeName(nextName);
    fireSearch(nextName, key);
  };

  const companyScenarios = scenarios.filter((s) => s.kind === "company");
  const edgeScenarios = scenarios.filter((s) => s.kind === "scenario");

  return (
    <div className="dev-mode">
      <div className="dev-controls">
        <div className="dev-field">
          <label>Office name</label>
          <input
            value={officeName}
            onChange={(e) => {
              setOfficeName(e.target.value);
              setScenarioKey("");
            }}
            onKeyDown={(e) => e.key === "Enter" && fireSearch(officeName, scenarioKey)}
          />
        </div>
        <div className="dev-field">
          <label>Named scenario</label>
          <select value={scenarioKey} onChange={handleScenarioChange}>
            <option value="">— free-type / fuzzy match —</option>
            <optgroup label="Companies (from sort_office_addresses.py)">
              {companyScenarios.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Edge-case scenarios">
              {edgeScenarios.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.testCase} — {s.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className="dev-field">
          <label>Current location (lat, lng)</label>
          <div className="latlng-row">
            <input value={lat} onChange={(e) => setLat(e.target.value)} />
            <input value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
        </div>
        <div className="dev-field dev-field-checkbox">
          <label>
            <input
              type="checkbox"
              checked={simulateUnavailable}
              onChange={(e) => setSimulateUnavailable(e.target.checked)}
            />
            Simulate current-location geocode unavailable (TC-17/19)
          </label>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => fireSearch(officeName, scenarioKey)}
          disabled={loading}
        >
          {loading ? "Searching…" : "Run search"}
        </button>
      </div>

      {dataSource === "live" && !liveApiConfigured && (
        <div className="notice notice-blocked">
          Live API selected, but GOOGLE_PLACES_API_KEY isn't set in backend/.env — the backend will return a clearly-flagged stub, no HTTP call is made to Google.
        </div>
      )}
      {dataSource === "live" && liveApiConfigured && (
        <div className="notice notice-blocked">
          Live API selected — every search below makes a real, billed call to Google Places Text Search (New).
        </div>
      )}

      {error && <div className="notice notice-error">{error}</div>}

      {response && (
        <>
          <div className={response.ranking_method === "fallback_relevance" ? "ranking-banner warn" : "ranking-banner ok"}>
            <span>
              source: <strong>{response.source}</strong>
            </span>
            <span>
              ranking_method: <strong>{response.ranking_method ?? "n/a"}</strong>
            </span>
            {response.pipelineImplementation && (
              <span>
                pipeline: <strong>{response.pipelineImplementation}</strong>
              </span>
            )}
            <span>{response.timing.durationMs}ms</span>
          </div>
          {response.pipelineNote && <p className="pipeline-note">{response.pipelineNote}</p>}
          {response.notIntegrated && <p className="pipeline-note">{response.message}</p>}

          <div className="dev-columns">
            <div className="dev-column">
              <h3>Results ({response.results.length})</h3>
              {response.results.length === 0 && <p className="muted">No results.</p>}
              {response.results.map((r) => (
                <div className="dev-result-card" key={r.place_id}>
                  <div className="dev-result-header">
                    <strong>{r.name}</strong>
                    {r.distance_km != null && <span className="chip">{r.distance_km} km</span>}
                    {r.distance_km == null && <span className="chip chip-warn">no distance (fallback)</span>}
                    {r.coworkingAmbiguous && (
                      <span className="chip chip-warn">co-working: confirm floor/unit</span>
                    )}
                    {r.requiresManualEntry && (
                      <span className="chip chip-error">non-compliant → manual entry</span>
                    )}
                  </div>
                  {r.addressLines && (
                    <div className="dev-result-lines">
                      {r.addressLines.filter(Boolean).map((l, i) => (
                        <div key={i}>{l}</div>
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
                  {r.FiltersApplied.length > 0 && (
                    <div className="filters-applied">
                      {r.FiltersApplied.map((f, i) => (
                        <span className="chip chip-filter" key={i}>
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  <ConfidenceBreakdown confidence={r.confidence} />
                </div>
              ))}

              <h3>Error / failure log</h3>
              {response.errorLog.length === 0 && <p className="muted">Nothing flagged for this search.</p>}
              <ul className="error-log">
                {response.errorLog.map((e, i) => (
                  <li key={i} className={`error-log-item level-${e.level}`}>
                    {e.testCase && <span className="chip">{e.testCase}</span>} {e.message}
                  </li>
                ))}
              </ul>
            </div>

            <div className="dev-column">
              <h3>Raw request</h3>
              <pre className="raw-panel">{JSON.stringify(lastRequest, null, 2)}</pre>
              <h3>Raw response</h3>
              <pre className="raw-panel">{JSON.stringify(response, null, 2)}</pre>
            </div>
          </div>
        </>
      )}

      <BatchRunner
        dataSource={dataSource}
        liveApiConfigured={liveApiConfigured}
        currentLocation={currentLocation}
        simulateGeocodeUnavailable={simulateUnavailable}
      />

      {meta && (
        <div className="open-questions">
          <h3>Open questions (not silently resolved)</h3>
          {meta.openQuestions.map((q) => (
            <div className="oq-item" key={q.id}>
              <strong>{q.id}</strong>: {q.question}
              <div className="oq-default">Current default: {q.currentDefault}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
