import { useEffect, useRef, useState } from "react";
import { fetchSuggestions, search as runSearch } from "../../api/client.js";

// Full-page bottom sheet: a search bar (pre-filled with the office name)
// with live suggestions mixing specific offices and general areas — "like
// Google Maps' search bar, but without the map view" (Rashi, 2026-08 flow
// correction). Backed by a mocked suggestions endpoint (GET /suggest)
// since there's no Places Autocomplete key set up yet; selecting a
// suggestion still runs the REAL rules pipeline via the existing scenario
// lookup on /search, so results are never faked, only the "type ahead"
// part is mocked. Multi-branch entries (e.g. Vantage Corp) get a second,
// in-sheet step to pick the specific branch, closest pre-selected by the
// same ranker already used everywhere else.
export default function OfficeSearchSheet({ officeName, dataSource, onResolve, onClose }) {
  const [query, setQuery] = useState(officeName || "");
  const [suggestions, setSuggestions] = useState([]);
  const [subStep, setSubStep] = useState("search"); // "search" | "loading" | "branches"
  const [branches, setBranches] = useState([]);
  const [branchQueryLabel, setBranchQueryLabel] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    if (subStep !== "search") return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const data = await fetchSuggestions(query.trim());
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, subStep]);

  const resolveEntry = async (suggestion) => {
    setSubStep("loading");
    try {
      const data = await runSearch({ officeName: suggestion.label, dataSource, scenario: suggestion.key });
      const results = (data.results || []).filter((r) => !r.requiresManualEntry);
      if (results.length <= 1) {
        onResolve(results[0] || null);
        return;
      }
      setBranches(results);
      setBranchQueryLabel(suggestion.label);
      setSubStep("branches");
    } catch {
      onResolve(null);
    }
  };

  const handleManualFallback = () => onResolve(null);

  return (
    <div className="map-sheet-overlay" role="dialog" aria-modal="true">
      <div className="map-sheet">
        <div className="map-sheet-header">
          <button
            type="button"
            className="icon-btn"
            onClick={subStep === "branches" ? () => setSubStep("search") : onClose}
            aria-label={subStep === "branches" ? "Back to search" : "Close"}
          >
            ←
          </button>
          <div>
            <div className="map-sheet-title">{subStep === "branches" ? "Select your office" : "Search office or area"}</div>
            {subStep === "branches" && <div className="map-sheet-office-name">{branchQueryLabel}</div>}
          </div>
        </div>

        {subStep === "search" && (
          <>
            <div className="map-sheet-landmark-row">
              <input
                className="search-input"
                autoFocus
                placeholder="Search office name or area"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="suggestion-list">
              {query.trim() && suggestions.length === 0 && (
                <div className="empty-state">
                  <p>No matching office or area found for &ldquo;{query}&rdquo;.</p>
                  <button type="button" className="link-btn" onClick={handleManualFallback}>
                    Enter address manually instead
                  </button>
                </div>
              )}
              {suggestions.map((s) => (
                <button key={s.key} type="button" className="suggestion-item" onClick={() => resolveEntry(s)}>
                  <span className="suggestion-icon" aria-hidden="true">
                    {s.kind === "area" ? "📍" : "🏢"}
                  </span>
                  <span className="suggestion-label">{s.label}</span>
                  <span className={s.kind === "area" ? "chip" : "chip chip-filter"}>{s.kind === "area" ? "Area" : "Office"}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {subStep === "loading" && <p className="muted map-sheet-loading">Fetching address…</p>}

        {subStep === "branches" && (
          <div className="suggestion-list">
            {branches.map((b, i) => (
              <button key={b.place_id} type="button" className="suggestion-item branch-item" onClick={() => onResolve(b)}>
                <span className="suggestion-icon" aria-hidden="true">
                  🏢
                </span>
                <span className="suggestion-label">
                  <strong>{b.name}</strong>
                  <span className="branch-address">
                    {[b.officeBlockBuilding, b.areaLocality].filter(Boolean).join(", ")}
                  </span>
                </span>
                {i === 0 && <span className="chip chip-filter">Closest</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
