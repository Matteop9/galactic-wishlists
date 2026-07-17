"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Pick which of the caller's photos fronts a Type/Airline book slot.
 * The sighting must belong to the caller, carry a photo, and actually match
 * the slot (its aircraft_type / airline equals the key).
 */
export async function setBookCover(
  kind: "type" | "airline",
  key: string,
  sightingId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (kind !== "type" && kind !== "airline") return { error: "Invalid book." };
  const k = key.trim();
  if (!k || k.length > 80) return { error: "Invalid slot." };

  const { data: s } = await supabase
    .from("sightings")
    .select("id, user_id, aircraft_type, airline, photo_path")
    .eq("id", sightingId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!s || !s.photo_path) return { error: "That photo isn't available." };
  if ((kind === "type" ? s.aircraft_type : s.airline) !== k) {
    return { error: "That photo doesn't belong to this slot." };
  }

  const { error } = await supabase.from("book_covers").upsert({
    user_id: user.id,
    kind,
    key: k,
    sighting_id: sightingId,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath("/books");
  return { ok: true };
}
