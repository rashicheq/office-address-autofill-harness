import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { SECTION_LABELS } from "../sections.js";
import { callClaudeForJson } from "../lib/anthropicClient.js";
import { parseJsonObjectLoose } from "../lib/jsonParse.js";
import { readDay, writeDay } from "../lib/storage.js";

const PROMPTS_DIR = path.join(process.cwd(), "config", "system_prompts");

export const synthesisRouter = Router();

synthesisRouter.post("/api/synthesis", async (req, res) => {
  const date = req.body?.date;
  if (!date) return res.status(400).json({ error: "missing_date" });

  const day = await readDay(date);
  const lines = Object.entries(day.sections || {}).flatMap(([key, sec]) =>
    (sec.stories || []).map((s) => `[${SECTION_LABELS[key] || key}] ${s.title}: ${s.change}`),
  );

  if (lines.length === 0) {
    return res.json({ day });
  }

  try {
    const system = await fs.readFile(path.join(PROMPTS_DIR, "synthesis.md"), "utf-8");
    const { data } = await callClaudeForJson({
      system,
      userText: `Today's fetched stories so far:\n${lines.join("\n")}`,
      parse: parseJsonObjectLoose,
      maxTokens: 1024,
      useWebSearch: false,
    });
    const updated = {
      ...day,
      linkedin_angle: data.linkedin_angle || day.linkedin_angle || "",
      reflection_questions: data.reflection_questions || day.reflection_questions || [],
    };
    await writeDay(date, updated);
    res.json({ day: updated });
  } catch (err) {
    // Synthesis is a non-fatal enhancement over the section data that's
    // already saved — log it, but don't fail the request it follows.
    console.error(`[synthesis] failed for ${date}:`, err.message);
    res.json({ day });
  }
});
