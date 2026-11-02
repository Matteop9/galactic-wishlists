import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bodyMetrics, cardioSessions, dailyMetrics, exercises, sets, workouts } from "@/db/schema";

function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export async function GET(req: Request) {
  const table = new URL(req.url).searchParams.get("table");
  let rows: Record<string, unknown>[] = [];
  switch (table) {
    case "workouts":
      rows = await db.select().from(workouts).orderBy(asc(workouts.startedAt));
      break;
    case "sets":
      rows = (
        await db
          .select({ id: sets.id, workoutId: sets.workoutId, startedAt: workouts.startedAt, workout: workouts.name, exercise: exercises.name, position: sets.position, setType: sets.setType, weightKg: sets.weightKg, reps: sets.reps, partialReps: sets.partialReps, rir: sets.rir, side: sets.side, note: sets.note, completedAt: sets.completedAt })
          .from(sets)
          .innerJoin(workouts, eq(sets.workoutId, workouts.id))
          .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
          .orderBy(asc(workouts.startedAt), asc(sets.id))
      ) as Record<string, unknown>[];
      break;
    case "cardio":
      rows = await db.select().from(cardioSessions).orderBy(asc(cardioSessions.performedAt));
      break;
    case "weight":
      rows = await db.select().from(bodyMetrics).orderBy(asc(bodyMetrics.date));
      break;
    case "daily":
      rows = await db.select().from(dailyMetrics).orderBy(asc(dailyMetrics.date));
      break;
    default:
      return Response.json({ error: "table must be workouts|sets|cardio|weight|daily" }, { status: 400 });
  }
  return new Response(csv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${table}.csv"` },
  });
}
