import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a knowledgeable friend helping someone optimise their health, training, and recovery.
Be concise, warm, and occasionally dry. No exclamation marks. No hype. If rest is the right call, say rest.
British English. Keep responses short — 2–4 sentences unless the user asks for more.`;

async function getRecentContext(userId: string, todayDate: string) {
  const supabase = await createClient();

  // Last 7 days of health metrics
  const { data: metrics } = await supabase
    .from("health_metrics")
    .select("date,steps,hrv_ms,resting_heart_rate_bpm,sleep_duration_minutes,sleep_deep_minutes,sleep_rem_minutes,active_energy_kcal,body_weight_kg")
    .eq("user_id", userId)
    .lt("date", todayDate)
    .order("date", { ascending: false })
    .limit(7);

  // Last 7 days of check-ins
  const { data: checkins } = await supabase
    .from("daily_checkins")
    .select("date,morning_energy,morning_soreness,morning_mood,evening_mood,evening_energy,evening_stress,evening_food_quality,evening_soreness,evening_alcohol_units")
    .eq("user_id", userId)
    .lt("date", todayDate)
    .order("date", { ascending: false })
    .limit(7);

  // Last 7 days of plans
  const { data: plans } = await supabase
    .from("daily_plans")
    .select("date,provisional_plan,final_plan,actual_activity,reaction")
    .eq("user_id", userId)
    .lt("date", todayDate)
    .order("date", { ascending: false })
    .limit(7);

  return { metrics: metrics ?? [], checkins: checkins ?? [], plans: plans ?? [] };
}

export async function generateEveningPlan(userId: string, todayDate: string): Promise<void> {
  const supabase = await createClient();
  const { metrics, checkins, plans } = await getRecentContext(userId, todayDate);

  // Today's evening check-in
  const { data: tonightCheckin } = await supabase
    .from("daily_checkins")
    .select("evening_mood,evening_energy,evening_stress,evening_food_quality,evening_soreness,evening_alcohol_units")
    .eq("user_id", userId)
    .eq("date", todayDate)
    .single();

  const tomorrow = new Date(todayDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toLocaleDateString("en-CA", { timeZone: "Europe/London" });

  const prompt = `Today is ${todayDate}. Tonight's check-in: ${JSON.stringify(tonightCheckin)}.

Recent health data (newest first):
Metrics: ${JSON.stringify(metrics)}
Check-ins: ${JSON.stringify(checkins)}
Plans & outcomes: ${JSON.stringify(plans)}

Generate a short provisional plan for tomorrow (${tomorrowDate}). Suggest one of: gym session (with rough focus), walk, sauna, rest, or a combination. Reference relevant trends if helpful. Keep it to 2–3 sentences.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 256,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const plan = message.content.find((b) => b.type === "text")?.text ?? "";

  await supabase
    .from("daily_plans")
    .upsert({ user_id: userId, date: tomorrowDate, provisional_plan: plan }, { onConflict: "user_id,date" });
}

export async function getMorningOpener(userId: string, todayDate: string): Promise<string> {
  const supabase = await createClient();
  const { metrics, checkins, plans } = await getRecentContext(userId, todayDate);

  // Today's provisional plan and morning check-in
  const { data: todayPlan } = await supabase
    .from("daily_plans")
    .select("provisional_plan")
    .eq("user_id", userId)
    .eq("date", todayDate)
    .single();

  const { data: morningCheckin } = await supabase
    .from("daily_checkins")
    .select("morning_energy,morning_soreness,morning_mood,morning_gym_access,morning_available_minutes")
    .eq("user_id", userId)
    .eq("date", todayDate)
    .single();

  // Today's health metrics (sleep auto-filled by HAE)
  const { data: todayMetrics } = await supabase
    .from("health_metrics")
    .select("sleep_duration_minutes,sleep_deep_minutes,sleep_rem_minutes,hrv_ms,resting_heart_rate_bpm")
    .eq("user_id", userId)
    .eq("date", todayDate)
    .single();

  const prompt = `Today is ${todayDate}.

Last night's plan: ${todayPlan?.provisional_plan ?? "none"}
Sleep data: ${JSON.stringify(todayMetrics)}
Morning check-in: ${JSON.stringify(morningCheckin)}
Recent context: metrics ${JSON.stringify(metrics.slice(0, 3))}, check-ins ${JSON.stringify(checkins.slice(0, 3))}

Open the morning conversation. Reference the plan from last night, acknowledge the sleep data and how they're feeling this morning, and suggest whether to stick with the plan, modify it, or rest. Keep it conversational and concise.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 300,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content.find((b) => b.type === "text")?.text ?? "";
}
