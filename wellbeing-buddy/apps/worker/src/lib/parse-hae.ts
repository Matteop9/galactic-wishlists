import { HaePayload, HealthMetricsUpsert } from "@wellbeing/shared";

const KJ_TO_KCAL = 0.239006;

type ColKey = keyof HealthMetricsUpsert;

// Maps normalised HAE metric names → our DB column, optional converter, and whether to round to int
const METRIC_MAP: Record<string, { col: ColKey; convert?: (v: number) => number; round?: boolean }> = {
  step_count:                       { col: "steps", round: true },
  active_energy:                    { col: "active_energy_kcal", convert: (v) => v * KJ_TO_KCAL },
  active_energy_burned:             { col: "active_energy_kcal" },
  resting_heart_rate:               { col: "resting_heart_rate_bpm" },
  restingheartrate:                 { col: "resting_heart_rate_bpm" },
  heart_rate_variability_sdnn:      { col: "hrv_ms" },
  heartratevariabilitysdnn:         { col: "hrv_ms" },
  hrv:                              { col: "hrv_ms" },
  respiratory_rate:                 { col: "respiratory_rate_bpm" },
  respiratoryrate:                  { col: "respiratory_rate_bpm" },
  oxygen_saturation:                { col: "spo2_pct" },
  oxygensaturation:                 { col: "spo2_pct" },
  body_mass:                        { col: "body_weight_kg" },
  bodymass:                         { col: "body_weight_kg" },
  weight:                           { col: "body_weight_kg" },
  apple_stand_hour:                 { col: "stand_hours", round: true },
  applestandhour:                   { col: "stand_hours", round: true },
  mindful_session:                  { col: "mindful_minutes", round: true },
  mindfulsession:                   { col: "mindful_minutes", round: true },
};

function normalise(name: string): string {
  return name.toLowerCase().replace(/[\s-]+/g, "_");
}

function parseDate(raw: string): string {
  // "2026-04-23 00:00:00 +0100" → "2026-04-23"
  return raw.slice(0, 10);
}

export function parseHaePayload(
  payload: HaePayload,
  userId: string
): Map<string, HealthMetricsUpsert> {
  const byDate = new Map<string, HealthMetricsUpsert>();

  const getOrCreate = (date: string): HealthMetricsUpsert => {
    if (!byDate.has(date)) {
      byDate.set(date, { user_id: userId, date, raw: {} });
    }
    return byDate.get(date)!;
  };

  for (const metric of payload.data.metrics) {
    const key = normalise(metric.name);

    for (const entry of metric.data) {
      const date = parseDate(entry.date);
      const row = getOrCreate(date);

      // Accumulate raw for every metric
      if (!row.raw) row.raw = {};
      (row.raw as Record<string, unknown>)[metric.name] = entry;

      // Sleep metrics have a structured object instead of a plain qty
      if (key.includes("sleep")) {
        if (entry.asleep != null) row.sleep_duration_minutes = Math.round(entry.asleep);
        if (entry.deep != null)   row.sleep_deep_minutes     = Math.round(entry.deep);
        if (entry.rem != null)    row.sleep_rem_minutes      = Math.round(entry.rem);
        if (entry.core != null)   row.sleep_core_minutes     = Math.round(entry.core);
        if (entry.awake != null)  row.sleep_awake_minutes    = Math.round(entry.awake);
        continue;
      }

      const mapping = METRIC_MAP[key];
      if (mapping && entry.qty != null) {
        let value = mapping.convert ? mapping.convert(entry.qty) : entry.qty;
        if (mapping.round) value = Math.round(value);
        (row as Record<string, unknown>)[mapping.col] = value;
      }
    }
  }

  return byDate;
}
