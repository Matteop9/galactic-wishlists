"use server";

import { generateId, type UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sets, workouts } from "@/db/schema";
import { isAuthed } from "@/lib/auth";
import { saveMessage } from "@/lib/chat-store";
import { quickParse, resolveQuickSet } from "@/lib/quickparse";
import { getActiveWorkout, logSet, num } from "@/lib/queries";
import { buildPad, describeExercise, pickNextExercise, planFor, setCurrentExercise, type PadData } from "@/lib/pad";
import { logSetForExercise, serialiseSet, type SetInput } from "@/agent/tools/workout";

async function guard() {
  if (!(await isAuthed())) throw new Error("Unauthorised");
}

export type QuickLogResult =
  | { handled: false }
  | { handled: true; userMessage: UIMessage; assistantMessage: UIMessage; pad: PadData };

/** Log a set with no model call and persist the user line + the log_set card, exactly as the model's tool would. */
async function persistSetLog(exerciseId: number, userText: string, s: SetInput): Promise<QuickLogResult> {
  const output = await logSetForExercise(exerciseId, s);
  if ("error" in output) return { handled: false };
  const userMessage: UIMessage = { id: generateId(), role: "user", parts: [{ type: "text", text: userText }] };
  const assistantMessage: UIMessage = {
    id: generateId(),
    role: "assistant",
    parts: [
      {
        type: "tool-log_set",
        toolCallId: generateId(),
        state: "output-available",
        input: { exercise: output.exercise, weight_kg: s.weightKg, reps: s.reps, rir: s.rir, set_type: s.setType, partial_reps: s.partialReps, side: s.side },
        output,
      } as UIMessage["parts"][number],
    ],
  };
  await saveMessage(userMessage);
  await saveMessage(assistantMessage);
  const fresh = await getActiveWorkout();
  return { handled: true, userMessage, assistantMessage, pad: await buildPad(fresh!) };
}

/**
 * Gym-floor fast path. If the text is terse set shorthand and a workout is
 * active, log it here against the *current* exercise with no model call.
 */
export async function quickLogSet(raw: string): Promise<QuickLogResult> {
  await guard();
  const q = quickParse(raw);
  if (!q) return { handled: false };
  const active = await getActiveWorkout();
  if (!active) return { handled: false };
  const exerciseId = active.currentExerciseId ?? active.sets.at(-1)?.exerciseId;
  if (!exerciseId) return { handled: false }; // nothing to log against yet: let the model pick it
  const prev = [...active.sets].reverse().find((s) => s.exerciseId === exerciseId);
  const resolved = resolveQuickSet(q, prev ? { weightKg: num(prev.weightKg), reps: prev.reps } : null);
  if (!resolved) return { handled: false };
  return persistSetLog(exerciseId, raw, { ...resolved, rir: q.rir, setType: q.setType, partialReps: q.partialReps, side: q.side });
}

function fmtUserSet(name: string, s: SetInput): string {
  const w = s.weightKg === 0 ? "BW" : `${s.weightKg}`;
  return `${name}: ${w}×${s.reps}${s.rir != null ? ` @${s.rir}` : ""}${s.setType !== "working" ? ` (${s.setType.replace("_", " ")})` : ""}${s.side ? ` ${s.side}` : ""}`;
}

/** Set pad → log directly, no model call. */
export async function logSetFromPad(exerciseId: number, s: SetInput): Promise<QuickLogResult> {
  await guard();
  const active = await getActiveWorkout();
  if (!active) return { handled: false };
  const d = await describeExercise(active, exerciseId);
  if (!d) return { handled: false };
  return persistSetLog(exerciseId, fmtUserSet(d.name, s), s);
}

export type SwitchResult = { ok: true; assistantMessage: UIMessage; pad: PadData } | { ok: false; reason: "no_workout" | "all_done" | "unknown" };

/** Make an exercise current (null = next incomplete on the plan) and append the same card start_exercise would. */
export async function switchExercise(exerciseId: number | null): Promise<SwitchResult> {
  await guard();
  const active = await getActiveWorkout();
  if (!active) return { ok: false, reason: "no_workout" };
  let target = exerciseId;
  if (target == null) {
    const next = pickNextExercise(await planFor(active), active.currentExerciseId);
    if (!next) return { ok: false, reason: "all_done" };
    target = next.exerciseId;
  }
  const d = await describeExercise(active, target);
  if (!d) return { ok: false, reason: "unknown" };
  await setCurrentExercise(active.id, target);
  const assistantMessage: UIMessage = {
    id: generateId(),
    role: "assistant",
    parts: [{ type: "tool-start_exercise", toolCallId: generateId(), state: "output-available", input: { exercise: d.name }, output: { workoutId: active.id, ...d } } as UIMessage["parts"][number]],
  };
  await saveMessage(assistantMessage);
  const fresh = await getActiveWorkout();
  return { ok: true, assistantMessage, pad: await buildPad(fresh!) };
}

export async function adjustSet(setId: number, patch: { weightDelta?: number; repsDelta?: number; rir?: number | null }) {
  await guard();
  const row = await db.query.sets.findFirst({ where: eq(sets.id, setId) });
  if (!row) throw new Error("No such set");
  const weightKg = Math.max(0, num(row.weightKg) + (patch.weightDelta ?? 0));
  const reps = Math.max(0, row.reps + (patch.repsDelta ?? 0));
  const [updated] = await db
    .update(sets)
    .set({ weightKg: String(weightKg), reps, rir: patch.rir === undefined ? row.rir : patch.rir })
    .where(eq(sets.id, setId))
    .returning();
  return serialiseSet(updated);
}

export async function deleteSet(setId: number) {
  await guard();
  const [row] = await db.delete(sets).where(eq(sets.id, setId)).returning();
  return { ok: true, deleted: row ? serialiseSet(row) : null };
}

/** Undo a delete from the card: re-insert the same set into the active workout. Returns the new row. */
export async function restoreSet(exerciseId: number, s: { weightKg: number; reps: number; rir: number | null; setType: string; partialReps: number; side: string | null; note?: string | null }) {
  await guard();
  const active = await getActiveWorkout();
  if (!active) throw new Error("No active workout");
  const res = await logSet({
    workoutId: active.id,
    exerciseId,
    weightKg: s.weightKg,
    reps: s.reps,
    rir: s.rir,
    setType: s.setType,
    partialReps: s.partialReps,
    side: (s.side as "L" | "R" | null) ?? null,
    note: s.note ?? null,
  });
  return serialiseSet(res.set);
}

export async function setSessionRpe(workoutId: number, rpe: number) {
  await guard();
  await db.update(workouts).set({ sessionRpe: rpe }).where(eq(workouts.id, workoutId));
  return { ok: true };
}
