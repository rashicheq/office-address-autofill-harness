import { createContext, useContext, useEffect, useState } from "react";
import { fetchMeta } from "../api/client.js";

const AppModeContext = createContext(null);

// Single source of truth for the two global toggles (CLAUDE.md 4: "Modes
// toggled by switches, not separate apps"). Both User Mode and Developer
// Mode read from the same context rather than each app owning its own copy.
// `meta` (incl. whether a real GOOGLE_PLACES_API_KEY is configured
// server-side) is fetched once here too, so TopBar's Live API button and
// both mode views agree on whether Live is actually usable right now.
export function AppModeProvider({ children }) {
  const [mode, setMode] = useState("user"); // "user" | "developer"
  const [dataSource, setDataSource] = useState("mock"); // "mock" | "live"
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    fetchMeta()
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  const liveApiConfigured = Boolean(meta?.liveApiConfigured);

  const value = { mode, setMode, dataSource, setDataSource, meta, liveApiConfigured };
  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error("useAppMode must be used within AppModeProvider");
  return ctx;
}
