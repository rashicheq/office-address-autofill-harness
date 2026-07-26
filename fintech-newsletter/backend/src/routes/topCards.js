import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { callClaudeForJson } from "../lib/anthropicClient.js";
import { parseJsonObjectLoose } from "../lib/jsonParse.js";
import { readDay, writeDay } from "../lib/storage.js";

const PROMPTS_DIR = path.join(process.cwd(), "config", "system_prompts");
const CONTEXT_KEYS = ["co_branded_cards", "patterns", "market_shifts", "user_sentiment"];

export const topCardsRouter = Router();

topCardsRouter.post("/api/top-cards", async (req, res) => {
  const date = req.body?.date;
  if (!date) return res.status(400).json({ error: "missing_date" });

  const day = await readDay(date);
  const lines = CONTEXT_KEYS.flatMap((key) =>
    (day.sections?.[key]?.stories || []).map((s) => `[${key}] ${s.title}: ${s.change} | ${s.impact}`),
  );
  const context = lines.length
    ? `Context from today's fetched signals:\n${lines.join("\n")}`
    : "No fetched signals yet for today — research this from scratch using current, real information.";

  try {
    const system = await fs.readFile(path.join(PROMPTS_DIR, "top_cards.md"), "utf-8");
    const { data } = await callClaudeForJson({
      system,
      userText: `Today is ${date}. ${context}`,
      parse: parseJsonObjectLoose,
      maxTokens: 4096,
    });
    if (!data.standout_cards) throw new Error("response was empty or malformed");

    const updated = { ...day, top_cards: data };
    await writeDay(date, updated);
    res.json({ day: updated });
  } catch (err) {
    res.status(502).json({
      error: "top_cards_failed",
      message: err.message,
      rawOutput: err.rawOutput ?? null,
      day,
    });
  }
});
