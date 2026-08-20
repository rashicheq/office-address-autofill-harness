import { useState } from "react";
import CompanyDetailsView from "./CompanyDetailsView.jsx";
import OfficeSearchPanel from "./OfficeSearchPanel.jsx";
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
//
// Exactly two screens (2026-08 correction): Career Info's Company Details
// screen, then this address page - full stop. There's no separate
// search-only step or screen in between; the Search action (OfficeSearchPanel.jsx)
// lives inline, right beside the "Selected location" field below, on this
// same screen. Nothing is looked up until Search is clicked (or Enter
// pressed); that's the moment the mocked Places Autocomplete call fires (no
// key set up yet, see GET /suggest). A genuine no-match still isn't a dead
// end — the backend always returns a few random nearby-area suggestions
// alongside the (empty) real results. "Selected location" doubles as both
// the search query box (pre-filled with the Career Info company name) and
// the display of whatever's been resolved - there's no separate manual-entry
// mode either: an unresolved form IS the manual-entry state, so typing
// straight into the fields below always works, with or without ever
// touching Search.
//
// Address fields: the backend's tier/drop/shorten rules engine still isn't
// what drives this screen — lib/addressLineConfig.js is. As of the 2026-08
// "rules script" rewrite, THAT config no longer joins specific typed
// component types either: it strips whatever's already captured as City/
// State/Pincode out of Google's own formattedAddress string, then splits
// whatever's left at comma boundaries into Address Line 1/2/3 (the element
// carrying a real plot/building number anchors Line 1; see that file for
// the full rule set). This is a reversal of the earlier "Address Line 1 is
// never auto-filled" rule (OQ-3, resolved 2026-08) — Line 1 now arrives
// pre-filled same as Line 2/3, a deliberate instruction this round, not an
// oversight. It's still the one field that stays editable once the rest
// lock (see `fieldsReadOnly` below) — `hasNumberInLine1` just says whether
// the rules script actually found a number to anchor it on, so the hint
// text can nudge a manual add when it didn't (rather than a silent guess).
//
// Confidence score, FiltersApplied, and the old structured fields still
// exist and still compute in formattingPipeline.js — that's Dev Mode's
// diagnostic view now, not what ships here.
//
// Field editability (2026-08 Places-Autocomplete-prefill PRD): once a
// result comes from a Places pick (hasResolved), every field it populated
// - Line 2/3, Pincode, City/District, State - is read-only; Address Line 1
// is the only thing the user can type. Before anything resolves, every
// field (including city/state) is a normal editable input - see
// `fieldsReadOnly` below.
export default function UserModeView({ dataSource, liveApiConfigured }) {
  const [step, setStep] = useState("company"); // "company" | "address"
  const [officeName, setOfficeName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  // Only meaningful once hasResolved is true - see handleSearchResolve.
  // Defaults true so the "add a number" nudge doesn't show before anything
  // has actually resolved.
  const [hasNumberInLine1, setHasNumberInLine1] = useState(true);
  const [hasResolved, setHasResolved] = useState(false);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [confirmed, setConfirmed] = useState(false);
  const [isAreaPick, setIsAreaPick] = useState(false);

  const isBlocked = dataSource === "live" && !liveApiConfigured;

  const handleCompanyDetailsContinue = ({ companyName }) => {
    setOfficeName(companyName);
    // Pre-fills "Selected location" with the Career Info company name, same
    // as the search box it doubles as always used to arrive pre-filled.
    setSelectedLocation(companyName);
    setAddressLine1("");
    setHasNumberInLine1(true);
    setStep("address");
    setConfirmed(false);
    setIsAreaPick(false);
    setFields(EMPTY_FIELDS);
    setHasResolved(false);
  };

  const handleBackToCompanyDetails = () => {
    setStep("company");
    setHasResolved(false);
    setConfirmed(false);
    setIsAreaPick(false);
    setSelectedLocation("");
    setAddressLine1("");
    setHasNumberInLine1(true);
    setFields(EMPTY_FIELDS);
  };

  // Only ever called with an actual picked result now - there's no more
  // "resolve to null" path, since there's no manual-entry mode distinct
  // from "nothing picked yet" to fall into.
  const handleSearchResolve = (result, meta) => {
    setConfirmed(false);
    setSelectedLocation(result.name || "");
    const built = buildAddressLines(result.addressComponents, result.rawFormattedAddress);
    setAddressLine1(built.addressLine1);
    setHasNumberInLine1(built.hasNumberInLine1);
    setFields({
      addressLine2: built.addressLine2,
      addressLine3: built.addressLine3,
      cityDistrict: built.cityDistrict,
      state: built.state,
      pincode: built.pincode,
    });
    setIsAreaPick(meta?.kind === "area");
    setHasResolved(true);
  };

  const updateField = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const header = HEADER_COPY[step];
  const canConfirm = addressLine1.trim().length > 0;
  // Fields populated from a Places pick are locked - only Address Line 1
  // is ever user-entered in that case. Before anything resolves there is no
  // Places data to protect, so every field (including city/state) is a
  // normal input.
  const fieldsReadOnly = hasResolved;

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

            {!isBlocked && (
              <div className="address-editor">
                <h3>{hasResolved ? "Confirm your address" : "Enter your office address"}</h3>
                <p className="editor-hint">
                  {fieldsReadOnly
                    ? hasNumberInLine1
                      ? "Every field below came from your selected location — Address Line 1 is still yours to adjust if needed."
                      : "Every field below came from your selected location — Address Line 1 didn't come with a building/floor number, so add one before continuing."
                    : "Search for your office below, or fill in every field yourself."}
                </p>

                <OfficeSearchPanel
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  dataSource={dataSource}
                  onResolve={handleSearchResolve}
                />

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
                <p className={fieldsReadOnly && !hasNumberInLine1 ? "field-hint field-hint-warn" : "field-hint"}>
                  {fieldsReadOnly
                    ? hasNumberInLine1
                      ? "Pre-filled from your selected location — always yours to edit."
                      : "No building/floor number came through — add one here."
                    : "Always yours to fill in — add your floor number, building, or tower name here."}
                </p>

                <label className="field">
                  Address Line 2
                  <input
                    value={fields.addressLine2}
                    onChange={(e) => updateField("addressLine2", e.target.value)}
                    disabled={fieldsReadOnly}
                  />
                </label>
                <label className="field">
                  Address Line 3
                  <input
                    value={fields.addressLine3}
                    onChange={(e) => updateField("addressLine3", e.target.value)}
                    disabled={fieldsReadOnly}
                  />
                </label>

                <label className="field">
                  Office Pin Code
                  <input
                    value={fields.pincode}
                    onChange={(e) => updateField("pincode", e.target.value)}
                    disabled={fieldsReadOnly}
                  />
                </label>

                {fields.cityDistrict && fields.state && (
                  <p className="pincode-confirm">
                    <span aria-hidden="true">✓</span> {fields.cityDistrict}, {fields.state}
                  </p>
                )}

                <div className="field-row">
                  <label className="field">
                    City/District
                    <input
                      value={fields.cityDistrict}
                      onChange={(e) => updateField("cityDistrict", e.target.value)}
                      disabled={fieldsReadOnly}
                    />
                  </label>
                  <label className="field">
                    State
                    <input
                      value={fields.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      disabled={fieldsReadOnly}
                    />
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
    </div>
  );
}
