import { useState } from 'react';
import Wordmark from '../../components/Wordmark';
import { supabase } from '../../lib/supabase';

// Demo sign-in for the hosted preview: enabled only when the deployment sets
// VITE_DEMO_LOGIN=1, with throwaway demo-account credentials from env.
const DEMO_ENABLED = import.meta.env.VITE_DEMO_LOGIN === '1';
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL as string | undefined;
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD as string | undefined;

/** Google is the only sign-in method (product decision, 2026-07-06). */
export default function SignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
    if (!DEMO_EMAIL || !DEMO_PASSWORD) return;
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (err) {
      setError("The demo account isn't available right now.");
      setBusy(false);
    }
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
        {DEMO_ENABLED && (
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
