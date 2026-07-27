import { useState } from "react";
import AddressCard from "./AddressCard.jsx";

const EMPTY_LINES = ["", "", ""];
const EMPTY_FIELDS = { city: "", state: "", pincode: "" };

// Replicates the attached Figma screens (office-name search -> selectable
// address list -> "Add a Different Address" free-type escape hatch) closely
// enough to feel like the real onboarding step, not a debug tool. Every
// pre-filled field stays editable (PRD cross-cutting rule: auto-fill is a
// starting point, never a locked value) — confidence score, FiltersApplied,
// and ranking_method are deliberately NOT shown here; that's Dev Mode's job.
export default function UserModeView({ searchState, dataSource, liveApiConfigured }) {
  const { response, loading, error, runSearch } = searchState;
  const [officeName, setOfficeName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [lines, setLines] = useState(EMPTY_LINES);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [showManual, setShowManual] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const isBlocked = dataSource === "live" && !liveApiConfigured;

  const handleSearch = async () => {
    if (!officeName.trim() || isBlocked) return;
    setHasSearched(true);
    setSelectedId(null);
    setShowManual(false);
    setConfirmed(false);
    setLines(EMPTY_LINES);
    setFields(EMPTY_FIELDS);
    await runSearch({ officeName });
  };

  const handleSelect = (result) => {
    setSelectedId(result.place_id);
    setShowManual(false);
    setConfirmed(false);
    setLines([
      result.addressLines?.[0] || "",
      result.addressLines?.[1] || "",
      result.addressLines?.[2] || "",
    ]);
    setFields({
      city: result.city || "",
      state: result.state || "",
      pincode: result.pincode || "",
    });
  };

  const handleManualStart = () => {
    setShowManual(true);
    setSelectedId(null);
    setConfirmed(false);
    setLines(EMPTY_LINES);
    setFields(EMPTY_FIELDS);
  };

  const handleBackToResults = () => {
    setShowManual(false);
    setSelectedId(null);
    setConfirmed(false);
    setLines(EMPTY_LINES);
    setFields(EMPTY_FIELDS);
  };

  const updateLine = (index, value) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const updateField = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  // TC-4 (can't be made compliant) routes to the same empty-state / manual-
  // entry UX as TC-3 (no match) -- filtering it out here is what unifies them,
  // no special-casing needed.
  const results = (response?.results || []).filter((r) => !r.requiresManualEntry);
  const showResultsArea = hasSearched && !isBlocked;
  const showEditor = Boolean(selectedId) || showManual;

  return (
    <div className="user-mode">
      <div className="phone-frame">
        <div className="onboarding-header">
          <div className="onboarding-header-row">
            <span className="icon-btn" aria-hidden="true">
              ←
            </span>
            <span className="icon-btn" aria-hidden="true">
              ?
            </span>
          </div>
          <h1>Add your office address</h1>
          <p className="onboarding-subtitle">To verify your employment details</p>
          <div className="stepper">
            <div className="step">
              <span className="step-label done">Personal Info</span>
              <span className="step-bar done" />
            </div>
            <div className="step">
              <span className="step-label done">Contact Info</span>
              <span className="step-bar done" />
            </div>
            <div className="step">
              <span className="step-label current">Career Info</span>
              <span className="step-bar current" />
            </div>
            <div className="step">
              <span className="step-label">Verification</span>
              <span className="step-bar" />
            </div>
          </div>
        </div>

        <div className="onboarding-card">
          <div className="search-row">
            <input
              className="search-input"
              type="text"
              placeholder="Search your office name"
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              disabled={isBlocked}
            />
            <button
              type="button"
              className="primary-btn"
              onClick={handleSearch}
              disabled={isBlocked || loading || !officeName.trim()}
            >
              {loading ? "…" : "Search"}
            </button>
          </div>

          {isBlocked && (
            <div className="notice notice-blocked">
              Requires Google API key setup — add GOOGLE_PLACES_API_KEY to backend/.env.
            </div>
          )}
          {dataSource === "live" && liveApiConfigured && (
            <div className="notice notice-blocked">
              Live API active — this search makes a real, billed call to Google Places.
            </div>
          )}

          {error && !isBlocked && <div className="notice notice-error">{error}</div>}

          {showResultsArea && !showEditor && (
            <>
              <div className="info-banner">
                <span aria-hidden="true">ⓘ</span> This information is collected from Google Places.
              </div>

              {results.length > 0 ? (
                <div className="address-list">
                  {results.map((r) => (
                    <AddressCard
                      key={r.place_id}
                      result={r}
                      selected={selectedId === r.place_id}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No matching office address found for &ldquo;{officeName}&rdquo;.</p>
                </div>
              )}

              <button type="button" className="link-btn add-different" onClick={handleManualStart}>
                + Add a Different Address
              </button>
            </>
          )}

          {showEditor && (
            <div className="address-editor">
              <h3>{showManual ? "Enter your office address" : "Confirm your address"}</h3>
              <p className="editor-hint">Every field stays editable — review before continuing.</p>
              {[0, 1, 2].map((i) => (
                <label className="field" key={i}>
                  Line {i + 1}
                  <input value={lines[i]} onChange={(e) => updateLine(i, e.target.value)} />
                </label>
              ))}
              <div className="field-row">
                <label className="field">
                  City
                  <input value={fields.city} onChange={(e) => updateField("city", e.target.value)} />
                </label>
                <label className="field">
                  State
                  <input value={fields.state} onChange={(e) => updateField("state", e.target.value)} />
                </label>
                <label className="field">
                  Pincode
                  <input value={fields.pincode} onChange={(e) => updateField("pincode", e.target.value)} />
                </label>
              </div>
              <div className="editor-actions">
                <button type="button" className="primary-btn" onClick={() => setConfirmed(true)}>
                  Confirm and Continue
                </button>
                <button type="button" className="link-btn" onClick={handleBackToResults}>
                  Back to search results
                </button>
              </div>
              {confirmed && (
                <p className="confirmed-note">✓ Address confirmed (test harness — no further step).</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
