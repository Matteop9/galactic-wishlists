"use client";

import { useActionState, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInWithEmail, type LoginState } from "./actions";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const rawNext = useSearchParams().get("next") ?? "/scrapbook";
  // Same-origin paths only — mirrors the check in /auth/callback.
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : "/scrapbook";
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [emailState, emailAction, emailPending] = useActionState<LoginState, FormData>(
    signInWithEmail,
    {},
  );

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
        One tap with Google, or a magic link by email. No passwords.
      </p>

      <button
        onClick={google}
        disabled={pending}
        className="sd-btn sd-btn--capture mt-6 w-full justify-center"
      >
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
      {oauthError && <p className="mt-2 text-sm text-stamp">{oauthError}</p>}

      <div className="my-5 flex items-center gap-3 text-ink-faint">
        <span className="h-px flex-1 bg-paper-edge" />
        <span className="font-mono text-xs uppercase tracking-widest">or email</span>
        <span className="h-px flex-1 bg-paper-edge" />
      </div>

      {emailState.sent ? (
        <div className="rounded-lg border border-paper-edge bg-paper-deep p-4">
          Check your inbox — we&apos;ve sent you a sign-in link. You can close this tab.
        </div>
      ) : (
        <form action={emailAction} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="rounded-md border border-paper-edge bg-paper-deep px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-sky"
          />
          {emailState.error && <p className="text-sm text-stamp">{emailState.error}</p>}
          <button type="submit" disabled={emailPending} className="sd-btn sd-btn--log">
            {emailPending ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}
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
