import { z } from "zod";

export const ToggleItemSchema = z.object({
  done: z.boolean().optional(),
});

export const AddItemSchema = z.object({
  categoryKey: z.string().optional(),
  categoryLabel: z.string().optional(),
  label: z.string().min(1),
  due: z.string().optional(),
  assignee: z.string().optional(),
});
