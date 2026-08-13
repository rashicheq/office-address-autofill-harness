import { Router } from "express";
import { asyncHandler } from "../../core/asyncHandler.js";
import { validate } from "../../middleware/validate.js";
import { UpdatePreferencesSchema } from "./preferences.model.js";
import { updatePreferences, detectPreferenceConflicts } from "./preferences.service.js";

const router = Router();

router.get(
  "/:tripId/preferences",
  asyncHandler(async (req, res) => {
    const conflicts = detectPreferenceConflicts(req.params.tripId);
    res.json({ conflicts });
  })
);

router.patch(
  "/:tripId/preferences",
  validate({ body: UpdatePreferencesSchema }),
  asyncHandler(async (req, res) => {
    const trip = updatePreferences(req.params.tripId, req.body);
    const conflicts = detectPreferenceConflicts(req.params.tripId);
    res.json({ trip, conflicts });
  })
);

export default { basePath: "/api/trips", router };
