import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import type { UIMessage } from "ai";
import { db } from "@/db";
import { messages } from "@/db/schema";

const HISTORY_LIMIT = 60;

/** The single conversation thread, oldest first, capped at the last HISTORY_LIMIT messages. */
export async function loadRecentMessages(limit = HISTORY_LIMIT): Promise<UIMessage[]> {
  const rows = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(limit);
  return rows.reverse().map((r) => ({ id: r.id, role: r.role as UIMessage["role"], parts: r.parts as UIMessage["parts"] }));
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
