import express from "express";
import cors from "cors";
import { registerModules } from "./core/moduleLoader.js";
import { errorHandler, notFoundHandler } from "./core/errors.js";
import { requestLogger } from "./middleware/requestLogger.js";

import vibesModule from "./modules/vibes/vibes.routes.js";
import destinationsModule from "./modules/destinations/destinations.routes.js";
import tripsModule from "./modules/trips/trips.routes.js";
import preferencesModule from "./modules/preferences/preferences.routes.js";
import itineraryModule from "./modules/itinerary/itinerary.routes.js";
import trackerModule from "./modules/tracker/tracker.routes.js";

// The full module registry. Phase 2/3 additions (an international
// documentation module, a deal optimizer) are new entries here — nothing
// above this list needs to change to add one.
const MODULES = [vibesModule, destinationsModule, tripsModule, preferencesModule, itineraryModule, trackerModule];

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  app.get("/health", (req, res) => res.json({ status: "ok" }));

  registerModules(app, MODULES);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
