"use server";

import { createClient } from "@/lib/supabase/server";

// Canonical site origin for auth links — NEVER the request Origin header (a
// POSTed `Origin: evil.tld` would otherwise mint a magic link to the attacker's
// host). Same fallback as app/layout.tsx; set NEXT_PUBLIC_SITE_URL for a custom domain.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://skydex-two.vercel.app";

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
  const redirectTo = `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) return { error: error.message };
  return { sent: true };
}
