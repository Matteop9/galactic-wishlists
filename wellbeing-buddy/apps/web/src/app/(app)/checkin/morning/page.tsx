import { createClient } from "@/lib/supabase/server";
import MorningCheckinForm from "./form";

export default async function MorningCheckinPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

  // Auto-fill sleep from HAE data
  const { data: metrics } = await supabase
    .from("health_metrics")
    .select("sleep_duration_minutes,hrv_ms,resting_heart_rate_bpm")
    .eq("user_id", user!.id)
    .eq("date", today)
    .single();

  const sleepHours = metrics?.sleep_duration_minutes
    ? Math.round((metrics.sleep_duration_minutes / 60) * 10) / 10
    : null;

  return <MorningCheckinForm sleepHours={sleepHours} hrv={metrics?.hrv_ms ?? null} />;
}
