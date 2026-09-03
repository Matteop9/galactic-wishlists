"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Records the explicit, in-app agreement to publishing (App Store 5.1.2):
 * nothing of the user's reaches the public feed or the global leaderboards
 * until this is set. `leaderboardOptIn` is the choice they made in the gate.
 */
export async function agreeToPublicSharing(
  leaderboardOptIn: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({
      public_consent_at: new Date().toISOString(),
      leaderboard_opt_in: leaderboardOptIn,
    })
    .eq("id", user.id);

  if (error) return { error: "Couldn't save that — please try again." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Settings → Public sharing: join or leave the global leaderboards. */
export async function setLeaderboardOptIn(
  optIn: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ leaderboard_opt_in: optIn })
    .eq("id", user.id);

  if (error) return { error: "Couldn't save that — please try again." };
  revalidatePath("/settings");
  revalidatePath("/leaderboards");
  return { ok: true };
}
