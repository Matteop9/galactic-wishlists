"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { agreeToPublicSharing } from "@/app/actions/consent";

// Routes the gate steps aside for, so a user can actually read what they're
// being asked to agree to (and reach support) before agreeing. It returns as
// soon as they navigate back into the app.
const READABLE = ["/privacy", "/terms", "/support", "/attributions"];

/**
 * Blocking, explicit consent to publishing — App Store guideline 5.1.2 wants
 * the agreement obtained *in the app* before a user's score reaches a global
 * leaderboard. Until they agree, `profiles.public_consent_at` is null and the
 * leaderboard() RPC leaves them out entirely.
 *
 * Deliberately not dismissable: no backdrop click, no Escape, no close button.
 * The only ways out are agreeing or signing out.
 */
export default function ConsentGate({ optIn: initialOptIn }: { optIn: boolean }) {
  const [agreed, setAgreed] = useState(false);
  const [optIn, setOptIn] = useState(initialOptIn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  if (agreed || READABLE.some((r) => pathname.startsWith(r))) return null;

  async function agree() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await agreeToPublicSharing(optIn);
    if (res.error) {
      setError(res.error);
      setBusy(false);
      return;
    }
    setAgreed(true);
    router.refresh();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-4"
    >
      <div className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-lg border-2 border-ink bg-paper shadow-2xl">
        <div className="overflow-y-auto px-6 pb-5 pt-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-stamp">
          Before you start
        </p>
        <h2
          id="consent-title"
          className="mt-1 font-display text-2xl font-bold tracking-tight text-ink"
        >
          What SkyDex shares publicly
        </h2>

        <p className="mt-2 text-sm text-ink-soft">
          SkyDex is a shared logbook: some of what you create is uploaded to our servers
          and shown to other people. Exactly what:
        </p>

        <ul className="mt-4 flex flex-col gap-3 text-sm text-ink-soft">
          <li className="flex gap-2.5">
            <span aria-hidden="true">🏆</span>
            <span>
              <span className="font-semibold text-ink">Global leaderboards.</span>{" "}
              Your username and sighting scores — spots, types, carriers, airports and rarity
              points — are uploaded and ranked against every other spotter. Every SkyDex
              user can see them.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true">📸</span>
            <span>
              <span className="font-semibold text-ink">Public feed.</span>{" "}
              Your photo, username and the aircraft&apos;s details appear on the global feed, where
              anyone can react and comment.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true">📍</span>
            <span>
              <span className="font-semibold text-ink">Location stays private.</span>{" "}
              Your GPS position, heading and tilt are used only to verify you could
              genuinely see the aircraft — never shown to other users.
            </span>
          </li>
        </ul>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-paper-edge bg-paper-deep p-3">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-sky"
          />
          <span className="text-sm text-ink">
            Include me on the global leaderboards
            <span className="mt-0.5 block text-xs text-ink-faint">
              Untick to keep your scores off the public boards — you can change this
              any time in Settings.
            </span>
          </span>
        </label>

        {error && <p className="mt-3 text-sm text-stamp">{error}</p>}

        <p className="mt-4 text-xs text-ink-faint">
          Full detail in the{" "}
          <Link href="/privacy" className="underline hover:text-ink">
            privacy policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="underline hover:text-ink">
            terms
          </Link>
          .
        </p>
        </div>

        {/* Action row sits outside the scroll area so "I agree" is always in view. */}
        <div className="border-t border-paper-edge bg-paper-deep px-6 py-4">
          <button
            onClick={agree}
            disabled={busy}
            className="sd-btn sd-btn--capture w-full justify-center"
          >
            {busy ? "Saving…" : "I agree — continue"}
          </button>
          <form action="/auth/signout" method="post" className="mt-3">
            <button
              type="submit"
              className="w-full font-mono text-xs uppercase tracking-widest text-ink-faint hover:text-ink"
            >
              No thanks — sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
