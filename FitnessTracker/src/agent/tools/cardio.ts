import { tool } from "ai";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cardioSessions } from "@/db/schema";
import { num } from "@/lib/queries";
import { londonDate } from "@/lib/dates";

const MACHINES = ["treadmill", "bike", "rower", "elliptical", "stairmaster", "walk_outdoor", "run_outdoor", "swim", "other"] as const;
const KINDS = ["zone2", "intervals", "steady", "walk"] as const;

export function serialiseCardio(c: typeof cardioSessions.$inferSelect) {
  const dur = num(c.durationMin);
  const dist = c.distanceKm ? num(c.distanceKm) : null;
  return {
    id: c.id,
    date: londonDate(c.performedAt),
    machine: c.machine,
    kind: c.kind,
    durationMin: dur,
    distanceKm: dist,
    inclinePct: c.inclinePct ? num(c.inclinePct) : null,
    level: c.level,
    avgSpeedKmh: c.avgSpeedKmh ? num(c.avgSpeedKmh) : dist && dur ? Math.round((dist / (dur / 60)) * 100) / 100 : null,
    paceMinPerKm: dist && dur ? Math.round((dur / dist) * 100) / 100 : null,
    calories: c.calories,
    avgHr: c.avgHr,
    rpe: c.rpe,
    notes: c.notes,
  };
}

export const cardioTools = {
  log_cardio: tool({
    description:
      "Log a cardio session from the machine readout. Only duration and machine are required. kind: zone2 (easy, conversational), intervals, steady, walk. rpe 1-10. Pass date (YYYY-MM-DD) only if it wasn't today.",
    inputSchema: z.object({
      machine: z.enum(MACHINES),
      duration_min: z.number().min(1),
      kind: z.enum(KINDS).optional(),
      distance_km: z.number().min(0).optional(),
      incline_pct: z.number().min(0).max(40).optional(),
      level: z.number().int().min(0).optional().describe("Resistance level on bikes/steppers/ellipticals"),
      avg_speed_kmh: z.number().min(0).optional(),
      calories: z.number().int().min(0).optional(),
      avg_hr: z.number().int().min(40).max(220).optional().describe("Only if the machine grips showed it"),
      rpe: z.number().int().min(1).max(10).optional(),
      notes: z.string().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
    execute: async (i) => {
      const performedAt = i.date ? new Date(`${i.date}T12:00:00Z`) : new Date();
      const [row] = await db
        .insert(cardioSessions)
        .values({
          performedAt,
          machine: i.machine,
          kind: i.kind ?? (i.rpe && i.rpe >= 7 ? "intervals" : "steady"),
          durationMin: String(i.duration_min),
          distanceKm: i.distance_km != null ? String(i.distance_km) : null,
          inclinePct: i.incline_pct != null ? String(i.incline_pct) : null,
          level: i.level ?? null,
          avgSpeedKmh: i.avg_speed_kmh != null ? String(i.avg_speed_kmh) : null,
          calories: i.calories ?? null,
          avgHr: i.avg_hr ?? null,
          rpe: i.rpe ?? null,
          notes: i.notes ?? null,
        })
        .returning();
      // compare with the last session on the same machine + kind
      const prev = await db.query.cardioSessions.findMany({
        where: eq(cardioSessions.machine, i.machine),
        orderBy: desc(cardioSessions.performedAt),
        limit: 2,
      });
      const previous = prev.find((p) => p.id !== row.id) ?? null;
      return { session: serialiseCardio(row), previous: previous ? serialiseCardio(previous) : null };
    },
  }),

  edit_cardio: tool({
    description: "Correct a cardio session by id.",
    inputSchema: z.object({
      session_id: z.number().int(),
      duration_min: z.number().min(1).optional(),
      distance_km: z.number().min(0).optional(),
      incline_pct: z.number().optional(),
      level: z.number().int().optional(),
      calories: z.number().int().optional(),
      rpe: z.number().int().min(1).max(10).optional(),
      kind: z.enum(KINDS).optional(),
      notes: z.string().optional(),
    }),
    execute: async ({ session_id, ...p }) => {
      const upd: Partial<typeof cardioSessions.$inferInsert> = {};
      if (p.duration_min != null) upd.durationMin = String(p.duration_min);
      if (p.distance_km != null) upd.distanceKm = String(p.distance_km);
      if (p.incline_pct != null) upd.inclinePct = String(p.incline_pct);
      if (p.level != null) upd.level = p.level;
      if (p.calories != null) upd.calories = p.calories;
      if (p.rpe != null) upd.rpe = p.rpe;
      if (p.kind) upd.kind = p.kind;
      if (p.notes != null) upd.notes = p.notes;
      const [row] = await db.update(cardioSessions).set(upd).where(eq(cardioSessions.id, session_id)).returning();
      return row ? { session: serialiseCardio(row) } : { error: `No session ${session_id}` };
    },
  }),

  get_cardio_history: tool({
    description: "Recent cardio sessions, optionally filtered by machine. Includes derived pace/speed so progress at a given RPE can be compared.",
    inputSchema: z.object({ machine: z.enum(MACHINES).optional(), limit: z.number().int().min(1).max(50).optional() }),
    execute: async ({ machine, limit }) => {
      const rows = await db.query.cardioSessions.findMany({
        where: machine ? eq(cardioSessions.machine, machine) : undefined,
        orderBy: desc(cardioSessions.performedAt),
        limit: limit ?? 12,
      });
      return rows.map(serialiseCardio);
    },
  }),
};
