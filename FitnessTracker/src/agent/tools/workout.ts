import { tool } from "ai";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
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

export const workoutTools = {
  start_workout: tool({
    description:
      "Start a lifting session. Defaults to the next template in the rotation; pass template_name to pick a specific one, or name only for a freestyle session. Returns the planned exercises with last-time numbers and today's suggested first working set for each.",
    inputSchema: z.object({
      template_name: z.string().optional().describe("Template to use, e.g. 'Push A'. Omit for the next in rotation."),
      name: z.string().optional().describe("Freestyle session name when no template applies."),
    }),
    execute: async ({ template_name, name }) => {
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
      const [w] = await db
        .insert(workouts)
        .values({ templateId: template?.id ?? null, name: template?.name ?? name ?? "Freestyle" })
        .returning();
      const plan = [];
      for (const te of template?.exercises ?? []) {
        const s = await suggestForExercise(te.exerciseId, te, w.id);
        plan.push({
          exerciseId: te.exerciseId,
          exercise: te.exercise.name,
          sets: te.sets,
          repRange: `${te.repMin}-${te.repMax}`,
          targetRir: te.targetRir,
          technique: te.technique,
          restS: te.restS ?? te.exercise.defaultRestS,
          last: s?.last ? { date: s.last.date, sets: s.last.sets.map(serialiseSet) } : null,
          suggested: s?.suggestion ?? null,
        });
      }
      return { workoutId: w.id, name: w.name, templateId: template?.id ?? null, startedAt: w.startedAt.toISOString(), plan };
    },
  }),

  log_set: tool({
    description:
      "Log one set in the active workout. Use exercise names from the plan/library (fuzzy match ok). weight_kg 0 = bodyweight. rir = reps in reserve (0 = failure). set_type defaults to working; use warmup/drop/myo_mini/partials/backoff/top/failure when the user says so. Returns the saved set plus any PRs and the rest to take.",
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
      const active = await getActiveWorkout();
      if (!active) return { error: "No active workout — call start_workout first." };
      const ex = await findExercise(input.exercise);
      if (!ex) return { error: `Unknown exercise '${input.exercise}'. Ask the user or use add_exercise.` };
      const te = active.templateId
        ? await db.query.templateExercises.findFirst({
            where: and(eq(templateExercises.templateId, active.templateId), eq(templateExercises.exerciseId, ex.id)),
          })
        : null;
      const res = await logSet({
        workoutId: active.id,
        exerciseId: ex.id,
        weightKg: input.weight_kg,
        reps: input.reps,
        rir: input.rir ?? null,
        setType: input.set_type ?? "working",
        partialReps: input.partial_reps ?? 0,
        side: input.side ?? null,
        note: input.note ?? null,
      });
      const doneThisExercise = active.sets.filter((s) => s.exerciseId === ex.id).length + 1;
      const restS = te?.restS ?? ex.defaultRestS;
      return {
        set: serialiseSet(res.set),
        exercise: ex.name,
        exerciseId: ex.id,
        e1rm: res.e1rm,
        prs: res.prs,
        setNumber: doneThisExercise,
        plannedSets: te?.sets ?? null,
        restS: input.set_type === "warmup" ? Math.min(60, restS) : restS,
        plates: ex.equipment === "barbell" ? platesPerSide(input.weight_kg) : null,
      };
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

  undo_last_set: tool({
    description: "Delete the most recently logged set in the active workout.",
    inputSchema: z.object({}),
    execute: async () => {
      const active = await getActiveWorkout();
      if (!active || active.sets.length === 0) return { error: "Nothing to undo." };
      const last = active.sets[active.sets.length - 1];
      await db.delete(sets).where(eq(sets.id, last.id));
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
    description: "The in-progress workout with every set logged so far, grouped by exercise, and what's left on the plan.",
    inputSchema: z.object({}),
    execute: async () => {
      const active = await getActiveWorkout();
      if (!active) return { active: false };
      const p = active.templateId ? await getProgramme() : null;
      const template = p?.templates.find((t) => t.id === active.templateId);
      const byExercise: Record<string, ReturnType<typeof serialiseSet>[]> = {};
      for (const s of active.sets) (byExercise[s.exercise.name] ??= []).push(serialiseSet(s));
      const remaining = (template?.exercises ?? [])
        .filter((te) => (byExercise[te.exercise.name]?.filter((s) => s.setType !== "warmup").length ?? 0) < te.sets)
        .map((te) => ({ exercise: te.exercise.name, sets: te.sets, done: byExercise[te.exercise.name]?.length ?? 0, repRange: `${te.repMin}-${te.repMax}`, targetRir: te.targetRir, technique: te.technique }));
      return {
        active: true,
        workoutId: active.id,
        name: active.name,
        startedAt: active.startedAt.toISOString(),
        minutesElapsed: Math.round((Date.now() - active.startedAt.getTime()) / 60000),
        sets: byExercise,
        remaining,
      };
    },
  }),

  finish_workout: tool({
    description: "End the active workout. Records session RPE and notes, advances the rotation, and returns the summary (volume, PRs, e1RM highlights).",
    inputSchema: z.object({
      session_rpe: z.number().int().min(1).max(10).optional(),
      notes: z.string().optional(),
    }),
    execute: async ({ session_rpe, notes }) => {
      const active = await getActiveWorkout();
      if (!active) return { error: "No active workout." };
      const [w] = await db
        .update(workouts)
        .set({ endedAt: new Date(), sessionRpe: session_rpe ?? null, notes: notes ?? null })
        .where(and(eq(workouts.id, active.id), isNull(workouts.endedAt)))
        .returning();
      if (w.templateId) await advanceRotation();
      const full = await getWorkout(w.id);
      const byExercise = new Map<string, typeof active.sets>();
      for (const s of full!.sets) byExercise.set(s.exercise.name, [...(byExercise.get(s.exercise.name) ?? []), s]);
      const exercisesOut = [...byExercise.entries()].map(([name, ss]) => ({
        exercise: name,
        sets: ss.length,
        topSet: ss.reduce((b, s) => (num(s.weightKg) * s.reps > num(b.weightKg) * b.reps ? s : b), ss[0]),
        e1rm: bestE1rm(ss.map(toSetLike)),
      }));
      return {
        workoutId: w.id,
        name: w.name,
        date: londonDate(w.startedAt),
        durationMin: Math.round((w.endedAt!.getTime() - w.startedAt.getTime()) / 60000),
        totalSets: full!.sets.length,
        volumeLoad: Math.round(volumeLoad(full!.sets.map(toSetLike))),
        exercises: exercisesOut.map((e) => ({ ...e, topSet: serialiseSet(e.topSet) })),
      };
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
