import { useMemo, useRef, useState } from "react";

// Full-page bottom sheet with a stylized (deliberately NOT Google Maps) map
// view. Rashi's explicit call: show the search -> bottom-sheet -> pin-drop
// capability without calling any real Google Maps/Geocoding API (no key for
// either is set up yet). Pins for existing candidates use their real mock/
// live lat-lng (projected onto a simple 2D canvas); dropping a pin anywhere
// else simulates what a real reverse-geocode would eventually replace, since
// there's no live API to actually resolve it.

const MAP_PADDING_DEG = 0.01; // ~1km of breathing room around the candidate cluster

function computeBounds(points) {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  return {
    minLat: Math.min(...lats) - MAP_PADDING_DEG,
    maxLat: Math.max(...lats) + MAP_PADDING_DEG,
    minLng: Math.min(...lngs) - MAP_PADDING_DEG,
    maxLng: Math.max(...lngs) + MAP_PADDING_DEG,
  };
}

function project(point, bounds) {
  const latSpan = bounds.maxLat - bounds.minLat || 1;
  const lngSpan = bounds.maxLng - bounds.minLng || 1;
  const xPct = ((point.longitude - bounds.minLng) / lngSpan) * 100;
  // Latitude increases northward; y=0 is the top of the div, so invert.
  const yPct = 100 - ((point.latitude - bounds.minLat) / latSpan) * 100;
  return { xPct: Math.min(96, Math.max(4, xPct)), yPct: Math.min(92, Math.max(8, yPct)) };
}

function unproject(xPct, yPct, bounds) {
  const latSpan = bounds.maxLat - bounds.minLat || 1;
  const lngSpan = bounds.maxLng - bounds.minLng || 1;
  const longitude = bounds.minLng + (xPct / 100) * lngSpan;
  const latitude = bounds.minLat + ((100 - yPct) / 100) * latSpan;
  return { latitude, longitude };
}

function synthesizeCustomPinResult({ officeName, latitude, longitude, cityDistrict, state, pincode, landmarkText }) {
  const label = landmarkText ? `Near ${landmarkText} (dropped pin — dummy map, no real geocoding)` : "Dropped pin (dummy map — no real reverse geocoding wired up yet)";
  return {
    place_id: `CUSTOM-PIN-${Math.round(latitude * 1e5)}-${Math.round(longitude * 1e5)}`,
    name: officeName || "Custom pinned location",
    location: { latitude, longitude },
    distance_km: null,
    officeFloorTower: "",
    officeBlockBuilding: "",
    areaLocality: label,
    cityDistrict: cityDistrict || "",
    state: state || "",
    pincode: pincode || "",
    compliant: true,
    requiresManualEntry: false,
    sparseData: true,
    simulatedPin: true,
    FiltersApplied: ["Flag:SparseDataManualEntryRequired"],
    confidence: null,
  };
}

export default function OfficeMapSheet({ officeName, candidates, onConfirm, onClose }) {
  const validCandidates = candidates.filter((c) => c.location?.latitude != null && c.location?.longitude != null);
  const [selectedId, setSelectedId] = useState(validCandidates[0]?.place_id ?? null);
  const [customPin, setCustomPin] = useState(null);
  const [landmarkText, setLandmarkText] = useState("");
  const mapRef = useRef(null);

  const bounds = useMemo(() => {
    const points = validCandidates.map((c) => c.location);
    if (customPin) points.push(customPin);
    if (points.length === 0) return { minLat: 12.9, maxLat: 13.0, minLng: 77.55, maxLng: 77.65 };
    return computeBounds(points);
  }, [validCandidates, customPin]);

  const pins = validCandidates.map((c) => ({ ...c, ...project(c.location, bounds) }));
  const customPinProjected = customPin ? project(customPin, bounds) : null;

  const handleMapClick = (e) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const { latitude, longitude } = unproject(xPct, yPct, bounds);

    // Snap to an existing pin if the click landed close enough to one,
    // rather than always minting a brand new synthetic result.
    const near = pins.find((p) => Math.hypot(p.xPct - xPct, p.yPct - yPct) < 6);
    if (near) {
      setSelectedId(near.place_id);
      setCustomPin(null);
      return;
    }

    setCustomPin({ latitude, longitude });
    setSelectedId(null);
  };

  const closestKnown = validCandidates[0];
  const selectedResult = customPin
    ? synthesizeCustomPinResult({
        officeName,
        latitude: customPin.latitude,
        longitude: customPin.longitude,
        cityDistrict: closestKnown?.cityDistrict,
        state: closestKnown?.state,
        pincode: closestKnown?.pincode,
        landmarkText,
      })
    : validCandidates.find((c) => c.place_id === selectedId) || null;

  return (
    <div className="map-sheet-overlay" role="dialog" aria-modal="true">
      <div className="map-sheet">
        <div className="map-sheet-header">
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ←
          </button>
          <div>
            <div className="map-sheet-title">Confirm office location</div>
            <div className="map-sheet-office-name">{officeName || "Office"}</div>
          </div>
        </div>

        {validCandidates.length === 0 && (
          <div className="map-sheet-landmark-row">
            <input
              className="search-input"
              placeholder="No office details found — search a landmark instead"
              value={landmarkText}
              onChange={(e) => setLandmarkText(e.target.value)}
            />
          </div>
        )}

        <div
          className="dummy-map"
          ref={mapRef}
          onClick={handleMapClick}
          role="button"
          tabIndex={0}
          aria-label="Tap to drop a pin"
        >
          <div className="dummy-map-note">
            Dummy map view — not real Google Maps. Tap an existing pin, or tap anywhere else to drop your own.
          </div>
          {pins.map((p) => (
            <button
              key={p.place_id}
              type="button"
              className={p.place_id === selectedId ? "map-pin map-pin-selected" : "map-pin"}
              style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(p.place_id);
                setCustomPin(null);
              }}
              title={p.name}
            >
              📍
            </button>
          ))}
          {customPinProjected && (
            <div className="map-pin map-pin-custom" style={{ left: `${customPinProjected.xPct}%`, top: `${customPinProjected.yPct}%` }}>
              📍
            </div>
          )}
        </div>

        <div className="map-sheet-footer">
          {selectedResult ? (
            <div className="map-sheet-preview">
              <strong>{selectedResult.name}</strong>
              {selectedResult.simulatedPin && <span className="chip chip-warn">simulated pin — no real geocoding</span>}
              <div className="muted">
                {[selectedResult.officeBlockBuilding, selectedResult.areaLocality].filter(Boolean).join(", ") || "No detail — fill in manually after confirming."}
              </div>
            </div>
          ) : (
            <div className="muted">Tap a pin on the map to select a location.</div>
          )}
          <button type="button" className="primary-btn" disabled={!selectedResult} onClick={() => onConfirm(selectedResult)}>
            Confirm location
          </button>
        </div>
      </div>
    </div>
  );
}
