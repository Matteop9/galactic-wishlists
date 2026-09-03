import { useEffect, useState } from 'react';
import Strip from '../../components/Strip';
import Wordmark from '../../components/Wordmark';
import { supabase } from '../../lib/supabase';

// Demo sign-in is anonymous: every visitor gets their own throwaway user and
// `join_demo` drops them into the demo group so there is something to look at.
// It used to sign in to a shared account with VITE_DEMO_EMAIL/PASSWORD, but
// VITE_ vars are inlined into the deployed bundle, so those credentials were
// readable by anyone (COUNCIL_REVIEW_TODO item 2). No credential now exists
// to leak. Requires "Anonymous sign-ins" enabled on the Supabase project.
//
// The button only appears once the project has confirmed that setting. It
// used to default to visible and hide itself after a failed tap, which, with
// the setting off in production, meant every visitor saw a button that
// errored the first time they pressed it.

/**
 * Ask GoTrue whether anonymous sign-ins are on. `/auth/v1/settings` is the
 * public, unauthenticated capability endpoint; supabase-js has no wrapper for
 * it. Any failure means "do not offer the demo": the Google button still works.
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

  // A bounced or cancelled OAuth redirect can land you back here with `busy`
  // still true from before the browser navigated away, leaving the button
  // stuck on "Opening Google…" forever (COUNCIL_REVIEW_TODO item 26). Both
  // `pageshow` (bfcache restores, including back-navigation) and a tab
  // becoming visible again catch that.
  useEffect(() => {
    const reset = () => setBusy(false);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') reset();
    };
    window.addEventListener('pageshow', reset);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', reset);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  async function signInWithGoogle() {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Return to the current path so deep links (invite/claim landings) survive
      // sign-in: origin + pathname + search, not the full href, so a stale hash
      // never rides along into the redirect (COUNCIL_REVIEW_TODO item 26).
      options: { redirectTo: window.location.origin + window.location.pathname + window.location.search },
    });
    if (err) {
      setError('Google sign-in didn’t start. Try again.');
      setBusy(false);
    }
    // On success the browser redirects to Google, so there is no local state to set.
  }

  async function signInAsDemo() {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInAnonymously();
    if (err) {
      setDemoAvailable(false);
      setError('The demo isn’t available right now. Sign in with Google instead.');
      setBusy(false);
      return;
    }
    // A profile and a seat in the demo group, so the app is not empty. If this
    // fails the app still works: you land on first-run like any new player.
    const { error: joinErr } = await supabase.rpc('join_demo');
    if (joinErr) setError('The demo group didn’t load. Everything else works.');
    setBusy(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-2">
        <Wordmark />
        <p className="text-[13px] text-ink-faded">The scoresheet for your bowling group</p>
      </div>

      <Strip>
        <div className="flex flex-col gap-2.5 p-3.5">
          <button type="button" onClick={signInWithGoogle} disabled={busy} className="btn-primary w-full">
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>
          <p className="text-center text-[13px] text-ink-faded">
            No password. Your Google account signs you in.
          </p>
        </div>
        {demoAvailable && (
          <div className="p-3.5">
            <button type="button" onClick={signInAsDemo} disabled={busy} className="btn-secondary w-full">
              Try the demo
            </button>
          </div>
        )}
      </Strip>

      {error && (
        <p className="text-center text-[13px] text-red" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
