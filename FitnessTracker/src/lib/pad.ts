// The "set pad": everything the client needs to log sets for the current
// exercise without a model call, plus the same shape the start_exercise tool
// returns so the chat card and the pad agree.
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, workouts } from "@/db/schema";
import { getProgramme, num, suggestForExercise, type WorkoutWithSets } from "./queries";

export type PadSet = { weightKg: number; reps: number; rir: number | null; setType: string };

export type PadExercise = {
  exerciseId: number;
  name: string;
  equipment: string;
  isUnilateral: boolean;
  incrementKg: number;
  sets: number;
  done: number; // working sets logged this session (warm-ups excluded)
  warmups: number;
  repMin: number;
  repMax: number;
  targetRir: number;
  technique: string | null;
  restS: number;
  /** Last set logged this session on this exercise (any type). */
  last: PadSet | null;
  /** Top working set from the previous session. */
  previous: { date: string; top: PadSet; sets: number } | null;
  suggested: { weightKg: number; reps: number; rir: number; reason: string } | null;
};

export type PadPlanItem = { exerciseId: number; name: string; sets: number; done: number; position: number };

export type PadData = {
  workoutId: number;
  name: string;
  current: PadExercise | null;
  plan: PadPlanItem[];
};

export async function describeExercise(active: WorkoutWithSets, exerciseId: number): Promise<PadExercise | null> {
  const ex = await db.query.exercises.findFirst({ where: eq(exercises.id, exerciseId) });
  if (!ex) return null;
  const p = active.templateId ? await getProgramme() : null;
  const te = p?.templates.find((t) => t.id === active.templateId)?.exercises.find((e) => e.exerciseId === exerciseId) ?? null;
  const mine = active.sets.filter((s) => s.exerciseId === exerciseId);
  const lastRow = mine.at(-1);
  const s = await suggestForExercise(exerciseId, te, active.id);
  const prevWorking = s?.last?.sets.filter((x) => x.setType !== "warmup") ?? [];
  const top = prevWorking.length ? prevWorking.reduce((b, x) => (num(x.weightKg) * x.reps > num(b.weightKg) * b.reps ? x : b), prevWorking[0]) : null;
  return {
    exerciseId,
    name: ex.name,
    equipment: ex.equipment,
    isUnilateral: ex.isUnilateral,
    incrementKg: num(ex.loadIncrementKg) || 2.5,
    sets: te?.sets ?? 3,
    done: mine.filter((x) => x.setType !== "warmup").length,
    warmups: mine.filter((x) => x.setType === "warmup").length,
    repMin: te?.repMin ?? ex.defaultRepMin,
    repMax: te?.repMax ?? ex.defaultRepMax,
    targetRir: te?.targetRir ?? 1,
    technique: te?.technique ?? null,
    restS: te?.restS ?? ex.defaultRestS,
    last: lastRow ? { weightKg: num(lastRow.weightKg), reps: lastRow.reps, rir: lastRow.rir, setType: lastRow.setType } : null,
    previous: s?.last && top ? { date: s.last.date, top: { weightKg: num(top.weightKg), reps: top.reps, rir: top.rir, setType: top.setType }, sets: prevWorking.length } : null,
    suggested: s?.suggestion && s.suggestion.weightKg > 0 ? s.suggestion : null,
  };
}

export async function planFor(active: WorkoutWithSets): Promise<PadPlanItem[]> {
  if (!active.templateId) return [];
  const p = await getProgramme();
  const t = p.templates.find((x) => x.id === active.templateId);
  if (!t) return [];
  return t.exercises.map((te) => ({
    exerciseId: te.exerciseId,
    name: te.exercise.name,
    sets: te.sets,
    done: active.sets.filter((s) => s.exerciseId === te.exerciseId && s.setType !== "warmup").length,
    position: te.position,
  }));
}

export async function buildPad(active: WorkoutWithSets): Promise<PadData> {
  const [plan, current] = await Promise.all([planFor(active), active.currentExerciseId ? describeExercise(active, active.currentExerciseId) : Promise.resolve(null)]);
  return { workoutId: active.id, name: active.name, current, plan };
}

/** Next planned exercise with working sets left, after the current one in order; wraps to the first incomplete. */
export function pickNextExercise(plan: PadPlanItem[], currentExerciseId: number | null): PadPlanItem | null {
  const incomplete = plan.filter((p) => p.done < p.sets);
  if (incomplete.length === 0) return null;
  const idx = plan.findIndex((p) => p.exerciseId === currentExerciseId);
  const after = incomplete.find((p) => plan.indexOf(p) > idx);
  return after ?? incomplete[0];
}

export async function setCurrentExercise(workoutId: number, exerciseId: number | null): Promise<void> {
  await db.update(workouts).set({ currentExerciseId: exerciseId }).where(eq(workouts.id, workoutId));
}

/** Session clock starts at the first logged set, not at start_workout (which is often tapped on the bus). */
export function sessionStart(active: { startedAt: Date; sets: Array<{ completedAt: Date }> }): Date {
  const first = active.sets[0]?.completedAt;
  return first && first.getTime() > active.startedAt.getTime() ? first : active.startedAt;
}

/** Rough session length: per set, rest plus ~45 s of work; warm-ups add a flat 4 min per exercise. */
export function estimateMinutes(items: Array<{ sets: number; restS: number }>): number {
  return Math.round(items.reduce((a, i) => a + i.sets * (i.restS + 45) / 60 + 4, 0));
}
