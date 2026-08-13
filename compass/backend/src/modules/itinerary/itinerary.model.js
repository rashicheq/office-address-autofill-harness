import { z } from "zod";

export const SlotSchema = z.object({
  id: z.string().optional(),
  time: z.string(),
  title: z.string().min(1),
  note: z.string().optional().default(""),
  dietaryFlags: z.array(z.string()).optional(),
  pinned: z.boolean().optional().default(false),
});

export const ReplaceDaySlotsSchema = z.object({
  slots: z.array(SlotSchema),
});
