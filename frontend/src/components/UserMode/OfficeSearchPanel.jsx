import { useRef, useState } from "react";
import { fetchSuggestions, search as runSearch } from "../../api/client.js";

const MIN_QUERY_LENGTH = 3;

// Inline office/area search, rendered directly on the address page (2026-08
// correction: no more full-page bottom sheet). Search bar comes pre-filled
// with whichever value the caller seeds it with — the office name, or the
// currently-selected area when reopened via "Search area" — but nothing is
// looked up until the user explicitly clicks Search (or presses Enter),
// mocking the moment a real Places Autocomplete call would fire. Multi-branch
// companies (e.g. Vantage Corp, TC-1) show every branch as its own row
// directly in the results list, closest first via the same ranker used
// everywhere else. A genuine no-match still isn't a dead end: the backend
// always includes a few random nearby-area suggestions (`fallbackAreas`)
// alongside the real (empty) results, so there's always something to click
// besides "search again" or "enter manually."
//
// 2026-08: this panel now also stays mounted, above the manual-entry form,
// once the user has chosen manual entry (see UserModeView's `!hasResolved`
// condition) - search is never a dead end you can only reach once. The
// caller hides the "+ Enter address manually" link in that case
// (showManualLink=false) since it's redundant there, and re-clicking it
// would wipe whatever the user has already typed into the manual fields.
export default function OfficeSearchPanel({ initialQuery, dataSource, onResolve, showManualLink = true }) {
  const [query, setQuery] = useState(initialQuery || "");
  const [phase, setPhase] = useState("idle"); // "idle" | "searching" | "results" | "resolving" | "branches"
  const [suggestions, setSuggestions] = useState([]);
  const [fallbackAreas, setFallbackAreas] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchQueryLabel, setBranchQueryLabel] = useState("");
  const inputRef = useRef(null);

  const canSearch = query.trim().length >= MIN_QUERY_LENGTH;

  const handleQueryChange = (value) => {
    setQuery(value);
    // Editing the text invalidates whatever was last searched for - don't
    // keep showing results for a query that no longer matches the box.
    if (phase === "results") setPhase("idle");
  };

  const handleSearch = async () => {
    if (!canSearch) return;
    setPhase("searching");
    try {
      const data = await fetchSuggestions(query.trim());
      setSuggestions(data.suggestions || []);
      setFallbackAreas(data.fallbackAreas || []);
    } catch {
      setSuggestions([]);
      setFallbackAreas([]);
    }
    setPhase("results");
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  // suggestion.kind / suggestion.label travel back to the caller as `meta`
  // so it can tell "an area was picked" apart from "an office was picked"
  // without guessing from the result shape alone.
  const resolveEntry = async (suggestion) => {
    setPhase("resolving");
    try {
      const data = await runSearch({ officeName: suggestion.label, dataSource, scenario: suggestion.key });
      const results = (data.results || []).filter((r) => !r.requiresManualEntry);
      if (suggestion.placeId) {
        // The results list already showed every branch as its own row
        // (TC-1) - the user picked this exact one, so resolve straight to
        // it instead of showing a second picker screen for a choice already made.
        const picked = results.find((r) => r.place_id === suggestion.placeId);
        onResolve(picked || results[0] || null, { label: suggestion.label, kind: suggestion.kind });
        return;
      }
      if (results.length <= 1) {
        onResolve(results[0] || null, { label: suggestion.label, kind: suggestion.kind });
        return;
      }
      // Defensive fallback for any other scenario that returns multiple
      // candidates without the results list having already disambiguated them.
      setBranches(results);
      setBranchQueryLabel(suggestion.label);
      setPhase("branches");
    } catch {
      onResolve(null);
    }
  };

  const handleManualFallback = () => onResolve(null);

  // Not on Google Maps under this name — clear the query and hand focus
  // straight back to the bar so pivoting to a fresh area search feels like a
  // continuation of the same search, not a dead end.
  const handleSearchAreaInstead = () => {
    setQuery("");
    setPhase("idle");
    setSuggestions([]);
    setFallbackAreas([]);
    inputRef.current?.focus();
  };

  const showNoMatch = phase === "results" && suggestions.length === 0;

  return (
    <div className="search-panel">
      <div className="inline-search-row">
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
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
        </div>
        <button type="button" className="primary-btn search-cta" disabled={!canSearch || phase === "searching"} onClick={handleSearch}>
          {phase === "searching" ? "Searching…" : "Search"}
        </button>
      </div>

      {phase === "resolving" && <p className="muted search-loading">Fetching address…</p>}

      {phase === "results" && suggestions.length > 0 && (
        <div className="suggestion-list">
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
      )}

      {showNoMatch && (
        <>
          <p className="no-match-note">
            We couldn&rsquo;t find &ldquo;{query}&rdquo; on Google Maps under that name. Try one of these nearby
            areas instead:
          </p>
          <div className="suggestion-list">
            {fallbackAreas.map((s) => (
              <button key={s.key} type="button" className="suggestion-item" onClick={() => resolveEntry(s)}>
                <span className="suggestion-icon" aria-hidden="true">
                  📍
                </span>
                <span className="suggestion-label">{s.label}</span>
                <span className="chip">Area</span>
              </button>
            ))}
          </div>
          <button type="button" className="search-area-cta" onClick={handleSearchAreaInstead}>
            📍 Search a different area
          </button>
        </>
      )}

      {phase === "branches" && (
        <div className="suggestion-list">
          <button type="button" className="link-btn" onClick={() => setPhase("idle")}>
            ← Back to search
          </button>
          <p className="muted">Select your office — {branchQueryLabel}</p>
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

      {showManualLink && (
        <button type="button" className="link-btn manual-entry-link" onClick={handleManualFallback}>
          + Enter address manually
        </button>
      )}
    </div>
  );
}
