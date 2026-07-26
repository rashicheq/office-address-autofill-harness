import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { SECTIONS } from "../sections.js";
import { callClaudeForJson } from "../lib/anthropicClient.js";
import { parseJsonArrayLoose } from "../lib/jsonParse.js";
import { readDay, writeDay } from "../lib/storage.js";

const PROMPTS_DIR = path.join(process.cwd(), "config", "system_prompts");

export const sectionsRouter = Router();

// Section metadata only (labels/highlight) — the frontend renders tabs from
// this instead of keeping its own copy that could drift from the backend's.
sectionsRouter.get("/api/sections", (req, res) => {
  res.json({ sections: SECTIONS.map(({ key, label, highlight }) => ({ key, label, highlight: Boolean(highlight) })) });
});

sectionsRouter.post("/api/sections/:key/fetch", async (req, res) => {
  const { key } = req.params;
  const section = SECTIONS.find((s) => s.key === key);
  if (!section) {
    return res.status(404).json({ error: "unknown_section", message: `No section "${key}"` });
  }

  const date = req.body?.date || new Date().toISOString().slice(0, 10);

  try {
    const system = await fs.readFile(path.join(PROMPTS_DIR, section.promptFile), "utf-8");
    const { data: stories, retried } = await callClaudeForJson({
      system,
      userText: `Find today's (${date}) news for this topic. Be current and specific.`,
      parse: parseJsonArrayLoose,
      maxTokens: 4096,
    });

    const current = await readDay(date);
    const updated = {
      ...current,
      date,
      sections: {
        ...current.sections,
        [key]: { stories: Array.isArray(stories) ? stories : [], fetched_at: new Date().toISOString() },
      },
    };
    await writeDay(date, updated);
    res.json({ day: updated, retried });
  } catch (err) {
    res.status(502).json({
      error: "section_fetch_failed",
      message: err.message,
      rawOutput: err.rawOutput ?? null,
    });
  }
});
