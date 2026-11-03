import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import type { UIMessage } from "ai";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { compactHistory, stripNoise } from "./history";

/** What the screen shows at load. */
const UI_LIMIT = 60;
/** How far back the model looks; older turns are compacted by compactHistory. */
const MODEL_LIMIT = 40;

export type ChatMessage = UIMessage<{ createdAt: string }>;

/** The single conversation thread, oldest first, capped at the last UI_LIMIT messages. */
export async function loadRecentMessages(limit = UI_LIMIT): Promise<ChatMessage[]> {
  const rows = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(limit);
  return rows.reverse().map((r) => ({
    id: r.id,
    role: r.role as UIMessage["role"],
    parts: stripNoise(r.parts as UIMessage["parts"]),
    metadata: { createdAt: r.createdAt.toISOString() },
  }));
}

/**
 * What the model sees: the recent window with older tool outputs shrunk and
 * provider noise removed. The thread itself never resets; this keeps each
 * request's prompt bounded regardless of how long the chat has run.
 */
export async function loadModelHistory(): Promise<UIMessage[]> {
  const rows = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(MODEL_LIMIT);
  const recent = rows.reverse().map((r) => ({ id: r.id, role: r.role as UIMessage["role"], parts: r.parts as UIMessage["parts"] }));
  return compactHistory(recent);
}

export async function saveMessage(m: UIMessage): Promise<void> {
  await db
    .insert(messages)
    .values({ id: m.id, role: m.role, parts: m.parts as object })
    .onConflictDoUpdate({ target: messages.id, set: { role: m.role, parts: m.parts as object } });
}

export async function deleteMessages(ids: string[]): Promise<void> {
  if (ids.length) await db.delete(messages).where(inArray(messages.id, ids));
}

export async function messageExists(id: string): Promise<boolean> {
  const r = await db.select({ id: messages.id }).from(messages).where(eq(messages.id, id)).limit(1);
  return r.length > 0;
}
