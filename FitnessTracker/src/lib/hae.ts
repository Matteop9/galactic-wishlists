// Health Auto Export → rows. Pure parsing so it can be unit-tested.
// Payload: { data: { metrics: [{ name, units, data: [{ date, qty?, source?, ...}] }], workouts?: [...] } }

import { haeDate } from "./dates";

const KJ_TO_KCAL = 0.239006;
const LB_TO_KG = 0.45359237;
const MI_TO_KM = 1.609344;

export type HaeEntry = { date: string; qty?: number; source?: string; [k: string]: unknown };
export type HaeMetric = { name: string; units?: string; data: HaeEntry[] };
export type HaePayload = { data: { metrics?: HaeMetric[]; workouts?: unknown[] } };

export type BodyRow = { date: string; weightKg?: number; bodyFatPct?: number; leanMassKg?: number; bmi?: number; source: string };
export type DailyRow = { date: string; steps?: number; walkingKm?: number; activeKcal?: number; sleepHours?: number };

export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[\s\-&]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function toKg(qty: number, units?: string) {
  return units && /lb/i.test(units) ? qty * LB_TO_KG : qty;
}
function toKm(qty: number, units?: string) {
  if (!units) return qty;
  if (/mi/i.test(units)) return qty * MI_TO_KM;
  if (/^m$/i.test(units)) return qty / 1000;
  return qty;
}
function toKcal(qty: number, units?: string) {
  return units && /kj/i.test(units) ? qty * KJ_TO_KCAL : qty;
}

export function parseHae(payload: HaePayload): { body: BodyRow[]; daily: DailyRow[]; ignored: string[] } {
  const body = new Map<string, BodyRow>();
  const daily = new Map<string, DailyRow>();
  const ignored = new Set<string>();
  const bodyFor = (date: string, source: string) => {
    const key = `${date}|${source}`;
    if (!body.has(key)) body.set(key, { date, source });
    return body.get(key)!;
  };
  const dailyFor = (date: string) => {
    if (!daily.has(date)) daily.set(date, { date });
    return daily.get(date)!;
  };

  for (const metric of payload.data.metrics ?? []) {
    const key = normaliseName(metric.name);
    for (const e of metric.data ?? []) {
      if (!e?.date) continue;
      const date = haeDate(e.date);
      const qty = typeof e.qty === "number" ? e.qty : undefined;
      const source = "hae"; // everything via Apple Health is one source; manual chat entries use "manual"
      switch (key) {
        case "weight_body_mass":
        case "weight_&_body_mass":
        case "body_mass":
        case "weight":
          if (qty != null) bodyFor(date, source).weightKg = round(toKg(qty, metric.units), 2);
          break;
        case "body_fat_percentage":
        case "body_fat":
          if (qty != null) bodyFor(date, source).bodyFatPct = round(qty, 1);
          break;
        case "lean_body_mass":
          if (qty != null) bodyFor(date, source).leanMassKg = round(toKg(qty, metric.units), 2);
          break;
        case "body_mass_index":
          if (qty != null) bodyFor(date, source).bmi = round(qty, 1);
          break;
        case "step_count":
        case "steps":
          if (qty != null) dailyFor(date).steps = (dailyFor(date).steps ?? 0) + Math.round(qty);
          break;
        case "walking_running_distance":
        case "walking_+_running_distance":
        case "distance_walking_running":
          if (qty != null) dailyFor(date).walkingKm = round((dailyFor(date).walkingKm ?? 0) + toKm(qty, metric.units), 2);
          break;
        case "active_energy":
        case "active_energy_burned":
          if (qty != null) dailyFor(date).activeKcal = Math.round((dailyFor(date).activeKcal ?? 0) + toKcal(qty, metric.units));
          break;
        case "sleep_analysis": {
          const total = (e as { totalSleep?: number; asleep?: number }).totalSleep ?? (e as { asleep?: number }).asleep;
          if (typeof total === "number") dailyFor(date).sleepHours = round(metric.units && /min/i.test(metric.units) ? total / 60 : total, 1);
          break;
        }
        default:
          ignored.add(key);
      }
    }
  }
  return { body: [...body.values()], daily: [...daily.values()], ignored: [...ignored] };
}

function round(n: number, dp: number) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
