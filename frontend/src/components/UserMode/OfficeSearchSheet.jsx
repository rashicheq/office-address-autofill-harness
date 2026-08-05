import { useEffect, useRef, useState } from "react";
import { fetchSuggestions, search as runSearch } from "../../api/client.js";

// Full-page bottom sheet: a search bar (pre-filled with whichever value the
// caller seeds it with — the office name, or the currently-selected area
// when reopened via the "Search area" CTA) with live suggestions mixing
// specific offices and general areas — "like Google Maps' search bar, but
// without the map view" (Rashi, 2026-08 flow correction). Backed by a
// mocked suggestions endpoint (GET /suggest) since there's no Places
// Autocomplete key set up yet; selecting a suggestion still runs the REAL
// rules pipeline via the existing scenario lookup on /search, so results
// are never faked, only the "type ahead" part is mocked. Multi-branch
// companies (e.g. Vantage Corp, TC-1) show every branch as its own row
// directly in this same dropdown, closest first via the same ranker used
// everywhere else — the user picks their specific office in one step. The
// "branches" subStep below is a defensive fallback for any other scenario
// that somehow returns multiple candidates without the dropdown having
// already disambiguated them via placeId.
export default function OfficeSearchSheet({ initialQuery, dataSource, onResolve, onClose }) {
  const [query, setQuery] = useState(initialQuery || "");
  const [suggestions, setSuggestions] = useState([]);
  const [subStep, setSubStep] = useState("search"); // "search" | "loading" | "branches"
  const [branches, setBranches] = useState([]);
  const [branchQueryLabel, setBranchQueryLabel] = useState("");
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

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

  // suggestion.kind / suggestion.label travel back to the caller as `meta`
  // so it can tell "an area was picked" apart from "an office was picked"
  // without guessing from the result shape alone.
  const resolveEntry = async (suggestion) => {
    setSubStep("loading");
    try {
      const data = await runSearch({ officeName: suggestion.label, dataSource, scenario: suggestion.key });
      const results = (data.results || []).filter((r) => !r.requiresManualEntry);
      if (suggestion.placeId) {
        // The dropdown already showed every branch as its own row (TC-1) -
        // the user picked this exact one, so resolve straight to it instead
        // of showing a second picker screen for a choice already made.
        const picked = results.find((r) => r.place_id === suggestion.placeId);
        onResolve(picked || results[0] || null, { label: suggestion.label, kind: suggestion.kind });
        return;
      }
      if (results.length <= 1) {
        onResolve(results[0] || null, { label: suggestion.label, kind: suggestion.kind });
        return;
      }
      // Defensive fallback for any other scenario that returns multiple
      // candidates without the dropdown having already disambiguated them.
      setBranches(results);
      setBranchQueryLabel(suggestion.label);
      setSubStep("branches");
    } catch {
      onResolve(null);
    }
  };

  const handleManualFallback = () => onResolve(null);

  // Not on Google Maps under this name — clear the query and hand focus
  // straight back to the bar so pivoting to an area search feels like a
  // continuation of the same search, not a dead end.
  const handleSearchAreaInstead = () => {
    setQuery("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const showEmptyState = subStep === "search" && query.trim() && suggestions.length === 0;

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
            <div className="map-sheet-search-row">
              <div className="search-bar">
                <span className="search-bar-icon" aria-hidden="true">
                  🔍
                </span>
                <input
                  ref={inputRef}
                  className="search-bar-input"
                  autoFocus
                  placeholder="Search office name or area"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {showEmptyState && (
                <button type="button" className="search-area-cta" onClick={handleSearchAreaInstead}>
                  📍 Search area
                </button>
              )}
            </div>
            <div className="suggestion-list">
              {showEmptyState && (
                <div className="empty-state">
                  <p>We couldn&rsquo;t find &ldquo;{query}&rdquo; on Google Maps under that name.</p>
                  <button type="button" className="link-btn" onClick={handleManualFallback}>
                    Enter address manually instead
                  </button>
                </div>
              )}
              {suggestions.map((s) => (
                <button key={s.placeId || s.key} type="button" className="suggestion-item" onClick={() => resolveEntry(s)}>
                  <span className="suggestion-icon" aria-hidden="true">
                    {s.kind === "area" ? "📍" : "🏢"}
                  </span>
                  <span className="suggestion-label">{s.label}</span>
                  {s.closest ? (
                    <span className="chip chip-filter">Closest</span>
                  ) : (
                    <span className={s.kind === "area" ? "chip" : "chip chip-filter"}>{s.kind === "area" ? "Area" : "Office"}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {subStep === "loading" && <p className="muted map-sheet-loading">Fetching address…</p>}

        {subStep === "branches" && (
          <div className="suggestion-list">
            {branches.map((b, i) => (
              <button
                key={b.place_id}
                type="button"
                className="suggestion-item branch-item"
                onClick={() => onResolve(b, { label: branchQueryLabel, kind: "office" })}
              >
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
