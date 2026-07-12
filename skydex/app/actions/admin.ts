"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdminResult = { ok?: boolean; error?: string };

/** Delete a sighting and its photo. RLS permits the owner or an admin. */
export async function deleteSighting(id: string): Promise<AdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Remove the stored photo first (owner/admin storage-delete policies permit it).
  const { data: row } = await supabase
    .from("sightings")
    .select("photo_path")
    .eq("id", id)
    .maybeSingle();
  if (row?.photo_path) {
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

  const { error } = await supabase
    .from("reports")
    .update({ resolved: true })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/reports");
  return { ok: true };
}

/** Admin-only: uphold (approve=true) or overturn a community photo flag.
 *  The verdict itself is enforced in the resolve_photo_flag RPC (is_admin()). */
export async function resolvePhotoFlag(
  sightingId: string,
  approve: boolean,
): Promise<AdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.rpc("resolve_photo_flag", {
    p_sighting: sightingId,
    p_approve: approve,
  });
  if (error) return { error: error.message };

  revalidatePath("/reports");
  revalidatePath("/feed");
  return { ok: true };
}

/** Admin-only: mark a feedback item resolved. */
export async function resolveFeedback(id: string): Promise<AdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("feedback").update({ resolved: true }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/feedback");
  return { ok: true };
}
