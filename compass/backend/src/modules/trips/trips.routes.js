import { Router } from "express";
import { asyncHandler } from "../../core/asyncHandler.js";
import { validate } from "../../middleware/validate.js";
import { CreateTripSchema, UpdateTripWindowSchema } from "./trips.model.js";
import { createTrip, getTrip, updateTripWindow } from "./trips.service.js";

const router = Router();

router.post(
  "/",
  validate({ body: CreateTripSchema }),
  asyncHandler(async (req, res) => {
    const trip = createTrip(req.body);
    res.status(201).json({ trip });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ trip: getTrip(req.params.id) });
  })
);

router.patch(
  "/:id",
  validate({ body: UpdateTripWindowSchema }),
  asyncHandler(async (req, res) => {
    res.json({ trip: updateTripWindow(req.params.id, req.body) });
  })
);

export default { basePath: "/api/trips", router };
