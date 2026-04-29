import { z } from "zod";

// HAE sends metric values as strings or numbers depending on version
const numeric = z.coerce.number().positive().optional();

const HaeDataEntrySchema = z.object({
  date: z.string(),               // "YYYY-MM-DD HH:MM:SS +TZOFF"
  qty: z.coerce.number().optional(),
  source: z.string().optional(),
  // sleep-specific fields
  asleep: z.coerce.number().optional(),
  inBed: z.coerce.number().optional(),
  deep: z.coerce.number().optional(),
  rem: z.coerce.number().optional(),
  core: z.coerce.number().optional(),
  awake: z.coerce.number().optional(),
});

const HaeMetricSchema = z.object({
  name: z.string(),
  units: z.string().optional(),
  data: z.array(HaeDataEntrySchema),
});

// Health Auto Export REST API payload shape:
// { data: { metrics: [ { name, units, data: [{date, qty, ...}] } ] } }
export const HaePayloadSchema = z.object({
  data: z.object({
    metrics: z.array(HaeMetricSchema),
  }),
});

export type HaePayload = z.infer<typeof HaePayloadSchema>;

export const HealthMetricsUpsertSchema = z.object({
  user_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.number().int().nonnegative().optional(),
  active_energy_kcal: numeric,
  resting_heart_rate_bpm: numeric,
  hrv_ms: numeric,
  sleep_duration_minutes: z.number().int().nonnegative().optional(),
  sleep_deep_minutes: z.number().int().nonnegative().optional(),
  sleep_rem_minutes: z.number().int().nonnegative().optional(),
  sleep_core_minutes: z.number().int().nonnegative().optional(),
  sleep_awake_minutes: z.number().int().nonnegative().optional(),
  respiratory_rate_bpm: numeric,
  spo2_pct: numeric,
  body_weight_kg: numeric,
  stand_hours: z.number().int().nonnegative().optional(),
  mindful_minutes: z.number().int().nonnegative().optional(),
  raw: z.record(z.unknown()).optional(),
});

export type HealthMetricsUpsert = z.infer<typeof HealthMetricsUpsertSchema>;
