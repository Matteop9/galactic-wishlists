import "server-only";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { cardioSessions, exercises, programmeChanges, sets, workouts } from "@/db/schema";
import { getTrend, num, getProgramme } from "./queries";
import { weeklyRows, weeklyVolumeByMuscle } from "./weekly";
import { e1rm, setQualifiesForE1rm } from "./training";
import { londonDate } from "./dates";

export async function progressData() {
  const trend = await getTrend(120);
  const weeks = await weeklyRows(12);
  const vol = await weeklyVolumeByMuscle();

  // e1RM over time for the exercises with the most logged sessions (top 4)
  const since = new Date(Date.now() - 180 * 86_400_000);
  const rows = await db
    .select({ set: sets, exercise: exercises, startedAt: workouts.startedAt })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
    .where(and(gte(workouts.startedAt, since)))
    .orderBy(asc(workouts.startedAt));
  const perExercise = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const sl = { setType: r.set.setType, weightKg: num(r.set.weightKg), reps: r.set.reps, rir: r.set.rir };
    if (!setQualifiesForE1rm(sl)) continue;
    const date = londonDate(r.startedAt);
    const m = perExercise.get(r.exercise.name) ?? new Map<string, number>();
    m.set(date, Math.max(m.get(date) ?? 0, e1rm(sl.weightKg, sl.reps, sl.rir)));
    perExercise.set(r.exercise.name, m);
  }
  const lifts = [...perExercise.entries()]
    .map(([name, m]) => ({ name, points: [...m.entries()].map(([date, value]) => ({ date, value })) }))
    .filter((l) => l.points.length >= 2)
    .sort((a, b) => b.points.length - a.points.length)
    .slice(0, 4);

  const cardio = await db.select().from(cardioSessions).where(gte(cardioSessions.performedAt, since)).orderBy(asc(cardioSessions.performedAt));
  const cardioByMachine = new Map<string, Array<{ date: string; speed: number | null; rpe: number | null; minutes: number }>>();
  for (const c of cardio) {
    const dur = num(c.durationMin);
    const dist = c.distanceKm ? num(c.distanceKm) : null;
    const speed = c.avgSpeedKmh ? num(c.avgSpeedKmh) : dist && dur ? Math.round((dist / (dur / 60)) * 100) / 100 : null;
    const arr = cardioByMachine.get(c.machine) ?? [];
    arr.push({ date: londonDate(c.performedAt), speed, rpe: c.rpe, minutes: dur });
    cardioByMachine.set(c.machine, arr);
  }

  return {
    trend: trend.points.map((p) => ({ date: p.date, weight: p.weightKg, trend: p.trendKg })),
    rate: trend.rate,
    weeks,
    volume: vol,
    lifts,
    cardio: [...cardioByMachine.entries()].map(([machine, points]) => ({ machine, points })),
  };
}

export async function programmeData() {
  const p = await getProgramme();
  const changes = await db.select().from(programmeChanges).orderBy(desc(programmeChanges.createdAt)).limit(30);
  return { ...p, changes };
}
