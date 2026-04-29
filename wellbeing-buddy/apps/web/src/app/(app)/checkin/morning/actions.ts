"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMorningOpener } from "@/lib/claude";

export async function submitMorningCheckin(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

  await supabase.from("daily_checkins").upsert({
    user_id: user.id,
    date: today,
    morning_energy:            Number(formData.get("energy")),
    morning_soreness:          Number(formData.get("soreness")),
    morning_mood:              Number(formData.get("mood")),
    morning_gym_access:        formData.get("gym_access") === "true",
    morning_available_minutes: Number(formData.get("available_minutes")),
    morning_checked_in_at:     new Date().toISOString(),
  }, { onConflict: "user_id,date" });

  // Generate Claude's morning opener and store as first message
  const opener = await getMorningOpener(user.id, today);
  const conversation = [{ role: "assistant", content: opener }];

  await supabase.from("daily_plans").upsert({
    user_id: user.id,
    date: today,
    morning_conversation: conversation,
  }, { onConflict: "user_id,date" });

  redirect("/app/chat");
}
