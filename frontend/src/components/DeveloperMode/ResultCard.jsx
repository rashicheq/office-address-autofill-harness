import ConfidenceBreakdown from "./ConfidenceBreakdown.jsx";

const FIELD_LABELS = [
  ["officeFloorTower", "Office Floor/Tower"],
  ["officeBlockBuilding", "Office Block/Building Name"],
  ["areaLocality", "Area/Locality"],
  ["cityDistrict", "City/District"],
  ["state", "State"],
  ["pincode", "Pincode"],
];

// Shared by Developer Mode's single-search results and the batch runner's
// expanded rows, so both stay in sync with one definition of "what a result
// looks like" instead of two copies drifting apart.
export default function ResultCard({ result }) {
  const r = result;
  return (
    <div className="dev-result-card">
      <div className="dev-result-header">
        <strong>{r.name}</strong>
        {r.distance_km != null && <span className="chip">{r.distance_km} km</span>}
        {r.distance_km == null && <span className="chip chip-warn">no distance (fallback)</span>}
        {r.coworkingAmbiguous && <span className="chip chip-warn">co-working: confirm floor/unit</span>}
        {r.sparseData && <span className="chip chip-warn">sparse data: manual entry needed</span>}
        {r.requiresManualEntry && <span className="chip chip-error">non-compliant → manual entry</span>}
      </div>

      {!r.requiresManualEntry && (
        <div className="dev-result-fields-grid">
          {FIELD_LABELS.map(([key, label]) => (
            <div className="dev-result-field" key={key}>
              <span className="field-label">{label}</span>
              <div>{r[key] || <em>—</em>}</div>
            </div>
          ))}
        </div>
      )}

      {r.FiltersApplied?.length > 0 && (
        <div className="filters-applied">
          {r.FiltersApplied.map((f, i) => (
            <span className="chip chip-filter" key={i}>
              {f}
            </span>
          ))}
        </div>
      )}
      <ConfidenceBreakdown confidence={r.confidence} />
    </div>
  );
}
