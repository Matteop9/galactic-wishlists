import { tool } from "ai";
import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { sets, workouts, templateExercises } from "@/db/schema";
import {
  advanceRotation,
  findExercise,
  getActiveWorkout,
  getExerciseHistory,
  getLastPerformance,
  getProgramme,
  getWorkout,
  logSet,
  num,
  suggestForExercise,
  toSetLike,
} from "@/lib/queries";
import { describeExercise, estimateMinutes, sessionStart, setCurrentExercise } from "@/lib/pad";
import { SET_TYPES, bestE1rm, volumeLoad, platesPerSide } from "@/lib/training";
import { londonDate } from "@/lib/dates";

const setTypeSchema = z.enum(SET_TYPES as [string, ...string[]]);

export function serialiseSet(s: { id: number; setType: string; weightKg: string | number; reps: number; partialReps: number; rir: number | null; side: string | null; note?: string | null }) {
  return {
    id: s.id,
    setType: s.setType,
    weightKg: num(s.weightKg),
    reps: s.reps,
    partialReps: s.partialReps,
    rir: s.rir,
    side: s.side,
    note: s.note ?? null,
  };
}

export type SetInput = { weightKg: number; reps: number; rir: number | null; setType: string; partialReps: number; side: "L" | "R" | null; note?: string | null };

/**
 * Shared by log_set and the pad's server action so both produce the same card.
 * Logging also makes the exercise current. setNumber counts working sets only.
 */
export async function logSetForExercise(exerciseId: number, s: SetInput) {
  const active = await getActiveWorkout();
  if (!active) return { error: "No active workout — call start_workout first." as const };
  const te = active.templateId
    ? await db.query.templateExercises.findFirst({
        where: and(eq(templateExercises.templateId, active.templateId), eq(templateExercises.exerciseId, exerciseId)),
      })
    : null;
  const res = await logSet({
    workoutId: active.id,
    exerciseId,
    weightKg: s.weightKg,
    reps: s.reps,
    rir: s.rir,
    setType: s.setType,
    partialReps: s.partialReps,
    side: s.side,
    note: s.note ?? null,
  });
  const ex = res.exercise;
  if (active.currentExerciseId !== ex.id) await setCurrentExercise(active.id, ex.id);
  const mine = active.sets.filter((x) => x.exerciseId === ex.id);
  const isWarm = s.setType === "warmup";
  const restS = te?.restS ?? ex.defaultRestS;
  return {
    set: serialiseSet(res.set),
    exercise: ex.name,
    exerciseId: ex.id,
    e1rm: res.e1rm,
    prs: res.prs,
    /** Working-set number (warm-ups don't count). For a warm-up: working sets done so far. */
    setNumber: mine.filter((x) => x.setType !== "warmup").length + (isWarm ? 0 : 1),
    warmups: mine.filter((x) => x.setType === "warmup").length + (isWarm ? 1 : 0),
    plannedSets: te?.sets ?? null,
    restS: isWarm ? Math.min(60, restS) : restS,
    plates: ex.equipment === "barbell" ? platesPerSide(s.weightKg) : null,
  };
}

export const workoutTools = {
  start_workout: tool({
    description:
      "Start a lifting session. Defaults to the next template in the rotation; pass template_name to pick a specific one, or name only for a freestyle session. Pass the pre-session check-in (energy, time available, niggles) when you have it. Returns the plan with last-time numbers, today's suggested first working set and an estimated duration per exercise so you can trim to the time available.",
    inputSchema: z.object({
      template_name: z.string().optional().describe("Template to use, e.g. 'Push A'. Omit for the next in rotation."),
      name: z.string().optional().describe("Freestyle session name when no template applies."),
      energy: z.number().int().min(1).max(5).optional().describe("Pre-session energy 1-5"),
      time_available_min: z.number().int().min(10).max(240).optional(),
      notes: z.string().optional().describe("Niggles / constraints the user mentioned"),
    }),
    execute: async ({ template_name, name, energy, time_available_min, notes }) => {
      const active = await getActiveWorkout();
      if (active) return { error: "A workout is already in progress", workoutId: active.id, name: active.name };
      const p = await getProgramme();
      let template = template_name
        ? p.templates.find((t) => t.name.toLowerCase() === template_name.toLowerCase()) ??
          p.templates.find((t) => t.name.toLowerCase().includes(template_name.toLowerCase()))
        : p.rotation.length
          ? p.templates.find((t) => t.id === p.rotation[p.nextSlot % p.rotation.length])
          : undefined;
      if (template_name && !template) return { error: `No template called ${template_name}`, available: p.templates.map((t) => t.name) };
      if (!template && !name) template = undefined;
      const checkin = energy || time_available_min || notes ? { energy, timeMin: time_available_min, notes } : null;
      const [w] = await db
        .insert(workouts)
        .values({ templateId: template?.id ?? null, name: template?.name ?? name ?? "Freestyle", checkin })
        .returning();
      const plan = [];
      for (const te of template?.exercises ?? []) {
        const s = await suggestForExercise(te.exerciseId, te, w.id);
        const restS = te.restS ?? te.exercise.defaultRestS;
        plan.push({
          exerciseId: te.exerciseId,
          exercise: te.exercise.name,
          sets: te.sets,
          repRange: `${te.repMin}-${te.repMax}`,
          targetRir: te.targetRir,
          technique: te.technique,
          restS,
          estimatedMin: estimateMinutes([{ sets: te.sets, restS }]),
          last: s?.last ? { date: s.last.date, sets: s.last.sets.map(serialiseSet) } : null,
          suggested: s?.suggestion ?? null,
        });
      }
      return {
        workoutId: w.id,
        name: w.name,
        templateId: template?.id ?? null,
        startedAt: w.startedAt.toISOString(),
        checkin,
        estimatedMin: estimateMinutes(plan),
        timeAvailableMin: time_available_min ?? null,
        plan,
      };
    },
  }),

  start_exercise: tool({
    description:
      "Make an exercise the current one. This opens the set pad (tap entry for weight/reps/RIR) and shows a card with the prescription, last session's top set and today's suggestion. Call it for the first exercise right after start_workout, and every time the user moves to another exercise (names it, says done/next). Shorthand like '60x10' and the pad then log to this exercise.",
    inputSchema: z.object({ exercise: z.string() }),
    execute: async ({ exercise }) => {
      const active = await getActiveWorkout();
      if (!active) return { error: "No active workout — call start_workout first." };
      const ex = await findExercise(exercise);
      if (!ex) return { error: `Unknown exercise '${exercise}'. Use add_exercise or pick one from the library.` };
      await setCurrentExercise(active.id, ex.id);
      const d = await describeExercise(active, ex.id);
      return { workoutId: active.id, ...d! };
    },
  }),

  log_set: tool({
    description:
      "Log one set in the active workout. Use exercise names from the plan/library (fuzzy match ok). weight_kg 0 = bodyweight. rir = reps in reserve (0 = failure). set_type defaults to working; use warmup/drop/myo_mini/partials/backoff/top/failure when the user says so. Logging also makes that exercise the current one. Returns the saved set, the working-set number (warm-ups excluded), PRs and the rest to take.",
    inputSchema: z.object({
      exercise: z.string(),
      weight_kg: z.number().min(0),
      reps: z.number().int().min(0),
      rir: z.number().int().min(0).max(5).nullable().optional(),
      set_type: setTypeSchema.optional(),
      partial_reps: z.number().int().min(0).optional(),
      side: z.enum(["L", "R"]).nullable().optional(),
      note: z.string().optional(),
    }),
    execute: async (input) => {
      const ex = await findExercise(input.exercise);
      if (!ex) return { error: `Unknown exercise '${input.exercise}'. Ask the user or use add_exercise.` };
      return logSetForExercise(ex.id, {
        weightKg: input.weight_kg,
        reps: input.reps,
        rir: input.rir ?? null,
        setType: input.set_type ?? "working",
        partialReps: input.partial_reps ?? 0,
        side: input.side ?? null,
        note: input.note ?? null,
      });
    },
  }),

  edit_set: tool({
    description: "Correct a logged set by id (from a previous log_set result or the active workout). Only the fields given change.",
    inputSchema: z.object({
      set_id: z.number().int(),
      weight_kg: z.number().min(0).optional(),
      reps: z.number().int().min(0).optional(),
      rir: z.number().int().min(0).max(5).nullable().optional(),
      set_type: setTypeSchema.optional(),
      partial_reps: z.number().int().min(0).optional(),
      note: z.string().optional(),
    }),
    execute: async ({ set_id, ...patch }) => {
      const upd: Partial<typeof sets.$inferInsert> = {};
      if (patch.weight_kg != null) upd.weightKg = String(patch.weight_kg);
      if (patch.reps != null) upd.reps = patch.reps;
      if (patch.rir !== undefined) upd.rir = patch.rir;
      if (patch.set_type) upd.setType = patch.set_type;
      if (patch.partial_reps != null) upd.partialReps = patch.partial_reps;
      if (patch.note != null) upd.note = patch.note;
      const [row] = await db.update(sets).set(upd).where(eq(sets.id, set_id)).returning();
      if (!row) return { error: `No set ${set_id}` };
      return { set: serialiseSet(row) };
    },
  }),

  delete_set: tool({
    description: "Delete one logged set by id. Prefer this over undo_last_set when you know which set is wrong.",
    inputSchema: z.object({ set_id: z.number().int() }),
    execute: async ({ set_id }) => {
      const [row] = await db.delete(sets).where(eq(sets.id, set_id)).returning();
      if (!row) return { error: `Set ${set_id} is already gone.` };
      return { deleted: serialiseSet(row), setId: set_id };
    },
  }),

  undo_last_set: tool({
    description: "Delete the most recently logged set in the active workout. One at a time, never in parallel.",
    inputSchema: z.object({}),
    execute: async () => {
      const active = await getActiveWorkout();
      if (!active || active.sets.length === 0) return { error: "Nothing to undo." };
      const last = active.sets[active.sets.length - 1];
      const [row] = await db.delete(sets).where(eq(sets.id, last.id)).returning();
      if (!row) return { error: "That set was already removed." };
      return { deleted: serialiseSet(last), exercise: last.exercise.name };
    },
  }),

  get_last_performance: tool({
    description: "What the user did last time on an exercise (sets, weight, reps, RIR) plus the double-progression suggestion for today.",
    inputSchema: z.object({ exercise: z.string() }),
    execute: async ({ exercise }) => {
      const ex = await findExercise(exercise);
      if (!ex) return { error: `Unknown exercise '${exercise}'` };
      const active = await getActiveWorkout();
      const te = active?.templateId
        ? await db.query.templateExercises.findFirst({
            where: and(eq(templateExercises.templateId, active.templateId), eq(templateExercises.exerciseId, ex.id)),
          })
        : null;
      const s = await suggestForExercise(ex.id, te ?? null, active?.id);
      const history = await getExerciseHistory(ex.id, 200);
      return {
        exercise: ex.name,
        exerciseId: ex.id,
        last: s?.last ? { date: s.last.date, sets: s.last.sets.map(serialiseSet) } : null,
        suggestion: s?.suggestion ?? null,
        bestE1rm: bestE1rm(history.map(toSetLike)),
        sessionsLogged: new Set(history.map((h) => h.workoutId)).size,
      };
    },
  }),

  get_active_workout: tool({
    description: "The in-progress workout with every set logged so far, grouped by exercise, the current exercise, and what's left on the plan.",
    inputSchema: z.object({}),
    execute: async () => {
      const active = await getActiveWorkout();
      if (!active) return { active: false };
      const p = active.templateId ? await getProgramme() : null;
      const template = p?.templates.find((t) => t.id === active.templateId);
      const byExercise: Record<string, ReturnType<typeof serialiseSet>[]> = {};
      for (const s of active.sets) (byExercise[s.exercise.name] ??= []).push(serialiseSet(s));
      const workingDone = (name: string) => byExercise[name]?.filter((s) => s.setType !== "warmup").length ?? 0;
      const remaining = (template?.exercises ?? [])
        .filter((te) => workingDone(te.exercise.name) < te.sets)
        .map((te) => ({ exercise: te.exercise.name, sets: te.sets, done: workingDone(te.exercise.name), repRange: `${te.repMin}-${te.repMax}`, targetRir: te.targetRir, technique: te.technique }));
      const current = active.currentExerciseId ? (await describeExercise(active, active.currentExerciseId))?.name ?? null : null;
      return {
        active: true,
        workoutId: active.id,
        name: active.name,
        startedAt: active.startedAt.toISOString(),
        minutesElapsed: Math.round((Date.now() - sessionStart(active).getTime()) / 60000),
        checkin: active.checkin,
        currentExercise: current,
        sets: byExercise,
        remaining,
      };
    },
  }),

  finish_workout: tool({
    description:
      "End the active workout. Advances the rotation and returns the summary (working sets, volume, top sets, e1RMs). Do not ask for session RPE first: the summary card collects it. Pass it only if the user already said it.",
    inputSchema: z.object({
      session_rpe: z.number().int().min(1).max(10).optional(),
      notes: z.string().optional(),
    }),
    execute: async ({ session_rpe, notes }) => {
      const active = await getActiveWorkout();
      if (!active) return { error: "No active workout." };
      const [w] = await db
        .update(workouts)
        .set({ endedAt: new Date(), sessionRpe: session_rpe ?? null, notes: notes ?? null, currentExerciseId: null })
        .where(and(eq(workouts.id, active.id), isNull(workouts.endedAt)))
        .returning();
      if (w.templateId) await advanceRotation();
      const full = await getWorkout(w.id);
      const byExercise = new Map<string, typeof active.sets>();
      for (const s of full!.sets) byExercise.set(s.exercise.name, [...(byExercise.get(s.exercise.name) ?? []), s]);
      const exercisesOut = [...byExercise.entries()].map(([name, ss]) => {
        const working = ss.filter((s) => s.setType !== "warmup");
        const pool = working.length ? working : ss;
        return {
          exercise: name,
          sets: working.length,
          topSet: pool.reduce((b, s) => (num(s.weightKg) * s.reps > num(b.weightKg) * b.reps ? s : b), pool[0]),
          e1rm: bestE1rm(ss.map(toSetLike)),
        };
      });
      return {
        workoutId: w.id,
        name: w.name,
        date: londonDate(w.startedAt),
        durationMin: Math.round((w.endedAt!.getTime() - sessionStart(full!).getTime()) / 60000),
        totalSets: full!.sets.filter((s) => s.setType !== "warmup").length,
        volumeLoad: Math.round(volumeLoad(full!.sets.map(toSetLike))),
        sessionRpe: w.sessionRpe,
        checkin: w.checkin,
        exercises: exercisesOut.map((e) => ({ ...e, topSet: serialiseSet(e.topSet) })),
      };
    },
  }),

  edit_workout: tool({
    description: "Fix a finished session: duration in minutes, session RPE, notes. Defaults to the most recent finished workout.",
    inputSchema: z.object({
      workout_id: z.number().int().optional(),
      duration_min: z.number().int().min(1).max(600).optional(),
      session_rpe: z.number().int().min(1).max(10).optional(),
      notes: z.string().optional(),
    }),
    execute: async ({ workout_id, duration_min, session_rpe, notes }) => {
      const w = workout_id
        ? await db.query.workouts.findFirst({ where: eq(workouts.id, workout_id) })
        : (await db.query.workouts.findMany({ orderBy: desc(workouts.startedAt), limit: 3 })).find((x) => x.endedAt);
      if (!w || !w.endedAt) return { error: "No finished workout to edit." };
      const upd: Partial<typeof workouts.$inferInsert> = {};
      if (duration_min != null) upd.startedAt = new Date(w.endedAt.getTime() - duration_min * 60000);
      if (session_rpe != null) upd.sessionRpe = session_rpe;
      if (notes != null) upd.notes = notes;
      const [row] = await db.update(workouts).set(upd).where(eq(workouts.id, w.id)).returning();
      return { workoutId: row.id, name: row.name, durationMin: Math.round((row.endedAt!.getTime() - row.startedAt.getTime()) / 60000), sessionRpe: row.sessionRpe, notes: row.notes };
    },
  }),

  get_recent_workouts: tool({
    description: "List recent finished workouts (date, name, sets, volume).",
    inputSchema: z.object({ limit: z.number().int().min(1).max(30).optional() }),
    execute: async ({ limit }) => {
      const rows = await db.query.workouts.findMany({ orderBy: (w, { desc }) => desc(w.startedAt), limit: limit ?? 10 });
      const out = [];
      for (const w of rows) {
        const full = await getWorkout(w.id);
        out.push({
          id: w.id,
          name: w.name,
          date: londonDate(w.startedAt),
          finished: !!w.endedAt,
          sets: full!.sets.length,
          volumeLoad: Math.round(volumeLoad(full!.sets.map(toSetLike))),
          sessionRpe: w.sessionRpe,
        });
      }
      return out;
    },
  }),

  get_last_performance_batch: tool({
    description: "Last-time numbers for several exercises at once (used when previewing a session).",
    inputSchema: z.object({ exercises: z.array(z.string()).max(12) }),
    execute: async ({ exercises: names }) => {
      const out = [];
      for (const n of names) {
        const ex = await findExercise(n);
        if (!ex) {
          out.push({ exercise: n, error: "unknown" });
          continue;
        }
        const last = await getLastPerformance(ex.id);
        out.push({ exercise: ex.name, last: last ? { date: last.date, sets: last.sets.map(serialiseSet) } : null });
      }
      return out;
    },
  }),
};
