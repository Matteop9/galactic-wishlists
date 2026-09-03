"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type OAuthProvider = "google" | "apple";

// Apple mark for the Sign in with Apple button (Apple's guidelines want their
// logo on the button; the  glyph renders as tofu off Apple devices).
function AppleMark() {
  return (
    <svg viewBox="0 0 814 1000" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/scrapbook";
  // Same-origin paths only — mirrors the check in /auth/callback.
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : "/scrapbook";
  // /auth/callback bounces here with ?error=auth when the code exchange fails
  // or the user cancels at the provider — surface it instead of dead-ending.
  const bounced = params.get("error") != null;
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwPending, setPwPending] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  async function oauth(provider: OAuthProvider) {
    setOauthError(null);
    setPending(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setOauthError(error.message);
      setPending(null);
    }
    // On success the browser navigates away — leave `pending` on.
  }

  // App Review requires sign-in credentials, but SkyDex is OAuth-only — this
  // password path exists solely for Apple's one-off review account. There is
  // no email signup (signInWithPassword can't create accounts).
  async function reviewSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (pwPending) return;
    setPwError(null);
    setPwPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setPwError("Email sign-in is reserved for App Review.");
      setPwPending(false);
      return;
    }
    window.location.assign(next);
  }

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="font-mono text-xs uppercase tracking-widest text-ink-soft hover:text-ink">
        ← SkyDex
      </Link>
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-ink-soft">One tap with Google or Apple. No passwords, no email links.</p>

      {bounced && !pending && !oauthError && (
        <p className="mt-4 rounded-lg border border-paper-edge bg-paper-deep p-3 text-sm text-stamp">
          That sign-in didn&apos;t complete — give it another try.
        </p>
      )}

      <button
        onClick={() => oauth("google")}
        disabled={pending != null}
        className="sd-btn sd-btn--capture mt-6 w-full justify-center"
      >
        {pending === "google" ? "Opening Google…" : "Continue with Google"}
      </button>
      <button
        onClick={() => oauth("apple")}
        disabled={pending != null}
        className="sd-btn mt-3 w-full justify-center bg-black text-white hover:bg-neutral-800"
      >
        <AppleMark />
        {pending === "apple" ? "Opening Apple…" : "Continue with Apple"}
      </button>
      {oauthError && <p className="mt-2 text-sm text-stamp">{oauthError}</p>}

      <p className="mt-4 text-xs text-ink-faint">
        Signing in accepts the{" "}
        <Link href="/terms" className="underline hover:text-ink">terms</Link> and the{" "}
        <Link href="/privacy" className="underline hover:text-ink">privacy policy</Link>.
        Before anything of yours is published, SkyDex asks you to agree to exactly what
        appears on the public feed and the global leaderboards — and the leaderboards
        stay optional.
      </p>

      {!reviewOpen ? (
        <button
          onClick={() => setReviewOpen(true)}
          className="mt-8 font-mono text-[10px] uppercase tracking-widest text-ink-faint hover:text-ink"
        >
          App Review sign-in
        </button>
      ) : (
        <form onSubmit={reviewSignIn} className="mt-8 flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            App Review sign-in
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Review account email"
            autoComplete="username"
            required
            className="rounded-md border border-paper-edge bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sky"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            className="rounded-md border border-paper-edge bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sky"
          />
          <button
            type="submit"
            disabled={pwPending || pending != null}
            className="sd-btn sd-btn--log w-full justify-center"
          >
            {pwPending ? "Signing in…" : "Sign in"}
          </button>
          {pwError && <p className="text-sm text-stamp">{pwError}</p>}
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
