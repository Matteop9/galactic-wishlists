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
    };
  const { data } = await supabase
    .from("profiles")
    .select("handle, is_admin, avatar_seed")
    .eq("id", user.id)
    .maybeSingle();
  return {
    user,
    isAdmin: Boolean(data?.is_admin),
    handle: data?.handle ?? null,
    avatarSeed: data?.avatar_seed ?? null,
  };
}
