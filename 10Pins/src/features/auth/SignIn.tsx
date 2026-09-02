import { useState } from 'react';
import Wordmark from '../../components/Wordmark';
import { supabase } from '../../lib/supabase';

// Demo sign-in is anonymous: every visitor gets their own throwaway user and
// `join_demo` drops them into the demo group so there's something to look at.
// It used to sign in to a shared account with VITE_DEMO_EMAIL/PASSWORD — but
// VITE_ vars are inlined into the deployed bundle, so those credentials were
// readable by anyone (COUNCIL_REVIEW_TODO item 2). No credential now exists
// to leak. Requires "Anonymous sign-ins" enabled on the Supabase project; the
// button hides itself if the call comes back rejected.

/** Google is the only sign-in method (product decision, 2026-07-06). */
export default function SignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demoAvailable, setDemoAvailable] = useState(true);

  async function signInWithGoogle() {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Return to the current URL so deep links (invite/claim landings) survive sign-in
      options: { redirectTo: window.location.href },
    });
    if (err) {
      setError("Google sign-in didn't start — try again.");
      setBusy(false);
    }
    // On success the browser redirects to Google, so there's no local success state.
  }

  async function signInAsDemo() {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInAnonymously();
    if (err) {
      setDemoAvailable(false);
      setError("The demo isn't available right now — sign in with Google instead.");
      setBusy(false);
      return;
    }
    // A profile and a seat in the demo group, so the app isn't empty. If this
    // fails the app still works — you land on first-run like any new player.
    const { error: joinErr } = await supabase.rpc('join_demo');
    if (joinErr) setError("The demo group didn't load — everything else works.");
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
