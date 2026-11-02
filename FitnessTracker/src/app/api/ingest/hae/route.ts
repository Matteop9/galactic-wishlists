import { sql } from "drizzle-orm";
import { db } from "@/db";
import { bodyMetrics, dailyMetrics } from "@/db/schema";
import { parseHae, type HaePayload } from "@/lib/hae";

export const maxDuration = 60;

/**
 * Health Auto Export → REST API automation target.
 * Configure in HAE: POST this URL, header `x-hae-token: <HAE_TOKEN>`, JSON, metrics
 * weight/body fat/lean mass/BMI/steps/walking distance/active energy/sleep, "Since last sync".
 * Idempotent: re-sends upsert the same rows.
 */
export async function POST(req: Request) {
  const token = req.headers.get("x-hae-token") ?? new URL(req.url).searchParams.get("token");
  if (!process.env.HAE_TOKEN || token !== process.env.HAE_TOKEN) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }
  let payload: HaePayload;
  try {
    payload = (await req.json()) as HaePayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!payload?.data) return Response.json({ error: "Missing data" }, { status: 400 });

  const { body, daily, ignored } = parseHae(payload);

  for (const b of body) {
    await db
      .insert(bodyMetrics)
      .values({
        date: b.date,
        source: b.source,
        weightKg: b.weightKg != null ? String(b.weightKg) : null,
        bodyFatPct: b.bodyFatPct != null ? String(b.bodyFatPct) : null,
        leanMassKg: b.leanMassKg != null ? String(b.leanMassKg) : null,
        bmi: b.bmi != null ? String(b.bmi) : null,
      })
      .onConflictDoUpdate({
        target: [bodyMetrics.date, bodyMetrics.source],
        set: {
          weightKg: sql`coalesce(excluded.weight_kg, ${bodyMetrics.weightKg})`,
          bodyFatPct: sql`coalesce(excluded.body_fat_pct, ${bodyMetrics.bodyFatPct})`,
          leanMassKg: sql`coalesce(excluded.lean_mass_kg, ${bodyMetrics.leanMassKg})`,
          bmi: sql`coalesce(excluded.bmi, ${bodyMetrics.bmi})`,
        },
      });
  }
  for (const d of daily) {
    await db
      .insert(dailyMetrics)
      .values({
        date: d.date,
        steps: d.steps ?? null,
        walkingKm: d.walkingKm != null ? String(d.walkingKm) : null,
        activeKcal: d.activeKcal ?? null,
        sleepHours: d.sleepHours != null ? String(d.sleepHours) : null,
      })
      .onConflictDoUpdate({
        target: dailyMetrics.date,
        set: {
          steps: sql`coalesce(excluded.steps, ${dailyMetrics.steps})`,
          walkingKm: sql`coalesce(excluded.walking_km, ${dailyMetrics.walkingKm})`,
          activeKcal: sql`coalesce(excluded.active_kcal, ${dailyMetrics.activeKcal})`,
          sleepHours: sql`coalesce(excluded.sleep_hours, ${dailyMetrics.sleepHours})`,
        },
      });
  }
  return Response.json({ ok: true, body: body.length, daily: daily.length, ignored });
}
