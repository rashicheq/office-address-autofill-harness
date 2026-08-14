import { useRef, useState } from "react";
import { fetchSuggestions, search as runSearch } from "../../api/client.js";

const MIN_QUERY_LENGTH = 3;

// Office/area search, inline within the address page's own form (2026-08
// correction: no separate search screen or step at all - just two screens
// in the whole flow, Career Info then Address Info). This renders the
// Search button that sits beside the "Selected location" field - the caller
// owns that field's text (`value`/`onChange`) since it doubles as both the
// search query box and the display of whatever's been resolved - and, when
// there's something to show, the results/no-match/fallback-areas list
// directly underneath it. Nothing is looked up until Search is clicked (or
// Enter pressed), mocking the moment a real Places Autocomplete call would
// fire. Multi-branch companies (e.g. Vantage Corp, TC-1) show every branch
// as its own row directly in the results list, closest first via the same
// ranker used everywhere else - picking one resolves straight to it, no
// second picker screen. A genuine no-match still isn't a dead end: the
// backend always includes a few random nearby-area suggestions
// (`fallbackAreas`) alongside the real (empty) results.
export default function OfficeSearchPanel({ value, onChange, dataSource, onResolve }) {
  const [phase, setPhase] = useState("idle"); // "idle" | "searching" | "results"
  const [suggestions, setSuggestions] = useState([]);
  const [fallbackAreas, setFallbackAreas] = useState([]);
  const inputRef = useRef(null);

  const canSearch = value.trim().length >= MIN_QUERY_LENGTH;

  const handleChange = (next) => {
    onChange(next);
    // Editing the text invalidates whatever was last searched for - don't
    // keep showing results for a query that no longer matches the box.
    if (phase === "results") setPhase("idle");
  };

  const handleSearch = async () => {
    if (!canSearch) return;
    setPhase("searching");
    try {
      const data = await fetchSuggestions(value.trim());
      setSuggestions(data.suggestions || []);
      setFallbackAreas(data.fallbackAreas || []);
    } catch {
      setSuggestions([]);
      setFallbackAreas([]);
    }
    setPhase("results");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  // suggestion.kind / suggestion.label travel back to the caller as `meta`
  // so it can tell "an area was picked" apart from "an office was picked"
  // without guessing from the result shape alone.
  const resolveEntry = async (suggestion) => {
    try {
      const data = await runSearch({ officeName: suggestion.label, dataSource, scenario: suggestion.key });
      const results = (data.results || []).filter((r) => !r.requiresManualEntry);
      // Every suggestion row already carries a specific placeId once there's
      // more than one candidate (TC-1's per-branch rows) - resolve straight
      // to that exact one. Otherwise there's only ever one result to begin
      // with. Either way: no intermediate "select your office" screen.
      const picked = suggestion.placeId ? results.find((r) => r.place_id === suggestion.placeId) : results[0];
      if (picked) {
        onResolve(picked, { label: suggestion.label, kind: suggestion.kind });
        setPhase("idle");
      }
    } catch {
      // Swallow - stays on the results list, nothing to resolve to.
    }
  };

  // Not on Google Maps under this name - clear the box and hand focus
  // straight back to it so pivoting to a fresh area search feels like a
  // continuation of the same search, not a dead end.
  const handleSearchAreaInstead = () => {
    onChange("");
    setPhase("idle");
    setSuggestions([]);
    setFallbackAreas([]);
    inputRef.current?.focus();
  };

  const showNoMatch = phase === "results" && suggestions.length === 0;

  return (
    <>
      <div className="office-name-row">
        <label className="field office-name-field">
          Selected location
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. your company or building name"
          />
        </label>
        <button type="button" className="secondary-btn" disabled={!canSearch || phase === "searching"} onClick={handleSearch}>
          {phase === "searching" ? "Searching…" : "Search"}
        </button>
      </div>

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
            We couldn&rsquo;t find &ldquo;{value}&rdquo; on Google Maps under that name. Try one of these nearby
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
    </>
  );
}
