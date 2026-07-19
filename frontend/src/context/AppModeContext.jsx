import { createContext, useContext, useState } from "react";

const AppModeContext = createContext(null);

// Single source of truth for the two global toggles (CLAUDE.md 4: "Modes
// toggled by switches, not separate apps"). Both User Mode and Developer
// Mode read from the same context rather than each app owning its own copy.
export function AppModeProvider({ children }) {
  const [mode, setMode] = useState("user"); // "user" | "developer"
  const [dataSource, setDataSource] = useState("mock"); // "mock" | "live"

  const value = { mode, setMode, dataSource, setDataSource };
  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error("useAppMode must be used within AppModeProvider");
  return ctx;
}
