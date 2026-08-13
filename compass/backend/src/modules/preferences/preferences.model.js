import { z } from "zod";

export const TravelerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  ageBand: z.enum(["infant", "child", "teen", "adult"]).default("adult"),
  dietary: z.array(z.enum(["vegetarian", "vegan", "jain", "halal", "kosher", "no_restriction"])).default([]),
  allergies: z.array(z.string()).default([]),
  mobilityNeeds: z.string().optional(),
});

export const UpdatePreferencesSchema = z.object({
  travelers: z.array(TravelerSchema).optional(),
  selectedTagKeys: z.array(z.string()).optional(),
  mustSee: z.array(z.string()).optional(),
});
