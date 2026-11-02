import "server-only";
import { and, asc, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { cardioSessions, dailyMetrics, exercises, sets, workouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { londonDate } from "./dates";
import { num, getTrend } from "./queries";
import { weekStartOf, type WeekRow } from "./stats";
import { isHardSet, volumeByMuscle, volumeLoad, toSetLikeRow } from "./training-server";
import { shiftDate } from "./trend";

/** One row per ISO week for the last `weeks` weeks, newest last. */
export async function weeklyRows(weeks = 12): Promise<WeekRow[]> {
  const today = londonDate();
  const thisMonday = weekStartOf(today);
  const firstMonday = shiftDate(thisMonday, -7 * (weeks - 1));
  const startTs = new Date(`${firstMonday}T00:00:00Z`);
  const endTs = new Date(`${shiftDate(thisMonday, 7)}T00:00:00Z`);

  const ws = await db.select().from(workouts).where(and(gte(workouts.startedAt, startTs), lt(workouts.startedAt, endTs))).orderBy(asc(workouts.startedAt));
  const setRows = ws.length
    ? await db
        .select({ set: sets, exercise: exercises, startedAt: workouts.startedAt })
        .from(sets)
        .innerJoin(workouts, eq(sets.workoutId, workouts.id))
        .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
        .where(and(gte(workouts.startedAt, startTs), lt(workouts.startedAt, endTs)))
    : [];
  const cs = await db.select().from(cardioSessions).where(and(gte(cardioSessions.performedAt, startTs), lt(cardioSessions.performedAt, endTs)));
  const ds = await db.select().from(dailyMetrics).where(and(gte(dailyMetrics.date, firstMonday), lt(dailyMetrics.date, shiftDate(thisMonday, 7))));
  const trend = await getTrend(7 * weeks + 14);

  const rows: WeekRow[] = [];
  for (let i = 0; i < weeks; i++) {
    const weekStart = shiftDate(firstMonday, 7 * i);
    const weekEnd = shiftDate(weekStart, 7);
    const inWeek = (d: string) => d >= weekStart && d < weekEnd;
    const wk = ws.filter((w) => w.endedAt && inWeek(londonDate(w.startedAt)));
    const sr = setRows.filter((r) => inWeek(londonDate(r.startedAt)));
    const ck = cs.filter((c) => inWeek(londonDate(c.performedAt)));
    const dk = ds.filter((d) => inWeek(d.date));
    const sum = (vals: Array<number | null>) => (vals.some((v) => v != null) ? vals.reduce((a: number, v) => a + (v ?? 0), 0) : null);
    const avg = (vals: Array<number | null>) => {
      const v = vals.filter((x): x is number => x != null);
      return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
    };
    const tStart = trend.points.filter((p) => p.date < weekStart).at(-1) ?? trend.points.find((p) => p.date >= weekStart) ?? null;
    const tEnd = trend.points.filter((p) => p.date < weekEnd).at(-1) ?? null;
    rows.push({
      weekStart,
      liftSessions: wk.length,
      cardioSessions: ck.length,
      cardioMinutes: Math.round(ck.reduce((a, c) => a + num(c.durationMin), 0)),
      hardSets: sr.filter((r) => isHardSet(toSetLikeRow(r.set))).length,
      volumeLoad: Math.round(volumeLoad(sr.map((r) => toSetLikeRow(r.set)))),
      steps: avg(dk.map((d) => d.steps)),
      alcoholUnits: sum(dk.map((d) => (d.alcoholUnits ? num(d.alcoholUnits) : null))),
      calories: avg(dk.map((d) => d.calories)),
      proteinG: avg(dk.map((d) => d.proteinG)),
      sleepHours: avg(dk.map((d) => (d.sleepHours ? num(d.sleepHours) : null))),
      trendStartKg: tStart?.trendKg ?? null,
      trendEndKg: tEnd?.trendKg ?? null,
      weightChangeKg: tStart && tEnd && tEnd.date > tStart.date ? Math.round((tEnd.trendKg - tStart.trendKg) * 100) / 100 : null,
    });
  }
  return rows;
}

/** Hard sets per muscle for the ISO week containing `date` (fractional counting). */
export async function weeklyVolumeByMuscle(date = londonDate()) {
  const weekStart = weekStartOf(date);
  const startTs = new Date(`${weekStart}T00:00:00Z`);
  const endTs = new Date(`${shiftDate(weekStart, 7)}T00:00:00Z`);
  const rows = await db
    .select({ set: sets, exercise: exercises })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
    .where(and(gte(workouts.startedAt, startTs), lt(workouts.startedAt, endTs)));
  return { weekStart, volume: volumeByMuscle(rows.map((r) => ({ set: toSetLikeRow(r.set), exercise: r.exercise }))) };
}
