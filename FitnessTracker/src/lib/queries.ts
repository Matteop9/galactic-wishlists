import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  bodyMetrics,
  cardioSessions,
  coachMemory,
  dailyMetrics,
  exercises,
  programmeChanges,
  rotationSlots,
  sets,
  settings,
  templateExercises,
  templates,
  workouts,
  type Exercise,
  type SetRow,
  type Template,
  type TemplateExercise,
  type Workout,
} from "@/db/schema";
import { londonDate } from "./dates";
import { trendSeries, weeklyRate, type TrendPoint } from "./trend";
import { weekStartOf } from "./stats";
import { bestE1rm, detectPrs, suggestNext, type SetLike } from "./training";

export const num = (v: string | number | null | undefined): number => (v == null ? 0 : Number(v));

// ---------- settings ----------

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value: value as object, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: value as object, updatedAt: new Date() } });
}

// ---------- exercises ----------

export async function listExercises(): Promise<Exercise[]> {
  return db.select().from(exercises).orderBy(asc(exercises.primaryMuscle), asc(exercises.name));
}

/** Fuzzy name match: exact → startsWith → includes → token overlap. */
export async function findExercise(name: string): Promise<Exercise | null> {
  const all = await listExercises();
  const q = name.trim().toLowerCase();
  if (!q) return null;
  const exact = all.find((e) => e.name.toLowerCase() === q);
  if (exact) return exact;
  const starts = all.find((e) => e.name.toLowerCase().startsWith(q));
  if (starts) return starts;
  const incl = all.find((e) => e.name.toLowerCase().includes(q));
  if (incl) return incl;
  const tokens = q.split(/\s+/).filter((t) => t.length > 2);
  let best: { e: Exercise; score: number } | null = null;
  for (const e of all) {
    const n = e.name.toLowerCase();
    const score = tokens.filter((t) => n.includes(t)).length;
    if (score > 0 && (!best || score > best.score)) best = { e, score };
  }
  return best?.e ?? null;
}

// ---------- programme ----------

export type ProgrammeTemplate = Template & { exercises: Array<TemplateExercise & { exercise: Exercise }> };

export async function getProgramme(): Promise<{ templates: ProgrammeTemplate[]; rotation: number[]; nextSlot: number }> {
  const ts = await db.select().from(templates).where(eq(templates.archived, false)).orderBy(asc(templates.id));
  const tes = ts.length
    ? await db
        .select({ te: templateExercises, exercise: exercises })
        .from(templateExercises)
        .innerJoin(exercises, eq(templateExercises.exerciseId, exercises.id))
        .where(inArray(templateExercises.templateId, ts.map((t) => t.id)))
        .orderBy(asc(templateExercises.position))
    : [];
  const rotation = await db.select().from(rotationSlots).orderBy(asc(rotationSlots.position));
  const nextSlot = await getSetting<number>("next_slot", 0);
  return {
    templates: ts.map((t) => ({
      ...t,
      exercises: tes.filter((r) => r.te.templateId === t.id).map((r) => ({ ...r.te, exercise: r.exercise })),
    })),
    rotation: rotation.map((r) => r.templateId),
    nextSlot,
  };
}

export async function getNextTemplate(): Promise<ProgrammeTemplate | null> {
  const p = await getProgramme();
  if (p.rotation.length === 0) return null;
  const id = p.rotation[p.nextSlot % p.rotation.length];
  return p.templates.find((t) => t.id === id) ?? null;
}

export async function advanceRotation(): Promise<void> {
  const p = await getProgramme();
  if (p.rotation.length === 0) return;
  await setSetting("next_slot", (p.nextSlot + 1) % p.rotation.length);
}

export async function logProgrammeChange(actor: string, summary: string, reason?: string, diff?: unknown) {
  await db.insert(programmeChanges).values({ actor, summary, reason: reason ?? null, diff: (diff as object) ?? null });
}

// ---------- workouts ----------

export type WorkoutWithSets = Workout & { sets: Array<SetRow & { exercise: Exercise }> };

export async function getActiveWorkout(): Promise<WorkoutWithSets | null> {
  const w = await db.query.workouts.findFirst({ where: isNull(workouts.endedAt), orderBy: desc(workouts.startedAt) });
  if (!w) return null;
  return { ...w, sets: await getWorkoutSets(w.id) };
}

export async function getWorkoutSets(workoutId: number) {
  const rows = await db
    .select({ set: sets, exercise: exercises })
    .from(sets)
    .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
    .where(eq(sets.workoutId, workoutId))
    .orderBy(asc(sets.id));
  return rows.map((r) => ({ ...r.set, exercise: r.exercise }));
}

export async function getWorkout(id: number): Promise<WorkoutWithSets | null> {
  const w = await db.query.workouts.findFirst({ where: eq(workouts.id, id) });
  if (!w) return null;
  return { ...w, sets: await getWorkoutSets(id) };
}

export function toSetLike(s: SetRow): SetLike {
  return { setType: s.setType, weightKg: num(s.weightKg), reps: s.reps, rir: s.rir, partialReps: s.partialReps };
}

/** Sets for an exercise from the most recent *finished* workout that included it. */
export async function getLastPerformance(exerciseId: number, excludeWorkoutId?: number) {
  const rows = await db
    .select({ set: sets, workout: workouts })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .where(and(eq(sets.exerciseId, exerciseId), excludeWorkoutId ? sql`${sets.workoutId} <> ${excludeWorkoutId}` : sql`true`))
    .orderBy(desc(workouts.startedAt), asc(sets.id))
    .limit(40);
  if (rows.length === 0) return null;
  const lastWorkoutId = rows[0].workout.id;
  const last = rows.filter((r) => r.workout.id === lastWorkoutId);
  return {
    workoutId: lastWorkoutId,
    date: londonDate(last[0].workout.startedAt),
    sets: last.map((r) => r.set),
  };
}

export async function getExerciseHistory(exerciseId: number, limit = 400): Promise<Array<SetRow & { date: string }>> {
  const rows = await db
    .select({ set: sets, startedAt: workouts.startedAt })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .where(eq(sets.exerciseId, exerciseId))
    .orderBy(desc(workouts.startedAt), asc(sets.id))
    .limit(limit);
  return rows.map((r) => ({ ...r.set, date: londonDate(r.startedAt) }));
}

export async function suggestForExercise(exerciseId: number, te?: TemplateExercise | null, excludeWorkoutId?: number) {
  const ex = await db.query.exercises.findFirst({ where: eq(exercises.id, exerciseId) });
  if (!ex) return null;
  const last = await getLastPerformance(exerciseId, excludeWorkoutId);
  const suggestion = suggestNext({
    repMin: te?.repMin ?? ex.defaultRepMin,
    repMax: te?.repMax ?? ex.defaultRepMax,
    targetRir: te?.targetRir ?? 1,
    incrementKg: num(ex.loadIncrementKg) || 2.5,
    lastSets: last ? last.sets.map(toSetLike) : [],
  });
  if (suggestion.weightKg === 0 && te?.targetWeightKg) suggestion.weightKg = num(te.targetWeightKg);
  return { exercise: ex, last, suggestion };
}

export async function logSet(input: {
  workoutId: number;
  exerciseId: number;
  weightKg: number;
  reps: number;
  rir?: number | null;
  setType?: string;
  partialReps?: number;
  side?: "L" | "R" | null;
  tempo?: string | null;
  note?: string | null;
}) {
  const history = await getExerciseHistory(input.exerciseId);
  const priorHistory = history.filter((h) => h.workoutId !== input.workoutId || true).map(toSetLike);
  const newSet: SetLike = {
    setType: input.setType ?? "working",
    weightKg: input.weightKg,
    reps: input.reps,
    rir: input.rir ?? null,
    partialReps: input.partialReps ?? 0,
  };
  const prs = detectPrs(newSet, priorHistory);
  const [row] = await db
    .insert(sets)
    .values({
      workoutId: input.workoutId,
      exerciseId: input.exerciseId,
      // Best-effort only: parallel tool calls can tie. Reads order by id (serial), never by position.
      position: sql`(select coalesce(max(${sets.position}), 0) + 1 from ${sets} where ${sets.workoutId} = ${input.workoutId})`,
      setType: newSet.setType,
      weightKg: String(input.weightKg),
      reps: input.reps,
      partialReps: input.partialReps ?? 0,
      rir: input.rir ?? null,
      side: input.side ?? null,
      tempo: input.tempo ?? null,
      note: input.note ?? null,
    })
    .returning();
  const ex = await db.query.exercises.findFirst({ where: eq(exercises.id, input.exerciseId) });
  return { set: row, exercise: ex!, prs, e1rm: bestE1rm([newSet]) };
}

export async function weekTally(date = londonDate()) {
  const start = weekStartOf(date);
  const startTs = new Date(`${start}T00:00:00Z`);
  const endTs = new Date(startTs.getTime() + 7 * 86_400_000);
  const lifts = await db
    .select({ n: sql<number>`count(*)` })
    .from(workouts)
    .where(and(gte(workouts.startedAt, startTs), lt(workouts.startedAt, endTs), sql`${workouts.endedAt} is not null`));
  const cardio = await db
    .select({ n: sql<number>`count(*)`, mins: sql<number>`coalesce(sum(${cardioSessions.durationMin}), 0)` })
    .from(cardioSessions)
    .where(and(gte(cardioSessions.performedAt, startTs), lt(cardioSessions.performedAt, endTs)));
  return {
    weekStart: start,
    lifts: Number(lifts[0]?.n ?? 0),
    cardio: Number(cardio[0]?.n ?? 0),
    cardioMinutes: Number(cardio[0]?.mins ?? 0),
    liftTarget: 3,
    cardioTarget: 3,
  };
}

// ---------- body ----------

export async function getWeighIns(days = 120) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(bodyMetrics)
    .where(gte(bodyMetrics.date, since))
    .orderBy(asc(bodyMetrics.date), desc(bodyMetrics.source));
  // one reading per day: prefer hae over manual
  const byDate = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!r.weightKg) continue;
    if (!byDate.has(r.date) || r.source === "hae") byDate.set(r.date, r);
  }
  return [...byDate.values()];
}

export async function getTrend(days = 120): Promise<{ points: TrendPoint[]; rate: number | null; latest: TrendPoint | null }> {
  const rows = await getWeighIns(days);
  const points = trendSeries(rows.map((r) => ({ date: r.date, weightKg: num(r.weightKg) })));
  return { points, rate: weeklyRate(points), latest: points[points.length - 1] ?? null };
}

export async function getDaily(date: string) {
  return db.query.dailyMetrics.findFirst({ where: eq(dailyMetrics.date, date) });
}

// ---------- memory ----------

export async function getMemory() {
  return db.select().from(coachMemory).orderBy(asc(coachMemory.category), asc(coachMemory.id));
}
