import "dotenv/config";
import express from "express";
import cors from "cors";
import { sectionsRouter } from "./routes/sections.js";
import { synthesisRouter } from "./routes/synthesis.js";
import { topCardsRouter } from "./routes/topCards.js";
import { briefsRouter } from "./routes/briefs.js";

const app = express();
const PORT = process.env.PORT || 8788;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY) });
});

app.use(sectionsRouter);
app.use(synthesisRouter);
app.use(topCardsRouter);
app.use(briefsRouter);

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "[fintech-newsletter] ANTHROPIC_API_KEY is not set — every fetch/synthesis/top-cards " +
      "call will fail until it's added to backend/.env (see backend/.env.example).",
  );
}

app.listen(PORT, () => {
  console.log(`My Fintech Newsletter backend listening on http://localhost:${PORT}`);
});
