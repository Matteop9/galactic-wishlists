import "server-only";
import { generateId, type UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentRuns } from "@/db/schema";
import { createCoach } from "@/agent/coach";
import { saveMessage } from "./chat-store";

export type RunKind = "morning_brief" | "weekly_review";

const PROMPTS: Record<RunKind, string> = {
  morning_brief: `It's the morning brief. In ≤4 short lines: trend weight + weekly rate (use get_weight_trend), what today is (next lifting day in rotation or a cardio day given this week's tally and the cardio plan — pick one and say it), and one specific coaching cue for the session. If a deload is scheduled this week, say so. No tool-call narration, no headings.`,
  weekly_review: `It's the Sunday weekly review. You have full authority over next week's programme.
1. Pull weekly_stats (8 weeks), volume_by_muscle for this week, e1rm_history for the 4-6 main lifts, get_cardio_history, get_weight_trend.
2. Write the review in ≤10 lines: adherence vs 3+3, weight trend + rate vs goal, strength movement (which e1RMs up/flat/down), cardio progression (speed/level at RPE), muscles under 10 sets, anything notable in sleep/alcohol if logged.
3. Then ACT: adjust next week using set_exercise_targets / upsert_template / set_rotation / schedule_deload / set_cardio_plan as needed — target weights for lifts that hit the top of the range, swap an exercise that has stalled 3+ weeks, add a set where a muscle is under 10, schedule a deload if e1RMs are flat and session RPE is climbing or it's been 6-8 weeks. Every change needs a reason. Keep changes small; don't rewrite everything.
4. If there are ≥8 weeks of data, run correlate for weightChangeKg vs cardioMinutes and vs alcoholUnits and mention the read-out in one line, with the caveat.
5. End with one line on what Monday is.`,
};

/** Runs a scheduled coach turn and appends it to the chat thread as an assistant message. */
export async function runScheduled(kind: RunKind): Promise<{ ok: boolean; text?: string; error?: string }> {
  const [run] = await db.insert(agentRuns).values({ kind }).returning();
  try {
    const agent = await createCoach("coach", `This is an automated ${kind.replace("_", " ")} run (no user message). Write for the user directly.`);
    const result = await agent.generate({ prompt: PROMPTS[kind] });
    const parts: UIMessage["parts"] = [];
    // Keep the tool calls that produced cards so the thread shows what changed.
    for (const step of result.steps) {
      for (const tc of step.toolCalls) {
        const tr = step.toolResults.find((r) => r.toolCallId === tc.toolCallId);
        parts.push({
          type: `tool-${tc.toolName}`,
          toolCallId: tc.toolCallId,
          state: tr ? "output-available" : "input-available",
          input: tc.input,
          output: tr?.output,
        } as UIMessage["parts"][number]);
      }
    }
    parts.push({ type: "text", text: result.text });
    await saveMessage({ id: generateId(), role: "assistant", parts });
    await db.update(agentRuns).set({ status: "done", finishedAt: new Date(), summary: result.text.slice(0, 2000) }).where(eq(agentRuns.id, run.id));
    return { ok: true, text: result.text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.update(agentRuns).set({ status: "error", finishedAt: new Date(), error: msg.slice(0, 2000) }).where(eq(agentRuns.id, run.id));
    return { ok: false, error: msg };
  }
}

export function cronAuthorised(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
}
