import { AppModeProvider, useAppMode } from "./context/AppModeContext.jsx";
import { useOfficeSearch } from "./hooks/useOfficeSearch.js";
import TopBar from "./components/TopBar.jsx";
import UserModeView from "./components/UserMode/UserModeView.jsx";
import DeveloperModeView from "./components/DeveloperMode/DeveloperModeView.jsx";

function AppShell() {
  const { mode, dataSource } = useAppMode();
  const searchState = useOfficeSearch(dataSource);

  return (
    <div className="app">
      <TopBar />
      <main className="app-main">
        {mode === "user" ? (
          <UserModeView searchState={searchState} dataSource={dataSource} />
        ) : (
          <DeveloperModeView searchState={searchState} dataSource={dataSource} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppModeProvider>
      <AppShell />
    </AppModeProvider>
  );
}
