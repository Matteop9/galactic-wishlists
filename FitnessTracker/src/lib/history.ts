// Model-facing history window. Pure: the chat store feeds it rows, it returns
// what the model should see. The DB keeps everything; the UI shows the recent
// window untouched. This only shrinks what goes to the model.
import type { UIMessage } from "ai";

/** Read-only tools whose older results are pure noise to the model (live context already covers them). */
export const READ_ONLY_TOOLS = new Set([
  "get_active_workout",
  "get_last_performance",
  "get_last_performance_batch",
  "get_programme",
  "list_exercises",
  "recall",
  "weekly_stats",
  "volume_by_muscle",
  "e1rm_history",
  "get_cardio_history",
  "get_daily",
  "get_reference_programme",
  "get_recent_workouts",
  "correlate",
  "get_weight_trend",
  "render_chart",
]);

export type CompactOptions = {
  /** Messages (from the newest) that keep full tool outputs. */
  keepFull?: number;
  /** Max JSON chars for any single tool output outside the keepFull window. */
  maxToolChars?: number;
  /** Total char budget across all parts; oldest messages drop first. */
  budgetChars?: number;
};

type AnyPart = UIMessage["parts"][number] & { state?: string; output?: unknown; input?: unknown; toolCallId?: string };

function isToolPart(p: AnyPart): boolean {
  return typeof p.type === "string" && p.type.startsWith("tool-");
}

/** Strip provider bookkeeping parts that carry nothing the model (or UI) needs back. */
export function stripNoise(parts: UIMessage["parts"]): UIMessage["parts"] {
  return parts.filter((p) => p.type !== "reasoning" && p.type !== "custom" && p.type !== "step-start");
}

/** Every tool call in history must carry a result or the provider rejects the turn. */
function completeToolPart(p: AnyPart): AnyPart {
  if (!isToolPart(p)) return p;
  if (p.state === "output-available" || p.state === "output-error") return p;
  return { ...p, state: "output-available", output: { error: "No result was recorded for this call." } } as AnyPart;
}

function compactToolPart(p: AnyPart, maxToolChars: number): AnyPart {
  if (!isToolPart(p) || p.state !== "output-available") return p;
  const name = p.type.replace(/^tool-/, "");
  if (READ_ONLY_TOOLS.has(name)) return { ...p, output: { omitted: "older read-only result; call the tool again if needed" } } as AnyPart;
  const json = JSON.stringify(p.output ?? null);
  if (json.length <= maxToolChars) return p;
  return { ...p, output: { truncated: true, preview: json.slice(0, maxToolChars) } } as AnyPart;
}

function partChars(p: AnyPart): number {
  if (p.type === "text") return (p as { text: string }).text.length;
  if (isToolPart(p)) return JSON.stringify(p.input ?? null).length + JSON.stringify(p.output ?? null).length;
  return 0;
}

/**
 * Oldest-first in, oldest-first out. Older tool outputs are shrunk, provider
 * noise is dropped, dangling tool calls are closed, then the oldest messages
 * are dropped until the char budget fits. A user message is never left as the
 * only thing after a drop boundary mid-exchange; we trim on message boundaries.
 */
export function compactHistory(messages: UIMessage[], opts: CompactOptions = {}): UIMessage[] {
  const keepFull = opts.keepFull ?? 16;
  const maxToolChars = opts.maxToolChars ?? 600;
  const budget = opts.budgetChars ?? 60_000;

  const out: UIMessage[] = messages.map((m, i) => {
    const fresh = i >= messages.length - keepFull;
    const parts = stripNoise(m.parts)
      .map((p) => completeToolPart(p as AnyPart))
      .map((p) => (fresh ? p : compactToolPart(p, maxToolChars))) as UIMessage["parts"];
    return { id: m.id, role: m.role, parts };
  });

  // Drop empty assistant shells (e.g. a stripped reasoning-only message).
  const nonEmpty = out.filter((m) => m.parts.length > 0);

  let total = 0;
  let cut = nonEmpty.length;
  for (let i = nonEmpty.length - 1; i >= 0; i--) {
    total += nonEmpty[i].parts.reduce((a, p) => a + partChars(p as AnyPart), 0);
    if (total > budget) break;
    cut = i;
  }
  return nonEmpty.slice(cut);
}
