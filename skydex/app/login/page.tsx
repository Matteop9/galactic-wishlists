"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const rawNext = useSearchParams().get("next") ?? "/scrapbook";
  // Same-origin paths only — mirrors the check in /auth/callback.
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : "/scrapbook";
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function google() {
    setOauthError(null);
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setOauthError(error.message);
      setPending(false);
    }
    // On success the browser navigates away — leave `pending` on.
  }

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="font-mono text-xs uppercase tracking-widest text-ink-soft hover:text-ink">
        ← SkyDex
      </Link>
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-ink-soft">
        One tap with Google — no passwords, no email links.
      </p>

      <button
        onClick={google}
        disabled={pending}
        className="sd-btn sd-btn--capture mt-6 w-full justify-center"
      >
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
      {oauthError && <p className="mt-2 text-sm text-stamp">{oauthError}</p>}

      <p className="mt-5 text-xs text-ink-faint">
        Signed up by email before? Use Google with the same address and your
        logbook carries straight over.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
