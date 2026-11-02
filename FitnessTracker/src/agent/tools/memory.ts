import { tool } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { coachMemory } from "@/db/schema";
import { getMemory } from "@/lib/queries";

export const memoryTools = {
  remember: tool({
    description:
      "Save a durable fact about the user for every future conversation: injuries/niggles, equipment at their gym, exercise likes/dislikes, schedule constraints, preferences about how you coach. One fact per call, short. Don't store things already in the programme or logs.",
    inputSchema: z.object({
      category: z.enum(["injury", "preference", "equipment", "goal", "schedule", "general"]),
      content: z.string().min(5).max(300),
    }),
    execute: async ({ category, content }) => {
      const [row] = await db.insert(coachMemory).values({ category, content }).returning();
      return { id: row.id, category, content };
    },
  }),
  forget: tool({
    description: "Delete a remembered fact by id (from recall or the system prompt).",
    inputSchema: z.object({ id: z.number().int() }),
    execute: async ({ id }) => {
      const res = await db.delete(coachMemory).where(eq(coachMemory.id, id)).returning();
      return res.length ? { deleted: id } : { error: `No memory ${id}` };
    },
  }),
  recall: tool({
    description: "List everything remembered about the user.",
    inputSchema: z.object({}),
    execute: async () => (await getMemory()).map((m) => ({ id: m.id, category: m.category, content: m.content })),
  }),
};
