import { Router } from "express";
import { asyncHandler } from "../../core/asyncHandler.js";
import { searchDestinations } from "./destinations.service.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { query = "", vibe } = req.query;
    res.json({ destinations: searchDestinations({ query: String(query), vibeId: vibe }) });
  })
);

export default { basePath: "/api/destinations", router };
