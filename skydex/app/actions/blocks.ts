"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BlockResult = { ok?: boolean; error?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Blocking goes through here (not a direct client insert) so the author comes
// from the server session. RLS pins blocker_id to the caller either way; the
// blocks table's throttle trigger caps runaway inserts.
export async function blockUser(blockedId: string): Promise<BlockResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (!UUID_RE.test(blockedId)) return { error: "Bad request." };
  if (blockedId === user.id) return { error: "You can't block yourself." };

  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: user.id, blocked_id: blockedId });
  // 23505 = already blocked — the outcome the caller wanted, so not an error.
  if (error && error.code !== "23505") return { error: error.message };

  revalidatePath("/feed");
  revalidatePath("/settings");
  return { ok: true };
}

export async function unblockUser(blockedId: string): Promise<BlockResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (!UUID_RE.test(blockedId)) return { error: "Bad request." };

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId);
  if (error) return { error: error.message };

  revalidatePath("/feed");
  revalidatePath("/settings");
  return { ok: true };
}
