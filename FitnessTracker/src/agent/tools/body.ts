import { tool } from "ai";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bodyMetrics, dailyMetrics, measurements } from "@/db/schema";
import { averageOver } from "@/lib/trend";
import { getDaily, getTrend, num } from "@/lib/queries";
import { londonDate } from "@/lib/dates";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const bodyTools = {
  log_weight: tool({
    description: "Record a manual weigh-in (kg). Renpho weigh-ins arrive automatically via Apple Health; use this only when the user tells you a weight.",
    inputSchema: z.object({ weight_kg: z.number().min(30).max(250), date: dateSchema.optional(), body_fat_pct: z.number().min(2).max(60).optional() }),
    execute: async ({ weight_kg, date, body_fat_pct }) => {
      const d = date ?? londonDate();
      await db
        .insert(bodyMetrics)
        .values({ date: d, source: "manual", weightKg: String(weight_kg), bodyFatPct: body_fat_pct != null ? String(body_fat_pct) : null })
        .onConflictDoUpdate({
          target: [bodyMetrics.date, bodyMetrics.source],
          set: { weightKg: String(weight_kg), bodyFatPct: body_fat_pct != null ? String(body_fat_pct) : undefined },
        });
      const t = await getTrend();
      return { date: d, weightKg: weight_kg, trendKg: t.latest?.trendKg ?? weight_kg, weeklyRateKg: t.rate };
    },
  }),

  get_weight_trend: tool({
    description: "Trend weight (smoothed), raw readings, weekly rate of change and 7/30-day averages. Use the trend, never a single reading, when talking about weight.",
    inputSchema: z.object({ days: z.number().int().min(7).max(365).optional() }),
    execute: async ({ days }) => {
      const t = await getTrend(days ?? 90);
      const bf = await db.query.bodyMetrics.findMany({ orderBy: desc(bodyMetrics.date), limit: 14 });
      const bfVals = bf.filter((b) => b.bodyFatPct).map((b) => num(b.bodyFatPct));
      return {
        latest: t.latest,
        weeklyRateKg: t.rate,
        avg7: averageOver(t.points, 7),
        avg30: averageOver(t.points, 30),
        readings: t.points.length,
        bodyFatTrendPct: bfVals.length ? Math.round((bfVals.reduce((a, b) => a + b, 0) / bfVals.length) * 10) / 10 : null,
        series: t.points.slice(-(days ?? 90)),
      };
    },
  }),

  log_checkin: tool({
    description: "Daily check-in: sleep hours, energy 1-5, alcohol units, protein grams, calories, free-text notes. Any subset. Defaults to today.",
    inputSchema: z.object({
      date: dateSchema.optional(),
      sleep_hours: z.number().min(0).max(16).optional(),
      energy: z.number().int().min(1).max(5).optional(),
      alcohol_units: z.number().min(0).max(60).optional(),
      protein_g: z.number().int().min(0).max(500).optional(),
      calories: z.number().int().min(0).max(10000).optional(),
      notes: z.string().optional(),
    }),
    execute: async (i) => {
      const d = i.date ?? londonDate();
      const set: Partial<typeof dailyMetrics.$inferInsert> = {};
      if (i.sleep_hours != null) set.sleepHours = String(i.sleep_hours);
      if (i.energy != null) set.energy = i.energy;
      if (i.alcohol_units != null) set.alcoholUnits = String(i.alcohol_units);
      if (i.protein_g != null) set.proteinG = i.protein_g;
      if (i.calories != null) set.calories = i.calories;
      if (i.notes != null) set.notes = i.notes;
      await db
        .insert(dailyMetrics)
        .values({ date: d, ...set })
        .onConflictDoUpdate({ target: dailyMetrics.date, set });
      const row = await getDaily(d);
      return { date: d, checkin: row };
    },
  }),

  get_daily: tool({
    description: "Steps, walking distance, active energy (from the phone) and check-in fields for a day. Defaults to today.",
    inputSchema: z.object({ date: dateSchema.optional() }),
    execute: async ({ date }) => (await getDaily(date ?? londonDate())) ?? { date: date ?? londonDate(), empty: true },
  }),

  log_measurement: tool({
    description: "Record a tape measurement in cm.",
    inputSchema: z.object({
      site: z.enum(["waist", "chest", "arm_l", "arm_r", "thigh_l", "thigh_r", "hips", "neck", "shoulders", "calf_l", "calf_r"]),
      value_cm: z.number().min(10).max(250),
      date: dateSchema.optional(),
    }),
    execute: async ({ site, value_cm, date }) => {
      const d = date ?? londonDate();
      await db.insert(measurements).values({ site, valueCm: String(value_cm), date: d });
      const prev = await db.query.measurements.findMany({ where: eq(measurements.site, site), orderBy: desc(measurements.date), limit: 6 });
      return { site, date: d, valueCm: value_cm, history: prev.map((p) => ({ date: p.date, cm: num(p.valueCm) })) };
    },
  }),
};
