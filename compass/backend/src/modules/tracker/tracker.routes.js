import { Router } from "express";
import { asyncHandler } from "../../core/asyncHandler.js";
import { validate } from "../../middleware/validate.js";
import { ToggleItemSchema, AddItemSchema } from "./tracker.model.js";
import { getTrackerView, toggleItem, addItem } from "./tracker.service.js";

const router = Router();

router.get(
  "/:tripId/tracker",
  asyncHandler(async (req, res) => {
    res.json(getTrackerView(req.params.tripId));
  })
);

router.patch(
  "/:tripId/tracker/items/:itemId",
  validate({ body: ToggleItemSchema }),
  asyncHandler(async (req, res) => {
    res.json(toggleItem(req.params.tripId, req.params.itemId, req.body.done));
  })
);

router.post(
  "/:tripId/tracker/items",
  validate({ body: AddItemSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(addItem(req.params.tripId, req.body));
  })
);

export default { basePath: "/api/trips", router };
