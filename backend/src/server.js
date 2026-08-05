import "dotenv/config";
import express from "express";
import cors from "cors";
import { searchRouter } from "./routes/search.js";
import { listScenarios, listSuggestions } from "./lib/mockSearch.js";
import { CONFIG, OPEN_QUESTIONS } from "./config.js";
import { isLiveApiConfigured } from "./lib/liveSearch.js";

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Dev Mode's named-scenario picker reads this directly, so the frontend
// never hardcodes fixture data.
app.get("/scenarios", (req, res) => {
  res.json({ scenarios: listScenarios() });
});

// User Mode's search-sheet suggestions (mocks Places Autocomplete — no key
// for that API yet, see CLAUDE.md 4.0's 2026-08 flow-correction note).
app.get("/suggest", (req, res) => {
  res.json({ suggestions: listSuggestions(req.query.q) });
});

// Dev Mode's "open questions" panel — surfaces OQ-2/OQ-3/OQ-4/OQ-7 and the
// current config defaults, per CLAUDE.md Section 7 ("don't silently pick,
// flag it").
app.get("/meta", (req, res) => {
  res.json({ config: CONFIG, openQuestions: OPEN_QUESTIONS, liveApiConfigured: isLiveApiConfigured() });
});

app.use(searchRouter);

app.listen(PORT, () => {
  console.log(`Office Address Autofill harness backend listening on http://localhost:${PORT}`);
});
