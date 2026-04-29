"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateEveningPlan } from "@/lib/claude";

export async function submitEveningCheckin(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

  const checkin = {
    user_id: user.id,
    date: today,
    evening_mood:         Number(formData.get("mood")),
    evening_energy:       Number(formData.get("energy")),
    evening_stress:       Number(formData.get("stress")),
    evening_food_quality: Number(formData.get("food_quality")),
    evening_soreness:     Number(formData.get("soreness")),
    evening_alcohol_units: Number(formData.get("alcohol_units")),
    evening_checked_in_at: new Date().toISOString(),
  };

  await supabase.from("daily_checkins").upsert(checkin, { onConflict: "user_id,date" });

  const actualActivity = formData.get("actual_activity") as string | null;
  if (actualActivity) {
    await supabase
      .from("daily_plans")
      .upsert({ user_id: user.id, date: today, actual_activity: actualActivity }, { onConflict: "user_id,date" });
  }

  // Generate tomorrow's provisional plan
  await generateEveningPlan(user.id, today);

  redirect("/app/dashboard");
}
