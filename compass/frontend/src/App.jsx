import { Routes, Route, Link } from "react-router-dom";
import { NewTripPage } from "./pages/NewTripPage.jsx";
import { TripDashboardPage } from "./pages/TripDashboardPage.jsx";

export function App() {
  return (
    <>
      <nav className="site-nav">
        <Link to="/" className="brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M15 9l-2 6-4 2 2-6z" fill="currentColor" stroke="none" />
          </svg>
          Compass
        </Link>
      </nav>
      <Routes>
        <Route path="/" element={<NewTripPage />} />
        <Route path="/trip/:tripId" element={<TripDashboardPage />} />
      </Routes>
    </>
  );
}
