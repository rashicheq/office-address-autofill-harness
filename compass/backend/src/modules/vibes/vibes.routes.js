import { Router } from "express";
import { asyncHandler } from "../../core/asyncHandler.js";
import { listVibes } from "./vibes.service.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ vibes: listVibes() });
  })
);

export default { basePath: "/api/vibes", router };
