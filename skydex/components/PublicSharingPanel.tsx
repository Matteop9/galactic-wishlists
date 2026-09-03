"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setLeaderboardOptIn } from "@/app/actions/consent";

/**
 * Settings → Public sharing. The consent given at the gate is withdrawable
 * here: turning the leaderboards off removes the user from leaderboard()
 * immediately (their scores stop being published).
 */
export default function PublicSharingPanel({
  optIn: initial,
  consentedAt,
}: {
  optIn: boolean;
  consentedAt: string | null;
}) {
  const [optIn, setOptIn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !optIn;
    setOptIn(next);
    setError(null);
    startTransition(async () => {
      const res = await setLeaderboardOptIn(next);
      if (res.error) {
        setOptIn(!next); // put it back — nothing was saved
        setError(res.error);
      }
    });
  }

  return (
    <div className="mt-6 rounded-lg border border-paper-edge p-4">
      <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
        Public sharing
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Your username, photos and aircraft details appear on the global feed. Your
        username and sighting scores can also be ranked on the global leaderboards
        that every SkyDex user can see. Your precise location is never published — see
        the{" "}
        <Link href="/privacy" className="text-sky underline">
          privacy policy
        </Link>
        .
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-paper-edge pt-3">
        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
            Global leaderboards
          </p>
          <p className="text-sm text-ink-soft">
            {optIn
              ? "Your scores are published to the public boards."
              : "You're off the public boards — your scores stay private."}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={pending}
          aria-pressed={optIn}
          className={`rounded-full border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wide disabled:opacity-60 ${
            optIn
              ? "border-sky bg-sky text-paper"
              : "border-paper-edge text-ink-soft hover:border-ink"
          }`}
        >
          {optIn ? "On" : "Off"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-stamp">{error}</p>}

      {consentedAt && (
        <p className="mt-3 font-mono text-[11px] text-ink-faint">
          You agreed to public sharing on{" "}
          {new Date(consentedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          .
        </p>
      )}
    </div>
  );
}
