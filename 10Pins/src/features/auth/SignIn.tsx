import { useEffect, useState } from 'react';
import Wordmark from '../../components/Wordmark';
import { supabase } from '../../lib/supabase';

// Demo sign-in is anonymous: every visitor gets their own throwaway user and
// `join_demo` drops them into the demo group so there’s something to look at.
// It used to sign in to a shared account with VITE_DEMO_EMAIL/PASSWORD — but
// VITE_ vars are inlined into the deployed bundle, so those credentials were
// readable by anyone (COUNCIL_REVIEW_TODO item 2). No credential now exists
// to leak. Requires "Anonymous sign-ins" enabled on the Supabase project.
//
// The button only appears once the project has confirmed that setting. It
// used to default to visible and hide itself after a failed tap — which, with
// the setting off in production, meant every visitor saw a button that
// errored the first time they pressed it.

/**
 * Ask GoTrue whether anonymous sign-ins are on. `/auth/v1/settings` is the
 * public, unauthenticated capability endpoint; supabase-js has no wrapper for
 * it. Any failure means "don’t offer the demo" — the Google button still works.
 */
async function anonymousSignInEnabled(): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) return false;
    const body = (await res.json()) as { external?: { anonymous_users?: boolean } };
    return body.external?.anonymous_users === true;
  } catch {
    return false;
  }
}

/** Google is the only sign-in method (product decision, 2026-07-06). */
export default function SignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demoAvailable, setDemoAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    anonymousSignInEnabled().then((enabled) => {
      if (!cancelled) setDemoAvailable(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signInWithGoogle() {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Return to the current URL so deep links (invite/claim landings) survive sign-in
      options: { redirectTo: window.location.href },
    });
    if (err) {
      setError("Google sign-in didn’t start — try again.");
      setBusy(false);
    }
    // On success the browser redirects to Google, so there’s no local success state.
  }

  async function signInAsDemo() {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInAnonymously();
    if (err) {
      setDemoAvailable(false);
      setError("The demo isn’t available right now — sign in with Google instead.");
      setBusy(false);
      return;
    }
    // A profile and a seat in the demo group, so the app isn’t empty. If this
    // fails the app still works — you land on first-run like any new player.
    const { error: joinErr } = await supabase.rpc('join_demo');
    if (joinErr) setError("The demo group didn’t load — everything else works.");
    setBusy(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col justify-center gap-10 px-6 py-12">
      <div className="flex flex-col items-center gap-3">
        <Wordmark />
        <p className="text-[13.5px] text-dim">The app for your bowling crew</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          className="rounded-[10px] bg-phosphor py-3.5 font-display text-[15px] font-bold text-ink shadow-glow-amber disabled:opacity-60"
        >
          {busy ? 'Opening Google…' : 'Continue with Google'}
        </button>
        <p className="text-center text-[12px] text-faint">
          No password needed — your Google account signs you in.
        </p>
        {demoAvailable && (
          <button
            type="button"
            onClick={signInAsDemo}
            disabled={busy}
            className="mt-2 rounded-[10px] border border-line bg-panel py-3 text-[15px] font-bold text-text disabled:opacity-60"
          >
            Try the demo
          </button>
        )}
        {error && (
          <p className="text-center text-[13.5px] text-signal" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
