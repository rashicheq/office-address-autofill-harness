import { z } from "zod";

export const CreateTripSchema = z.object({
  destinationId: z.string().min(1),
  days: z.number().int().min(1).max(30),
  dateMode: z.enum(["flexible", "fixed"]).default("flexible"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const UpdateTripWindowSchema = z.object({
  days: z.number().int().min(1).max(30).optional(),
  dateMode: z.enum(["flexible", "fixed"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export function newTrip({ id, destinationId, vibeId, days, dateMode, startDate, endDate }) {
  const now = new Date().toISOString();
  return {
    id,
    destinationId,
    vibeId,
    days,
    dateMode,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    preferences: {
      travelers: [],
      selectedTagKeys: [],
      mustSee: [],
    },
    itinerary: null,
    tracker: null,
    createdAt: now,
    updatedAt: now,
  };
}
