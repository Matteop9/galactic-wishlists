import { createClient } from "@/lib/supabase/server";

/** Returns the current authenticated user, or null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Current user plus their handle and admin flag (or anonymous defaults). */
export async function getViewer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      user: null,
      isAdmin: false,
      handle: null as string | null,
      avatarSeed: null as string | null,
      consented: false,
      leaderboardOptIn: true,
    };
  const { data } = await supabase
    .from("profiles")
    .select("handle, is_admin, avatar_seed, public_consent_at, leaderboard_opt_in")
    .eq("id", user.id)
    .maybeSingle();
  return {
    user,
    isAdmin: Boolean(data?.is_admin),
    handle: data?.handle ?? null,
    avatarSeed: data?.avatar_seed ?? null,
    // Explicit in-app agreement to publishing (see components/ConsentGate).
    consented: data?.public_consent_at != null,
    leaderboardOptIn: data?.leaderboard_opt_in ?? true,
  };
}
