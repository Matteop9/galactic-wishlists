import { z } from "zod";

const rating = z.number().int().min(1).max(5);

export const MorningCheckinSchema = z.object({
  user_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  energy: rating,
  soreness: rating,
  mood: rating,
  gym_access: z.boolean(),
  available_minutes: z.number().int().min(0).max(480),
});

export const EveningCheckinSchema = z.object({
  user_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: rating,
  energy: rating,
  stress: rating,
  food_quality: rating,
  soreness: rating,
  alcohol_units: z.number().int().min(0).max(20),
});

export type MorningCheckin = z.infer<typeof MorningCheckinSchema>;
export type EveningCheckin = z.infer<typeof EveningCheckinSchema>;
