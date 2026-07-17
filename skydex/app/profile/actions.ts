"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { containsProfanity } from "@/lib/profanity";
import { AVATAR_SEED_RE, validAvatarParts } from "@/lib/avatar";
import { fetchUserSightings, PROFILE_PAGE_SIZE } from "@/lib/profileSightings";
import type { Sighting } from "@/components/SightingCard";

export type ProfileState = { error?: string; ok?: boolean };

/** Update the signed-in user's handle (username) and home airport. */
export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  const homeRaw = String(formData.get("home_airport") ?? "").trim().toUpperCase();

  if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
    return { error: "Username must be 3–20 characters: letters, numbers or underscores." };
  }
  if (containsProfanity(handle)) {
    return { error: "Please choose a different username." };
  }

  // Home airport is optional, but if given it must be a valid IATA/ICAO code.
  let home_airport: string | null = null;
  if (homeRaw) {
    if (!/^[A-Z]{3,4}$/.test(homeRaw)) {
      return { error: "Home airport must be a 3-letter airport code, e.g. LHR." };
    }
    home_airport = homeRaw;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ handle, home_airport })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "That username is already taken." };
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { ok: true };
}

/** Update the user's avatar seed — limited to once per day. */
export async function updateAvatar(
  seed: string,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Only structured picker seeds are accepted now — indices in range, bg ≠ fg.
  // (Legacy hash seeds stay valid in the DB; they just can't be re-saved.)
  const s = (seed ?? "").trim();
  const m = AVATAR_SEED_RE.exec(s);
  if (!m || !validAvatarParts(+m[1], +m[2], +m[3], +m[4])) {
    return { error: "Invalid avatar." };
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("avatar_updated_at")
    .eq("id", user.id)
    .maybeSingle();
  if (prof?.avatar_updated_at) {
    const last = new Date(prof.avatar_updated_at).getTime();
    if (Date.now() - last < 24 * 60 * 60 * 1000) {
      return { error: "You can change your avatar once a day." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_seed: s, avatar_updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/feed");
  return { ok: true };
}

/**
 * Toggle a sighting as one of the user's (max 3) public favourites. The sighting
 * must belong to the caller. Returns the updated, ordered id list.
 */
export async function toggleFavourite(
  sightingId: string,
): Promise<{ ids?: string[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Ownership check (RLS lets a user read their own sightings).
  const { data: owned } = await supabase
    .from("sightings")
    .select("id")
    .eq("id", sightingId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!owned) return { error: "That sighting isn't yours." };

  const { data: prof } = await supabase
    .from("profiles")
    .select("featured_sighting_ids")
    .eq("id", user.id)
    .single();
  const current: string[] = prof?.featured_sighting_ids ?? [];

  let next: string[];
  if (current.includes(sightingId)) {
    next = current.filter((id) => id !== sightingId);
  } else {
    if (current.length >= 3) return { error: "You can favourite up to 3 sightings." };
    next = [...current, sightingId];
  }

  const { error } = await supabase
    .from("profiles")
    .update({ featured_sighting_ids: next })
    .eq("id", user.id);
  if (error) return { error: error.message };

  return { ids: next };
}

/**
 * Next page of a user's public sighting history (profile "Load more").
 * feed_sightings is publicly readable, so no auth check is needed.
 */
export async function loadMoreSightings(
  userId: string,
  offset: number,
): Promise<{ sightings?: Sighting[]; hasMore?: boolean; error?: string }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return { error: "Bad request." };
  }
  const off = Math.floor(Number(offset));
  if (!Number.isFinite(off) || off < 0 || off > 100_000) return { error: "Bad request." };

  const supabase = await createClient();
  return fetchUserSightings(supabase, userId, off, PROFILE_PAGE_SIZE);
}

/** Permanently delete the signed-in user via the delete-account Edge Function. */
export async function deleteAccount(): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Not signed in." };

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
    { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } },
  );
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    return { error: j.error ?? `Delete failed (${res.status}).` };
  }

  await supabase.auth.signOut();
  return { ok: true };
}
