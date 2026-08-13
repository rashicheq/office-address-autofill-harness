import { Router } from "express";
import { asyncHandler } from "../../core/asyncHandler.js";
import { validate } from "../../middleware/validate.js";
import { ReplaceDaySlotsSchema } from "./itinerary.model.js";
import { generate, updateDaySlots } from "./itinerary.service.js";
import { detectPreferenceConflicts } from "../preferences/preferences.service.js";

const router = Router();

router.post(
  "/:tripId/itinerary/generate",
  asyncHandler(async (req, res) => {
    const trip = generate(req.params.tripId);
    const conflicts = detectPreferenceConflicts(req.params.tripId);
    res.json({ trip, conflicts });
  })
);

router.patch(
  "/:tripId/itinerary/days/:dayIndex",
  validate({ body: ReplaceDaySlotsSchema }),
  asyncHandler(async (req, res) => {
    const dayIndex = Number(req.params.dayIndex);
    const trip = updateDaySlots(req.params.tripId, dayIndex, req.body.slots);
    const conflicts = detectPreferenceConflicts(req.params.tripId);
    res.json({ trip, conflicts });
  })
);

export default { basePath: "/api/trips", router };
