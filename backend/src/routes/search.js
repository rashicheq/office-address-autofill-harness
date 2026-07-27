import { Router } from "express";
import { runMockSearch } from "../lib/mockSearch.js";
import { runLiveSearch, buildLiveStubResponse, isLiveApiConfigured } from "../lib/liveSearch.js";

export const searchRouter = Router();

// One search, either data source -> same response envelope shape either way
// (CLAUDE.md 4.0), so the frontend/pipeline/ranker never need to know which
// one ran.
async function runOneSearch({ officeName, dataSource, currentLocation, scenario, simulateGeocodeUnavailable }) {
  if (dataSource === "live") {
    if (!isLiveApiConfigured()) {
      return buildLiveStubResponse({ officeName, currentLocation });
    }
    return runLiveSearch({ officeName, currentLocation, simulateGeocodeUnavailable });
  }

  if (dataSource !== "mock") {
    const err = new Error(`Unknown dataSource "${dataSource}"`);
    err.invalidDataSource = true;
    throw err;
  }

  return runMockSearch({
    officeName,
    currentLocation,
    scenarioKey: scenario,
    simulateGeocodeUnavailable,
  });
}

// POST /search — CLAUDE.md Section 4: reads dataSource (mock|live) from the
// request body. mock: fuzzy-matched fixture lookup -> formatting pipeline ->
// ranker -> confidence. live (key configured): real Places Text Search (New)
// call -> the SAME formatting pipeline -> ranker -> confidence. live (no key):
// a deliberate, clearly-flagged stub, no HTTP call attempted.
searchRouter.post("/search", async (req, res) => {
  const {
    officeName = "",
    dataSource = "mock",
    currentLocation = null,
    scenario = null,
    simulateGeocodeUnavailable = false,
  } = req.body || {};

  try {
    const result = await runOneSearch({ officeName, dataSource, currentLocation, scenario, simulateGeocodeUnavailable });
    return res.json(result);
  } catch (err) {
    if (err.invalidDataSource) {
      return res.status(400).json({ error: "invalid_data_source", message: err.message });
    }
    return res.status(500).json({ error: "search_failed", message: err.message });
  }
});

// POST /search/batch — runs a list of office names through the same
// per-name logic as /search (mock or live), so a list of names (e.g. Rashi's
// 20 real office names) can be validated in one pass instead of one-by-one.
// A small delay between live calls keeps this well under Places API rate
// limits, mirroring the reference batch-office-search.js script's 200ms gap.
const LIVE_BATCH_DELAY_MS = 200;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

searchRouter.post("/search/batch", async (req, res) => {
  const {
    officeNames = [],
    dataSource = "mock",
    currentLocation = null,
    simulateGeocodeUnavailable = false,
  } = req.body || {};

  if (!Array.isArray(officeNames) || officeNames.length === 0) {
    return res.status(400).json({ error: "invalid_office_names", message: "officeNames must be a non-empty array of strings." });
  }

  const startedAt = Date.now();
  const batch = [];

  for (const officeName of officeNames) {
    try {
      const result = await runOneSearch({ officeName, dataSource, currentLocation, scenario: null, simulateGeocodeUnavailable });
      batch.push({ officeName, ...result });
    } catch (err) {
      if (err.invalidDataSource) {
        return res.status(400).json({ error: "invalid_data_source", message: err.message });
      }
      batch.push({
        officeName,
        source: dataSource,
        results: [],
        errorLog: [{ testCase: null, level: "error", message: err.message }],
      });
    }
    if (dataSource === "live") await sleep(LIVE_BATCH_DELAY_MS);
  }

  return res.json({ batch, count: batch.length, timing: { startedAt, durationMs: Date.now() - startedAt } });
});
