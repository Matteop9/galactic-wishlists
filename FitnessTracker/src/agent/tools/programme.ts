import { tool } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, rotationSlots, templateExercises, templates } from "@/db/schema";
import { findExercise, getProgramme, getSetting, listExercises, logProgrammeChange, setSetting } from "@/lib/queries";
import { MUSCLES, REFERENCE_PROGRAMME } from "@/db/seed-data";

const techniqueSchema = z.enum(["lengthened_partials", "myo_reps", "drop_set", "none"]);

const templateExerciseInput = z.object({
  exercise: z.string().describe("Exercise name from the library (fuzzy match ok)"),
  sets: z.number().int().min(1).max(8),
  rep_min: z.number().int().min(1).max(50),
  rep_max: z.number().int().min(1).max(60),
  target_rir: z.number().int().min(0).max(4),
  technique: techniqueSchema.optional().describe("Last-set intensity technique"),
  rest_s: z.number().int().min(30).max(300).optional(),
  superset_group: z.string().optional().describe("Same label on two exercises = superset"),
  target_weight_kg: z.number().min(0).optional().describe("Starting working weight if known"),
  notes: z.string().optional(),
});

async function resolveExercises(items: z.infer<typeof templateExerciseInput>[]) {
  const resolved = [];
  const unknown: string[] = [];
  for (const it of items) {
    const ex = await findExercise(it.exercise);
    if (!ex) unknown.push(it.exercise);
    else resolved.push({ it, ex });
  }
  return { resolved, unknown };
}

export function serialiseProgramme(p: Awaited<ReturnType<typeof getProgramme>>) {
  return {
    nextUp: p.rotation.length ? p.templates.find((t) => t.id === p.rotation[p.nextSlot % p.rotation.length])?.name ?? null : null,
    rotation: p.rotation.map((id) => p.templates.find((t) => t.id === id)?.name ?? `#${id}`),
    templates: p.templates.map((t) => ({
      id: t.id,
      name: t.name,
      kind: t.kind,
      notes: t.notes,
      exercises: t.exercises.map((e) => ({
        exercise: e.exercise.name,
        primaryMuscle: e.exercise.primaryMuscle,
        sets: e.sets,
        repRange: `${e.repMin}-${e.repMax}`,
        targetRir: e.targetRir,
        technique: e.technique,
        restS: e.restS ?? e.exercise.defaultRestS,
        supersetGroup: e.supersetGroup,
        targetWeightKg: e.targetWeightKg ? Number(e.targetWeightKg) : null,
        notes: e.notes,
      })),
    })),
  };
}

export const programmeTools = {
  get_programme: tool({
    description: "The current programme: every template with exercises/sets/reps/RIR/technique, the rotation order and what's next.",
    inputSchema: z.object({}),
    execute: async () => serialiseProgramme(await getProgramme()),
  }),

  list_exercises: tool({
    description: "Exercise library (name, primary/secondary muscles, equipment, default rest and rep range). Filter by muscle or equipment.",
    inputSchema: z.object({ muscle: z.enum(MUSCLES).optional(), equipment: z.string().optional() }),
    execute: async ({ muscle, equipment }) => {
      const all = await listExercises();
      return all
        .filter((e) => (!muscle || e.primaryMuscle === muscle || e.secondaryMuscles.includes(muscle)) && (!equipment || e.equipment === equipment))
        .map((e) => ({ name: e.name, primary: e.primaryMuscle, secondary: e.secondaryMuscles, equipment: e.equipment, reps: `${e.defaultRepMin}-${e.defaultRepMax}`, restS: e.defaultRestS, unilateral: e.isUnilateral, notes: e.notes }));
    },
  }),

  add_exercise: tool({
    description: "Add a custom exercise to the library (e.g. a machine at the user's gym that isn't listed).",
    inputSchema: z.object({
      name: z.string().min(3),
      primary_muscle: z.enum(MUSCLES),
      secondary_muscles: z.array(z.enum(MUSCLES)).optional(),
      equipment: z.enum(["barbell", "dumbbell", "cable", "machine", "smith", "bodyweight", "other"]),
      is_unilateral: z.boolean().optional(),
      rest_s: z.number().int().optional(),
      rep_min: z.number().int().optional(),
      rep_max: z.number().int().optional(),
      load_increment_kg: z.number().optional(),
      notes: z.string().optional(),
    }),
    execute: async (i) => {
      const [row] = await db
        .insert(exercises)
        .values({
          name: i.name,
          primaryMuscle: i.primary_muscle,
          secondaryMuscles: i.secondary_muscles ?? [],
          equipment: i.equipment,
          isUnilateral: i.is_unilateral ?? false,
          defaultRestS: i.rest_s ?? 120,
          defaultRepMin: i.rep_min ?? 8,
          defaultRepMax: i.rep_max ?? 12,
          loadIncrementKg: String(i.load_increment_kg ?? 2.5),
          notes: i.notes ?? null,
          isCustom: true,
        })
        .onConflictDoNothing()
        .returning();
      return row ? { added: row.name, id: row.id } : { error: "An exercise with that name already exists" };
    },
  }),

  upsert_template: tool({
    description:
      "Create or completely replace a workout template (e.g. 'Push A'). The exercise list given becomes the whole template, in order. You own the programme — use this freely, but always give a reason; it is shown to the user as a change card.",
    inputSchema: z.object({
      name: z.string().min(2),
      kind: z.enum(["push", "pull", "legs", "upper", "lower", "full", "arms", "other"]),
      exercises: z.array(templateExerciseInput).min(1).max(12),
      notes: z.string().optional(),
      reason: z.string().min(5).describe("Why — shown to the user"),
      actor: z.enum(["coach", "weekly_review", "onboarding"]).optional(),
    }),
    execute: async (i) => {
      const { resolved, unknown } = await resolveExercises(i.exercises);
      if (unknown.length) return { error: `Unknown exercises: ${unknown.join(", ")}. Use list_exercises or add_exercise first.` };
      const existing = await db.query.templates.findFirst({ where: eq(templates.name, i.name) });
      const before = existing ? (await getProgramme()).templates.find((t) => t.id === existing.id) : null;
      let templateId: number;
      if (existing) {
        templateId = existing.id;
        await db.update(templates).set({ kind: i.kind, notes: i.notes ?? null, archived: false, updatedAt: new Date() }).where(eq(templates.id, templateId));
        await db.delete(templateExercises).where(eq(templateExercises.templateId, templateId));
      } else {
        const [t] = await db.insert(templates).values({ name: i.name, kind: i.kind, notes: i.notes ?? null }).returning();
        templateId = t.id;
      }
      await db.insert(templateExercises).values(
        resolved.map(({ it, ex }, idx) => ({
          templateId,
          exerciseId: ex.id,
          position: idx + 1,
          sets: it.sets,
          repMin: it.rep_min,
          repMax: it.rep_max,
          targetRir: it.target_rir,
          technique: it.technique && it.technique !== "none" ? it.technique : null,
          restS: it.rest_s ?? null,
          supersetGroup: it.superset_group ?? null,
          targetWeightKg: it.target_weight_kg != null ? String(it.target_weight_kg) : null,
          notes: it.notes ?? null,
        })),
      );
      const after = (await getProgramme()).templates.find((t) => t.id === templateId)!;
      await logProgrammeChange(i.actor ?? "coach", `${existing ? "Updated" : "Created"} ${i.name}`, i.reason, {
        before: before ? before.exercises.map((e) => `${e.exercise.name} ${e.sets}×${e.repMin}-${e.repMax} @${e.targetRir}${e.technique ? " " + e.technique : ""}`) : null,
        after: after.exercises.map((e) => `${e.exercise.name} ${e.sets}×${e.repMin}-${e.repMax} @${e.targetRir}${e.technique ? " " + e.technique : ""}`),
      });
      return { templateId, name: i.name, exercises: after.exercises.length, change: `${existing ? "Updated" : "Created"} ${i.name}`, reason: i.reason };
    },
  }),

  set_exercise_targets: tool({
    description: "Adjust one exercise inside a template without rewriting the template: sets, rep range, RIR, technique, rest, or target weight.",
    inputSchema: z.object({
      template_name: z.string(),
      exercise: z.string(),
      sets: z.number().int().min(1).max(8).optional(),
      rep_min: z.number().int().optional(),
      rep_max: z.number().int().optional(),
      target_rir: z.number().int().min(0).max(4).optional(),
      technique: techniqueSchema.optional(),
      rest_s: z.number().int().optional(),
      target_weight_kg: z.number().min(0).optional(),
      reason: z.string().min(5),
      actor: z.enum(["coach", "weekly_review", "onboarding"]).optional(),
    }),
    execute: async (i) => {
      const p = await getProgramme();
      const t = p.templates.find((x) => x.name.toLowerCase() === i.template_name.toLowerCase());
      if (!t) return { error: `No template ${i.template_name}` };
      const ex = await findExercise(i.exercise);
      const te = ex ? t.exercises.find((e) => e.exerciseId === ex.id) : undefined;
      if (!te) return { error: `${i.exercise} isn't in ${t.name}` };
      const set: Partial<typeof templateExercises.$inferInsert> = {};
      if (i.sets != null) set.sets = i.sets;
      if (i.rep_min != null) set.repMin = i.rep_min;
      if (i.rep_max != null) set.repMax = i.rep_max;
      if (i.target_rir != null) set.targetRir = i.target_rir;
      if (i.technique) set.technique = i.technique === "none" ? null : i.technique;
      if (i.rest_s != null) set.restS = i.rest_s;
      if (i.target_weight_kg != null) set.targetWeightKg = String(i.target_weight_kg);
      await db.update(templateExercises).set(set).where(eq(templateExercises.id, te.id));
      const summary = `${t.name}: ${te.exercise.name} → ${Object.entries(set)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`;
      await logProgrammeChange(i.actor ?? "coach", summary, i.reason, { templateExerciseId: te.id, set });
      return { ok: true, change: summary, reason: i.reason };
    },
  }),

  set_rotation: tool({
    description: "Set the order workouts are cycled through (template names) and optionally which one is next. 3 lifting days/week with A/B variants = ['Push A','Pull A','Legs A','Push B','Pull B','Legs B'].",
    inputSchema: z.object({ order: z.array(z.string()).min(1).max(12), next: z.string().optional(), reason: z.string().min(5), actor: z.enum(["coach", "weekly_review", "onboarding"]).optional() }),
    execute: async ({ order, next, reason, actor }) => {
      const p = await getProgramme();
      const ids: number[] = [];
      for (const n of order) {
        const t = p.templates.find((x) => x.name.toLowerCase() === n.toLowerCase());
        if (!t) return { error: `No template ${n}`, available: p.templates.map((t) => t.name) };
        ids.push(t.id);
      }
      await db.delete(rotationSlots);
      await db.insert(rotationSlots).values(ids.map((templateId, position) => ({ templateId, position })));
      const nextIdx = next ? order.findIndex((n) => n.toLowerCase() === next.toLowerCase()) : 0;
      await setSetting("next_slot", Math.max(0, nextIdx));
      await logProgrammeChange(actor ?? "coach", `Rotation: ${order.join(" → ")}`, reason, { order, next: order[Math.max(0, nextIdx)] });
      return { rotation: order, next: order[Math.max(0, nextIdx)], reason };
    },
  }),

  archive_template: tool({
    description: "Remove a template from use (kept for history).",
    inputSchema: z.object({ name: z.string(), reason: z.string().min(5) }),
    execute: async ({ name, reason }) => {
      const t = await db.query.templates.findFirst({ where: eq(templates.name, name) });
      if (!t) return { error: `No template ${name}` };
      await db.update(templates).set({ archived: true }).where(eq(templates.id, t.id));
      await db.delete(rotationSlots).where(eq(rotationSlots.templateId, t.id));
      await logProgrammeChange("coach", `Archived ${name}`, reason);
      return { archived: name };
    },
  }),

  set_cardio_plan: tool({
    description: "Set the weekly cardio prescription the user is aiming for (sessions, mix, durations). Stored and shown in the header/weekly review.",
    inputSchema: z.object({
      sessions_per_week: z.number().int().min(0).max(7),
      plan: z.array(z.object({ kind: z.enum(["zone2", "intervals", "steady", "walk"]), machine: z.string().optional(), duration_min: z.number().int(), notes: z.string().optional() })),
      reason: z.string().min(5),
    }),
    execute: async (i) => {
      await setSetting("cardio_plan", { sessionsPerWeek: i.sessions_per_week, plan: i.plan });
      await logProgrammeChange("coach", `Cardio plan: ${i.sessions_per_week}/week`, i.reason, i.plan);
      return { ok: true, plan: i.plan, reason: i.reason };
    },
  }),

  set_goal: tool({
    description: "Record the user's current goal and targets (e.g. recomp, weight target, rate). Shown in context on every turn.",
    inputSchema: z.object({
      goal: z.string(),
      target_weight_kg: z.number().optional(),
      target_rate_kg_per_week: z.number().optional().describe("Negative to lose"),
      lifting_days: z.number().int().min(1).max(7).optional(),
      cardio_days: z.number().int().min(0).max(7).optional(),
    }),
    execute: async (i) => {
      const prev = await getSetting<Record<string, unknown>>("goal", {});
      const goal = { ...prev, ...i, updated: new Date().toISOString() };
      await setSetting("goal", goal);
      return { goal };
    },
  }),

  get_reference_programme: tool({
    description: "A reference 3-day Nippard-style PPL A/B (6 templates) you can adapt during onboarding instead of designing from scratch.",
    inputSchema: z.object({}),
    execute: async () => REFERENCE_PROGRAMME,
  }),

  schedule_deload: tool({
    description: "Flag a deload for the coming week: working sets at roughly 50-60% of normal volume and ~10% lighter. Stored so the start_workout plan and morning brief reflect it.",
    inputSchema: z.object({ week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reason: z.string().min(5), volume_factor: z.number().min(0.3).max(0.8).optional(), load_factor: z.number().min(0.7).max(1).optional() }),
    execute: async (i) => {
      await setSetting("deload", { weekStart: i.week_start, volumeFactor: i.volume_factor ?? 0.5, loadFactor: i.load_factor ?? 0.9, reason: i.reason });
      await logProgrammeChange("coach", `Deload week from ${i.week_start}`, i.reason);
      return { ok: true, weekStart: i.week_start };
    },
  }),
};
