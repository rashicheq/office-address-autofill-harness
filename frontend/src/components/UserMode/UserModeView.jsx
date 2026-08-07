import { useState } from "react";
import CompanyDetailsView from "./CompanyDetailsView.jsx";
import OfficeSearchSheet from "./OfficeSearchSheet.jsx";
import { buildAddressLines } from "../../lib/addressLineConfig.js";

const EMPTY_FIELDS = {
  addressLine2: "",
  addressLine3: "",
  cityDistrict: "",
  state: "",
  pincode: "",
};

const HEADER_COPY = {
  company: { title: "Add your company details", subtitle: "To know your professional side a little better" },
  address: { title: "Add your office address", subtitle: "To verify your employment details" },
};

// Replicates the attached Figma screens and Rashi's 2026-08 flow corrections.
// Career Info's Company Details screen submits straight into a full-page
// search sheet (office name pre-filled, "like Google Maps' search bar but
// without the map view" — no Maps JS/Autocomplete key set up yet, so
// suggestions are mocked against the fixture set, see OfficeSearchSheet.jsx
// and backend GET /suggest).
//
// Address fields (2026-08 "frontend config" pivot): the backend's
// tier/drop/shorten rules engine no longer drives what this screen shows —
// Address Line 2/3 are built directly from the raw Google-typed components
// via lib/addressLineConfig.js (subpremise+premise+street_number → Line 2,
// route → Line 3). Address Line 1 is NEVER auto-filled, by design, for any
// result — found, not-found, or multi-branch — the user always types it
// (floor/building detail), and it stays independent of whichever
// office/area is picked, same as officeName. City/District, State, and
// Pincode are still simple direct passthroughs of locality/administrative_
// area_level_1/postal_code, unchanged. Confidence score, FiltersApplied,
// and the old structured fields still exist and still compute — that's
// Dev Mode's diagnostic view now, not what ships here.
export default function UserModeView({ dataSource, liveApiConfigured }) {
  const [step, setStep] = useState("company"); // "company" | "address"
  const [officeName, setOfficeName] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [sheetSeed, setSheetSeed] = useState("");
  const [hasResolved, setHasResolved] = useState(false);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [showManual, setShowManual] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isAreaPick, setIsAreaPick] = useState(false);

  const isBlocked = dataSource === "live" && !liveApiConfigured;

  // Office name is a plain editable field once resolved - no re-search
  // action of its own. Area still gets a "Search area" button that reopens
  // the sheet seeded with whichever area is currently selected, and the
  // very first search (before anything is resolved) seeds from the office
  // name (see handleSheetResolve for how area vs. office picks are told
  // apart).
  const openSheetFor = (seed) => {
    setSheetSeed(seed);
    setShowSearchSheet(true);
  };

  const handleCompanyDetailsContinue = ({ companyName }) => {
    setOfficeName(companyName);
    setAreaLabel("");
    setAddressLine1("");
    setStep("address");
    setHasResolved(false);
    setShowManual(false);
    setConfirmed(false);
    setFields(EMPTY_FIELDS);
    if (!isBlocked) openSheetFor(companyName);
  };

  const handleBackToCompanyDetails = () => {
    setStep("company");
    setShowSearchSheet(false);
    setHasResolved(false);
    setShowManual(false);
    setConfirmed(false);
    setIsAreaPick(false);
    setAreaLabel("");
    setAddressLine1("");
    setFields(EMPTY_FIELDS);
  };

  const handleSheetResolve = (result, meta) => {
    setShowSearchSheet(false);
    setConfirmed(false);
    if (!result) {
      // No match, or the user chose to skip straight to manual entry -
      // never a dead end, just an empty editable form (TC-3/TC-4 path).
      // Address Line 1 is left untouched here too - if the user had already
      // typed something before pivoting to manual, there's no reason to
      // throw it away.
      setShowManual(true);
      setHasResolved(false);
      setIsAreaPick(false);
      setAreaLabel("");
      setFields(EMPTY_FIELDS);
      return;
    }
    // Office name is Career Info context (the company you work for) - it
    // stays fixed regardless of which specific office/area you pick for it.
    // Address Line 1 is the same kind of independent, user-owned state - a
    // location pick only ever touches Line 2/3 + city/state/pincode, never
    // Line 1, so re-searching never throws away floor/building detail the
    // user already typed.
    setFields(buildAddressLines(result.addressComponents));
    setIsAreaPick(meta?.kind === "area");
    setAreaLabel(meta?.kind === "area" ? meta?.label || "" : "");
    setHasResolved(true);
    setShowManual(false);
  };

  const handleManualStart = () => {
    setShowManual(true);
    setHasResolved(false);
    setConfirmed(false);
    setIsAreaPick(false);
    setAreaLabel("");
    setFields(EMPTY_FIELDS);
  };

  const updateField = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const showEditor = hasResolved || showManual;
  const header = HEADER_COPY[step];
  const canConfirm = addressLine1.trim().length > 0;

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
                <button type="button" className="primary-btn" onClick={() => openSheetFor(officeName)}>
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

                <label className="field">
                  Office name
                  <input value={officeName} onChange={(e) => setOfficeName(e.target.value)} />
                </label>

                {isAreaPick && (
                  <div className="office-name-row">
                    <label className="field office-name-field">
                      Area
                      <input value={areaLabel} onChange={(e) => setAreaLabel(e.target.value)} />
                    </label>
                    <button type="button" className="secondary-btn" onClick={() => openSheetFor(areaLabel)}>
                      Search area
                    </button>
                  </div>
                )}

                {isAreaPick && (
                  <div className="notice notice-blocked">
                    We could only find the general area for this office — Address Line 2 and 3 may be
                    incomplete. Add the exact floor, building, or tower in Address Line 1 below.
                  </div>
                )}

                <label className="field">
                  Address Line 1
                  <input
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="e.g. 2nd Floor, Tower B"
                  />
                </label>
                <p className="field-hint">
                  Always yours to fill in — add your floor number, building, or tower name here.
                </p>

                <label className="field">
                  Address Line 2
                  <input value={fields.addressLine2} onChange={(e) => updateField("addressLine2", e.target.value)} />
                </label>
                <label className="field">
                  Address Line 3
                  <input value={fields.addressLine3} onChange={(e) => updateField("addressLine3", e.target.value)} />
                </label>

                <label className="field">
                  Office Pin Code
                  <input value={fields.pincode} onChange={(e) => updateField("pincode", e.target.value)} />
                </label>

                {fields.cityDistrict && fields.state && (
                  <p className="pincode-confirm">
                    <span aria-hidden="true">✓</span> {fields.cityDistrict}, {fields.state}
                  </p>
                )}

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
                  <button type="button" className="primary-btn" disabled={!canConfirm} onClick={() => setConfirmed(true)}>
                    Confirm and Continue
                  </button>
                </div>
                {!canConfirm && <p className="field-hint field-hint-warn">Add Address Line 1 to continue.</p>}
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
          initialQuery={sheetSeed}
          dataSource={dataSource}
          onResolve={handleSheetResolve}
          onClose={() => setShowSearchSheet(false)}
        />
      )}
    </div>
  );
}
