import { HealthMetricsUpsert } from "@wellbeing/shared";

export async function upsertHealthMetrics(
  supabaseUrl: string,
  serviceKey: string,
  rows: HealthMetricsUpsert[]
): Promise<void> {
  const res = await fetch(`${supabaseUrl}/rest/v1/health_metrics?on_conflict=user_id,date`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase upsert failed ${res.status}: ${body}`);
  }
}
