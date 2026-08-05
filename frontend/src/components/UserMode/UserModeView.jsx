import { useState } from "react";
import CompanyDetailsView from "./CompanyDetailsView.jsx";
import OfficeSearchSheet from "./OfficeSearchSheet.jsx";

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

// Replicates the attached Figma screens and Rashi's 2026-08 flow correction:
// Career Info's Company Details screen submits straight into a full-page
// search sheet (office name pre-filled, "like Google Maps' search bar but
// without the map view" — no Maps JS/Autocomplete key set up yet, so
// suggestions are mocked against the fixture set, see OfficeSearchSheet.jsx
// and backend GET /suggest). Selecting a specific office runs the rules
// script against its real (mock/live) data; selecting a general area only
// fills Area/Locality — Office Floor/Tower and Office Block/Building Name
// stay blank for manual entry, same as any other thin-data result (the
// sparse-data rule already does this, unchanged). Every pre-filled field
// stays editable (PRD cross-cutting rule) — confidence score,
// FiltersApplied, and ranking_method are deliberately NOT shown here;
// that's Dev Mode's job.
export default function UserModeView({ dataSource, liveApiConfigured }) {
  const [step, setStep] = useState("company"); // "company" | "address"
  const [officeName, setOfficeName] = useState("");
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [hasResolved, setHasResolved] = useState(false);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [showManual, setShowManual] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [sparseNotice, setSparseNotice] = useState(false);

  const isBlocked = dataSource === "live" && !liveApiConfigured;

  const handleCompanyDetailsContinue = ({ companyName }) => {
    setOfficeName(companyName);
    setStep("address");
    setHasResolved(false);
    setShowManual(false);
    setConfirmed(false);
    setFields(EMPTY_FIELDS);
    if (!isBlocked) setShowSearchSheet(true);
  };

  const handleBackToCompanyDetails = () => {
    setStep("company");
    setShowSearchSheet(false);
    setHasResolved(false);
    setShowManual(false);
    setConfirmed(false);
    setSparseNotice(false);
    setFields(EMPTY_FIELDS);
  };

  const handleSheetResolve = (result) => {
    setShowSearchSheet(false);
    setConfirmed(false);
    if (!result) {
      // No match, or the user chose to skip straight to manual entry -
      // never a dead end, just an empty editable form (TC-3/TC-4 path).
      setShowManual(true);
      setHasResolved(false);
      setSparseNotice(false);
      setFields(EMPTY_FIELDS);
      return;
    }
    // Office name is Career Info context (the company you work for) - it
    // stays fixed regardless of which specific office/area you pick for it,
    // so re-opening the search sheet always starts back from that same
    // context rather than drifting toward whatever was picked last.
    setFields(fieldsFromResult(result));
    setSparseNotice(Boolean(result.sparseData));
    setHasResolved(true);
    setShowManual(false);
  };

  const handleManualStart = () => {
    setShowManual(true);
    setHasResolved(false);
    setConfirmed(false);
    setSparseNotice(false);
    setFields(EMPTY_FIELDS);
  };

  const updateField = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const showEditor = hasResolved || showManual;
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

            {!isBlocked && !showEditor && (
              <div className="empty-state">
                <p>Looking for the office address for &ldquo;{officeName}&rdquo;.</p>
                <button type="button" className="primary-btn" onClick={() => setShowSearchSheet(true)}>
                  Search location
                </button>
                <button type="button" className="link-btn add-different" onClick={handleManualStart}>
                  + Enter address manually
                </button>
              </div>
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
                  <button type="button" className="secondary-btn" onClick={() => setShowSearchSheet(true)}>
                    Change location
                  </button>
                </div>

                {sparseNotice && (
                  <div className="notice notice-blocked">
                    We could only find the general area for this office — please fill in Office Floor/Tower and
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
                </div>
                {confirmed && (
                  <p className="confirmed-note">✓ Address confirmed (test harness — no further step).</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showSearchSheet && (
        <OfficeSearchSheet
          officeName={officeName}
          dataSource={dataSource}
          onResolve={handleSheetResolve}
          onClose={() => setShowSearchSheet(false)}
        />
      )}
    </div>
  );
}
