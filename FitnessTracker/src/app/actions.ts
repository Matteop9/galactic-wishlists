"use server";

import { generateId, type UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sets } from "@/db/schema";
import { isAuthed } from "@/lib/auth";
import { saveMessage } from "@/lib/chat-store";
import { quickParse, resolveQuickSet } from "@/lib/quickparse";
import { getActiveWorkout, logSet, num } from "@/lib/queries";
import { serialiseSet } from "@/agent/tools/workout";
import { templateExercises } from "@/db/schema";
import { and } from "drizzle-orm";

async function guard() {
  if (!(await isAuthed())) throw new Error("Unauthorised");
}

export type QuickLogResult =
  | { handled: false }
  | { handled: true; userMessage: UIMessage; assistantMessage: UIMessage };

/**
 * Gym-floor fast path. If the text is terse set shorthand and a workout is
 * active, log it here with no model call and return the two messages that
 * were persisted (so the thread stays consistent for the model later).
 */
export async function quickLogSet(raw: string): Promise<QuickLogResult> {
  await guard();
  const q = quickParse(raw);
  if (!q) return { handled: false };
  const active = await getActiveWorkout();
  if (!active) return { handled: false };
  const last = active.sets.at(-1);
  if (!last) return { handled: false }; // no current exercise yet — let the model pick it
  const resolved = resolveQuickSet(q, { weightKg: num(last.weightKg), reps: last.reps });
  if (!resolved) return { handled: false };

  const ex = last.exercise;
  const te = active.templateId
    ? await db.query.templateExercises.findFirst({
        where: and(eq(templateExercises.templateId, active.templateId), eq(templateExercises.exerciseId, ex.id)),
      })
    : null;
  const res = await logSet({
    workoutId: active.id,
    exerciseId: ex.id,
    weightKg: resolved.weightKg,
    reps: resolved.reps,
    rir: q.rir,
    setType: q.setType,
    partialReps: q.partialReps,
    side: q.side,
  });
  const setNumber = active.sets.filter((s) => s.exerciseId === ex.id).length + 1;
  const restS = te?.restS ?? ex.defaultRestS;
  const output = {
    set: serialiseSet(res.set),
    exercise: ex.name,
    exerciseId: ex.id,
    e1rm: res.e1rm,
    prs: res.prs,
    setNumber,
    plannedSets: te?.sets ?? null,
    restS: q.setType === "warmup" ? Math.min(60, restS) : restS,
    plates: null,
  };
  const toolCallId = generateId();
  const userMessage: UIMessage = { id: generateId(), role: "user", parts: [{ type: "text", text: raw }] };
  const assistantMessage: UIMessage = {
    id: generateId(),
    role: "assistant",
    parts: [
      {
        type: "tool-log_set",
        toolCallId,
        state: "output-available",
        input: { exercise: ex.name, weight_kg: resolved.weightKg, reps: resolved.reps, rir: q.rir, set_type: q.setType, partial_reps: q.partialReps, side: q.side },
        output,
      } as UIMessage["parts"][number],
    ],
  };
  await saveMessage(userMessage);
  await saveMessage(assistantMessage);
  return { handled: true, userMessage, assistantMessage };
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
  await db.delete(sets).where(eq(sets.id, setId));
  return { ok: true };
}
