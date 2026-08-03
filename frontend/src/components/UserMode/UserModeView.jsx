import { useState } from "react";
import CompanyDetailsView from "./CompanyDetailsView.jsx";
import AddressCard from "./AddressCard.jsx";
import OfficeMapSheet from "./OfficeMapSheet.jsx";

const EMPTY_FIELDS = {
  pincode: "",
  officeFloorTower: "",
  officeBlockBuilding: "",
  areaLocality: "",
  cityDistrict: "",
  state: "",
};

function fieldsFromResult(result) {
  return {
    pincode: result.pincode || "",
    officeFloorTower: result.officeFloorTower || "",
    officeBlockBuilding: result.officeBlockBuilding || "",
    areaLocality: result.areaLocality || "",
    cityDistrict: result.cityDistrict || "",
    state: result.state || "",
  };
}

const HEADER_COPY = {
  company: { title: "Add your company details", subtitle: "To know your professional side a little better" },
  address: { title: "Add your office address", subtitle: "To verify your employment details" },
};

// Replicates the attached Figma screens: Career Info's own first screen
// (company name / designation / work email / years of experience) submits
// straight into the office-address screen, auto-fetching against the
// company name just entered — matching "on submit of this page show office
// address page wherein we show office address based on the google API
// fetch" (Rashi, 2026-08). The office-address screen itself keeps the
// selectable address list -> "Add a Different Address" free-type escape
// hatch, plus the map-assisted pin-confirm step. Every pre-filled field
// stays editable (PRD cross-cutting rule: auto-fill is a starting point,
// never a locked value) — confidence score, FiltersApplied, and
// ranking_method are deliberately NOT shown here; that's Dev Mode's job.
export default function UserModeView({ searchState, dataSource, liveApiConfigured }) {
  const { response, loading, error, runSearch } = searchState;
  const [step, setStep] = useState("company"); // "company" | "address"
  const [officeName, setOfficeName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [showManual, setShowManual] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [sparseNotice, setSparseNotice] = useState(false);
  const [showMapSheet, setShowMapSheet] = useState(false);

  const isBlocked = dataSource === "live" && !liveApiConfigured;

  const runOfficeSearch = async (name) => {
    if (!name.trim() || isBlocked) return;
    setHasSearched(true);
    setSelectedId(null);
    setShowManual(false);
    setConfirmed(false);
    setSparseNotice(false);
    setFields(EMPTY_FIELDS);
    await runSearch({ officeName: name });
  };

  const handleCompanyDetailsContinue = ({ companyName }) => {
    setOfficeName(companyName);
    setStep("address");
    runOfficeSearch(companyName);
  };

  const handleBackToCompanyDetails = () => {
    setStep("company");
    setHasSearched(false);
    setSelectedId(null);
    setShowManual(false);
    setConfirmed(false);
    setSparseNotice(false);
    setFields(EMPTY_FIELDS);
  };

  const applyResult = (result) => {
    setFields(fieldsFromResult(result));
    setSparseNotice(Boolean(result.sparseData));
  };

  const handleSelect = (result) => {
    setSelectedId(result.place_id);
    setShowManual(false);
    setConfirmed(false);
    applyResult(result);
  };

  const handleManualStart = () => {
    setShowManual(true);
    setSelectedId(null);
    setConfirmed(false);
    setSparseNotice(false);
    setFields(EMPTY_FIELDS);
  };

  const handleBackToResults = () => {
    setShowManual(false);
    setSelectedId(null);
    setConfirmed(false);
    setSparseNotice(false);
    setFields(EMPTY_FIELDS);
  };

  const updateField = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleMapConfirm = (result) => {
    setShowMapSheet(false);
    if (!result) return;
    setSelectedId(result.place_id);
    setShowManual(false);
    setConfirmed(false);
    applyResult(result);
  };

  // TC-4 (can't be made compliant) routes to the same empty-state / manual-
  // entry UX as TC-3 (no match) -- filtering it out here is what unifies them,
  // no special-casing needed.
  const results = (response?.results || []).filter((r) => !r.requiresManualEntry);
  const showResultsArea = step === "address" && hasSearched && !isBlocked && !loading;
  const showEditor = Boolean(selectedId) || showManual;
  const header = HEADER_COPY[step];

  return (
    <div className="user-mode">
      <div className="phone-frame">
        <div className="onboarding-header">
          <div className="onboarding-header-row">
            <span
              className={step === "address" ? "icon-btn icon-btn-active" : "icon-btn"}
              aria-hidden={step !== "address"}
              role={step === "address" ? "button" : undefined}
              tabIndex={step === "address" ? 0 : undefined}
              onClick={step === "address" ? handleBackToCompanyDetails : undefined}
              onKeyDown={(e) => step === "address" && (e.key === "Enter" || e.key === " ") && handleBackToCompanyDetails()}
            >
              ←
            </span>
            <span className="icon-btn" aria-hidden="true">
              ?
            </span>
          </div>
          <h1>{header.title}</h1>
          <p className="onboarding-subtitle">{header.subtitle}</p>
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

        {step === "company" && <CompanyDetailsView onContinue={handleCompanyDetailsContinue} />}

        {step === "address" && (
          <div className="onboarding-card">
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

            {loading && <p className="muted">Fetching office address for &ldquo;{officeName}&rdquo;…</p>}

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

                <div className="office-name-row">
                  <label className="field office-name-field">
                    Office name
                    <input value={officeName} onChange={(e) => setOfficeName(e.target.value)} />
                  </label>
                  <button type="button" className="secondary-btn" onClick={() => setShowMapSheet(true)}>
                    Search on map
                  </button>
                </div>

                {sparseNotice && (
                  <div className="notice notice-blocked">
                    We could only find an approximate area for this office — please fill in Office Floor/Tower and
                    Office Block/Building Name yourself below.
                  </div>
                )}

                <label className="field">
                  Office Pin Code
                  <input value={fields.pincode} onChange={(e) => updateField("pincode", e.target.value)} />
                </label>

                {fields.cityDistrict && fields.state && (
                  <p className="pincode-confirm">
                    <span aria-hidden="true">✓</span> {fields.cityDistrict}, {fields.state}
                  </p>
                )}

                <label className="field">
                  Office Floor / Tower
                  <input
                    value={fields.officeFloorTower}
                    onChange={(e) => updateField("officeFloorTower", e.target.value)}
                  />
                </label>
                <label className="field">
                  Office Block / Building Name
                  <input
                    value={fields.officeBlockBuilding}
                    onChange={(e) => updateField("officeBlockBuilding", e.target.value)}
                  />
                </label>
                <label className="field">
                  Area/Locality
                  <input value={fields.areaLocality} onChange={(e) => updateField("areaLocality", e.target.value)} />
                </label>

                <div className="field-row">
                  <label className="field">
                    City/District
                    <input value={fields.cityDistrict} disabled />
                  </label>
                  <label className="field">
                    State
                    <input value={fields.state} disabled />
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
        )}
      </div>

      {showMapSheet && (
        <OfficeMapSheet
          officeName={officeName}
          candidates={response?.results || []}
          onConfirm={handleMapConfirm}
          onClose={() => setShowMapSheet(false)}
        />
      )}
    </div>
  );
}
