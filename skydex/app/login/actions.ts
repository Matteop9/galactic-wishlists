"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; sent?: boolean };

/** Send a magic-link / OTP email. Creates the user if they don't exist yet. */
export async function signInWithEmail(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const rawNext = String(formData.get("next") ?? "/scrapbook");
  // Same-origin paths only — mirrors the check in /auth/callback.
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : "/scrapbook";

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) return { error: error.message };
  return { sent: true };
}
