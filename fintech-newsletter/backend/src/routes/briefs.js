import { Router } from "express";
import { readAllBriefs, readDay, deleteAllBriefs } from "../lib/storage.js";

export const briefsRouter = Router();

briefsRouter.get("/api/briefs", async (req, res) => {
  res.json({ briefs: await readAllBriefs() });
});

briefsRouter.get("/api/briefs/:date", async (req, res) => {
  res.json({ brief: await readDay(req.params.date) });
});

briefsRouter.delete("/api/briefs", async (req, res) => {
  await deleteAllBriefs();
  res.json({ ok: true });
});
