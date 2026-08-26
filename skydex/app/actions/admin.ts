"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdminResult = { ok?: boolean; error?: string };

/** RLS already gates every statement below; this makes the admin requirement
 *  explicit so a policy regression fails loudly instead of silently no-opping. */
async function isAdmin(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}

/** Delete a sighting and its photo. Owner or admin only. */
export async function deleteSighting(id: string): Promise<AdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: row } = await supabase
    .from("sightings")
    .select("user_id, photo_path")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Sighting not found." };
  if (row.user_id !== user.id && !(await isAdmin(supabase))) {
    return { error: "Not allowed." };
  }

  // Remove the stored photo first (owner/admin storage-delete policies permit it).
  if (row.photo_path) {
    await supabase.storage.from("sightings").remove([row.photo_path]);
  }

  const { error } = await supabase.from("sightings").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/feed");
  revalidatePath("/scrapbook");
  return { ok: true };
}

/** Admin-only: mark a report resolved. */
export async function resolveReport(id: string): Promise<AdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (!(await isAdmin(supabase))) return { error: "Not allowed." };

  const { error } = await supabase
    .from("reports")
    .update({ resolved: true })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/reports");
  return { ok: true };
}

/** Admin-only: uphold (approve=true) or overturn a community photo flag.
 *  The verdict itself is enforced in the resolve_photo_flag RPC (is_admin()).
 *  Upholding hard-deletes the sighting row, so the photo path is captured
 *  first and the stored file removed after. */
export async function resolvePhotoFlag(
  sightingId: string,
  approve: boolean,
): Promise<AdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (!(await isAdmin(supabase))) return { error: "Not allowed." };

  let photoPath: string | null = null;
  if (approve) {
    const { data: row } = await supabase
      .from("sightings")
      .select("photo_path")
      .eq("id", sightingId)
      .maybeSingle();
    photoPath = row?.photo_path ?? null;
  }

  const { error } = await supabase.rpc("resolve_photo_flag", {
    p_sighting: sightingId,
    p_approve: approve,
  });
  if (error) return { error: error.message };

  if (approve && photoPath) {
    await supabase.storage.from("sightings").remove([photoPath]);
  }

  revalidatePath("/reports");
  revalidatePath("/feed");
  revalidatePath("/scrapbook");
  return { ok: true };
}

/** Admin-only: mark a feedback item resolved. */
export async function resolveFeedback(id: string): Promise<AdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (!(await isAdmin(supabase))) return { error: "Not allowed." };

  const { error } = await supabase.from("feedback").update({ resolved: true }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/feedback");
  return { ok: true };
}
