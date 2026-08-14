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
// Search (2026-08 correction — no more bottom sheet): Career Info's Company
// Details screen submits straight to this address page, which opens on an
// inline search panel (OfficeSearchPanel.jsx) — a search bar pre-filled with
// the office name plus an explicit Search CTA. Nothing is looked up until
// Search is clicked (or Enter pressed); that's the moment the mocked Places
// Autocomplete call fires (no key set up yet, see GET /suggest). A genuine
// no-match still isn't a dead end — the backend always returns a few random
// nearby-area suggestions alongside the (empty) real results.
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
// area_level_1/postal_code. Confidence score, FiltersApplied, and the old
// structured fields still exist and still compute — that's Dev Mode's
// diagnostic view now, not what ships here.
//
// Field editability (2026-08 Places-Autocomplete-prefill PRD): once a
// result comes from a Places pick (hasResolved), every field it populated
// - Line 2/3, Pincode, City/District, State - is read-only; Address Line 1
// is the only thing the user can type. In full manual entry (showManual,
// no Places data exists at all) every field, including city/state, is a
// normal editable input instead - see `fieldsReadOnly` below.
//
// "Selected location" (2026-08, Rashi): the confirm screen's top field no
// longer echoes back `officeName` (the Career Info company name) - it shows
// `selectedLocation`, the actual Places result's own name (e.g. "CheQ
// Digital Private Limited", "Vantage Corp (Koramangala Branch)", or an
// area's own name like "Koramangala, Bengaluru"), since that's the thing
// worth verifying against, not the original search query. `officeName`
// still exists internally - it seeds the search panel's initial query - it
// just isn't rendered as its own row here anymore.
export default function UserModeView({ dataSource, liveApiConfigured }) {
  const [step, setStep] = useState("company"); // "company" | "address"
  const [officeName, setOfficeName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [searchSeed, setSearchSeed] = useState("");
  const [hasResolved, setHasResolved] = useState(false);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [showManual, setShowManual] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isAreaPick, setIsAreaPick] = useState(false);

  const isBlocked = dataSource === "live" && !liveApiConfigured;

  // Office name has no on-screen re-search action of its own (it isn't
  // rendered as a field at all anymore - see the "Selected location" note
  // above); it only lives on as the seed for the very first search. Area
  // still gets its own "Search area" button that re-seeds the search panel
  // with whichever area is currently selected (see handleSearchResolve for
  // how area vs. office picks are told apart). Either path switches the
  // page back to the search panel - hasResolved/showManual both go false
  // until the next thing resolves.
  const startSearch = (seed) => {
    setSearchSeed(seed);
    setHasResolved(false);
    setShowManual(false);
  };

  const handleCompanyDetailsContinue = ({ companyName }) => {
    setOfficeName(companyName);
    setSelectedLocation("");
    setAreaLabel("");
    setAddressLine1("");
    setStep("address");
    setConfirmed(false);
    setFields(EMPTY_FIELDS);
    if (!isBlocked) startSearch(companyName);
  };

  const handleBackToCompanyDetails = () => {
    setStep("company");
    setHasResolved(false);
    setShowManual(false);
    setConfirmed(false);
    setIsAreaPick(false);
    setSelectedLocation("");
    setAreaLabel("");
    setAddressLine1("");
    setFields(EMPTY_FIELDS);
  };

  const handleSearchResolve = (result, meta) => {
    setConfirmed(false);
    if (!result) {
      // No match, or the user chose to skip straight to manual entry -
      // never a dead end, just an empty editable form (TC-3/TC-4 path).
      // Address Line 1 is left untouched here too - if the user had already
      // typed something before pivoting to manual, there's no reason to
      // throw it away. Selected location IS cleared, though - it's derived
      // from a Places pick, and there's no pick to derive it from here.
      setShowManual(true);
      setHasResolved(false);
      setIsAreaPick(false);
      setSelectedLocation("");
      setAreaLabel("");
      setFields(EMPTY_FIELDS);
      return;
    }
    // Office name is Career Info context (the company you work for) - kept
    // internally to re-seed the search panel, but no longer shown on this
    // screen (Rashi, 2026-08): the confirm screen shows the actual place the
    // user picked instead, since that's more useful to verify against than
    // echoing back the original search query. Address Line 1 is independent,
    // user-owned state - a location pick only ever touches Line 2/3 +
    // city/state/pincode + selectedLocation, never Line 1, so re-searching
    // never throws away floor/building detail the user already typed.
    setSelectedLocation(result.name || "");
    setFields(buildAddressLines(result.addressComponents));
    setIsAreaPick(meta?.kind === "area");
    setAreaLabel(meta?.kind === "area" ? meta?.label || "" : "");
    setHasResolved(true);
    setShowManual(false);
  };

  const updateField = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const showEditor = hasResolved || showManual;
  // The search panel stays available for as long as nothing has actually
  // resolved yet - including through manual entry - so choosing "Enter
  // address manually" is a fork you can still search your way back out of,
  // never a dead end you're stuck in once you've picked it (2026-08).
  const showSearchPanel = !isBlocked && !hasResolved;
  const header = HEADER_COPY[step];
  const canConfirm = addressLine1.trim().length > 0;
  // Fields populated from a Places pick are locked - only Address Line 1
  // is ever user-entered in that case. In full manual entry there is no
  // Places data to protect, so every field (including city/state, which
  // Places-driven results never let the user touch) is a normal input.
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

            {showSearchPanel && (
              <OfficeSearchPanel
                initialQuery={searchSeed}
                dataSource={dataSource}
                onResolve={handleSearchResolve}
                showManualLink={!showManual}
              />
            )}

            {showEditor && (
              <div className="address-editor">
                <h3>{showManual ? "Enter your office address" : "Confirm your address"}</h3>
                <p className="editor-hint">
                  {fieldsReadOnly
                    ? "Address Line 1 is yours to fill in — the rest came from your selected location and can't be edited here."
                    : "No location selected yet — every field below is yours to fill in."}
                </p>

                <label className="field">
                  Selected location
                  <input
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    placeholder="e.g. your company or building name"
                  />
                </label>

                {isAreaPick && (
                  <div className="office-name-row">
                    <label className="field office-name-field">
                      Area
                      <input value={areaLabel} onChange={(e) => setAreaLabel(e.target.value)} />
                    </label>
                    <button type="button" className="secondary-btn" onClick={() => startSearch(areaLabel)}>
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
