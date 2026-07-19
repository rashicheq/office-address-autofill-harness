import { Router } from "express";
import { runMockSearch, buildLiveStubResponse } from "../lib/mockSearch.js";

export const searchRouter = Router();

// POST /search — CLAUDE.md Section 4: reads dataSource (mock|live) from the
// request body. mock: fuzzy-matched fixture lookup -> formatting pipeline ->
// ranker -> confidence, all wired up now. live: a deliberate, clearly-flagged
// stub (no HTTP call attempted) until the Google API phase actually starts —
// same response envelope shape either way, so swapping in the real fetch
// later is a small, contained change.
searchRouter.post("/search", (req, res) => {
  const {
    officeName = "",
    dataSource = "mock",
    currentLocation = null,
    scenario = null,
    simulateGeocodeUnavailable = false,
  } = req.body || {};

  if (dataSource === "live") {
    return res.json(buildLiveStubResponse({ officeName, currentLocation }));
  }

  if (dataSource !== "mock") {
    return res
      .status(400)
      .json({ error: "invalid_data_source", message: `Unknown dataSource "${dataSource}"` });
  }

  const result = runMockSearch({
    officeName,
    currentLocation,
    scenarioKey: scenario,
    simulateGeocodeUnavailable,
  });
  return res.json(result);
});
