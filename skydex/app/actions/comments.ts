"use server";

import { createClient } from "@/lib/supabase/server";
import { containsProfanity } from "@/lib/profanity";

export type CommentResult = { ok?: boolean; error?: string };

// Posting a comment goes through here (not a direct client insert) so the
// profanity filter is enforced server-side and can't be bypassed from the
// browser. The author is taken from the server session, not trusted from input.
export async function addComment(
  sightingId: string,
  body: string,
): Promise<CommentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const text = String(body ?? "").trim().slice(0, 500);
  if (!text) return { error: "Comment is empty." };
  if (containsProfanity(text)) {
    return { error: "Please keep it clean — that comment was blocked." };
  }

  const { error } = await supabase
    .from("comments")
    .insert({ sighting_id: sightingId, user_id: user.id, body: text });
  if (error) return { error: error.message };

  return { ok: true };
}
