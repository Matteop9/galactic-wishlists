import { tool } from "ai";
import { z } from "zod";
import { findExercise, getExerciseHistory, toSetLike } from "@/lib/queries";
import { weeklyRows, weeklyVolumeByMuscle } from "@/lib/weekly";
import { correlate, describeCorrelation, type WeekRow } from "@/lib/stats";
import { bestE1rm, e1rm, setQualifiesForE1rm } from "@/lib/training";

const METRICS = ["weightChangeKg", "cardioMinutes", "cardioSessions", "liftSessions", "hardSets", "volumeLoad", "steps", "alcoholUnits", "calories", "proteinG", "sleepHours"] as const;

export const analysisTools = {
  weekly_stats: tool({
    description: "Week-by-week table: lifting sessions, cardio sessions/minutes, hard sets, volume load, avg steps, alcohol units, calories, protein, sleep, and trend-weight change. Newest last.",
    inputSchema: z.object({ weeks: z.number().int().min(2).max(26).optional() }),
    execute: async ({ weeks }) => weeklyRows(weeks ?? 8),
  }),

  volume_by_muscle: tool({
    description: "Hard sets per muscle this week (fractional: primary 1, secondary 0.5) with the 10-20 target band and which muscles are under 10.",
    inputSchema: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
    execute: async ({ date }) => {
      const v = await weeklyVolumeByMuscle(date);
      const under = Object.entries(v.volume).filter(([, n]) => n < 10).map(([m]) => m);
      return { ...v, targetBand: [10, 20], underTarget: under };
    },
  }),

  e1rm_history: tool({
    description: "Best RIR-adjusted e1RM per session for an exercise over time, plus the all-time best. Use to judge strength progress.",
    inputSchema: z.object({ exercise: z.string(), sessions: z.number().int().min(2).max(40).optional() }),
    execute: async ({ exercise, sessions }) => {
      const ex = await findExercise(exercise);
      if (!ex) return { error: `Unknown exercise '${exercise}'` };
      const hist = await getExerciseHistory(ex.id, 600);
      const byDate = new Map<string, number>();
      for (const s of hist) {
        const sl = toSetLike(s);
        if (!setQualifiesForE1rm(sl)) continue;
        const v = e1rm(sl.weightKg, sl.reps, sl.rir);
        byDate.set(s.date, Math.max(byDate.get(s.date) ?? 0, v));
      }
      const series = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, e1rm]) => ({ date, e1rm }));
      const recent = series.slice(-(sessions ?? 12));
      return {
        exercise: ex.name,
        best: bestE1rm(hist.map(toSetLike)),
        series: recent,
        changeOverWindow: recent.length >= 2 ? Math.round((recent.at(-1)!.e1rm - recent[0].e1rm) * 10) / 10 : null,
      };
    },
  }),

  correlate: tool({
    description:
      "Correlate two weekly metrics (Spearman + Pearson) across the last N weeks, with a plain-English read-out and sample-size gating (needs 8+ weeks). Metrics: weightChangeKg, cardioMinutes, cardioSessions, liftSessions, hardSets, volumeLoad, steps, alcoholUnits, calories, proteinG, sleepHours.",
    inputSchema: z.object({ x: z.enum(METRICS), y: z.enum(METRICS), weeks: z.number().int().min(4).max(52).optional() }),
    execute: async ({ x, y, weeks }) => {
      const rows = await weeklyRows(weeks ?? 16);
      const pairs = rows.map((r) => [r[x as keyof WeekRow] as number | null, r[y as keyof WeekRow] as number | null] as [number | null, number | null]);
      const c = correlate(pairs);
      return { x, y, ...c, readout: describeCorrelation(`${x} vs ${y}`, c) };
    },
  }),

  render_chart: tool({
    description:
      "Show the user a chart card. kind: line | bar. series: [{name, points:[{x,y}]}]. Use for weight trend, e1RM over time, weekly sets, cardio minutes. Keep to ≤3 series and ≤60 points each.",
    inputSchema: z.object({
      title: z.string(),
      kind: z.enum(["line", "bar"]),
      yLabel: z.string().optional(),
      series: z.array(z.object({ name: z.string(), points: z.array(z.object({ x: z.string(), y: z.number() })).max(60) })).min(1).max(3),
      band: z.object({ from: z.number(), to: z.number(), label: z.string().optional() }).optional().describe("Shaded target band, e.g. 10-20 sets"),
    }),
    execute: async (spec) => spec,
  }),
};
