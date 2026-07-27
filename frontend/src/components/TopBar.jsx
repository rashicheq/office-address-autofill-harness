import { useAppMode } from "../context/AppModeContext.jsx";

export default function TopBar() {
  const { mode, setMode, dataSource, setDataSource, liveApiConfigured } = useAppMode();

  return (
    <header className="topbar">
      <div className="topbar-title">Office Address Autofill — Test Harness</div>
      <div className="topbar-toggles">
        <div className="segmented" role="tablist" aria-label="Mode">
          <button
            type="button"
            className={mode === "user" ? "segmented-btn active" : "segmented-btn"}
            onClick={() => setMode("user")}
          >
            User Mode
          </button>
          <button
            type="button"
            className={mode === "developer" ? "segmented-btn active" : "segmented-btn"}
            onClick={() => setMode("developer")}
          >
            Developer Mode
          </button>
        </div>
        <div className="segmented" role="tablist" aria-label="Data source">
          <button
            type="button"
            className={dataSource === "mock" ? "segmented-btn active" : "segmented-btn"}
            onClick={() => setDataSource("mock")}
          >
            Mock Data
          </button>
          <button
            type="button"
            className={dataSource === "live" ? "segmented-btn active live-btn" : "segmented-btn live-btn"}
            onClick={() => setDataSource("live")}
            title={
              liveApiConfigured
                ? "GOOGLE_PLACES_API_KEY is configured — this makes real, billed calls to Google Places"
                : "Requires Google API key setup — add GOOGLE_PLACES_API_KEY to backend/.env"
            }
          >
            Live API{" "}
            <span className={liveApiConfigured ? "badge badge-live" : "badge"}>
              {liveApiConfigured ? "real calls" : "not configured"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
