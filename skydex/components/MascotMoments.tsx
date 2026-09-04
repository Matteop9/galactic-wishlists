"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Mascot, { useMascotEnabled } from "@/components/Mascot";
import {
  HINT_CHANCE,
  HINT_DWELL_MS,
  HINT_MIN_GAP_MS,
  INTRO_LINES,
  hintPool,
  isQuietRoute,
} from "@/lib/mascotLines";

// Two unprompted appearances, both small, both dismissible, never blocking:
//
//  1. INTRO — once, for anyone who never met her in the first-run guide
//     (existing users). New users meet her in GuideModal, which marks the
//     intro seen on close, so nobody gets both.
//  2. HINTS — on a page view, with probability HINT_CHANCE, at most once per
//     HINT_MIN_GAP_MS, never on quiet routes (viewfinder, sign-in, legal, share
//     pages), never while a dialog is open, never the same hint twice running.
//     Slides away after HINT_DWELL_MS or on tap.
//
// Dev: with the admin Dev-mode cookie, ?hint=1 forces a hint and ?intro=1
// forces the intro, so both can be checked without waiting on the dice.

export const INTRO_SEEN_KEY = "skydex_mascot_intro_seen";
const HINT_AT_KEY = "skydex_mascot_hint_at";
const HINT_LAST_KEY = "skydex_mascot_hint_last";
const GUIDE_SEEN_KEY = "skydex_guide_seen";

function devForced(param: string): boolean {
  try {
    return (
      /(?:^|;\s*)skydex_dev=1(?:;|$)/.test(document.cookie) &&
      new URLSearchParams(window.location.search).get(param) === "1"
    );
  } catch {
    return false;
  }
}

function dialogOpen(): boolean {
  return Boolean(document.querySelector('[role="dialog"]'));
}

export default function MascotMoments({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const enabled = useMascotEnabled();
  const [intro, setIntro] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // Intro — decided once per mount, deferred a tick.
  useEffect(() => {
    if (enabled !== true) return;
    const t = setTimeout(() => {
      if (isQuietRoute(pathname)) return;
      let guideSeen = false;
      let introSeen = false;
      try {
        guideSeen = Boolean(localStorage.getItem(GUIDE_SEEN_KEY));
        introSeen = Boolean(localStorage.getItem(INTRO_SEEN_KEY));
      } catch {
        return;
      }
      // Never stack on the first-run guide: it introduces her itself.
      if (devForced("intro") || (guideSeen && !introSeen && !dialogOpen())) setIntro(true);
    }, 600);
    return () => clearTimeout(t);
  }, [enabled, pathname]);

  // Hints — roll the dice on each navigation.
  useEffect(() => {
    if (enabled !== true || !signedIn) return;
    const t = setTimeout(() => {
      if (isQuietRoute(pathname) || dialogOpen() || intro) return;
      const forced = devForced("hint");
      let lastAt = 0;
      let last = "";
      try {
        lastAt = Number(localStorage.getItem(HINT_AT_KEY) ?? 0);
        last = localStorage.getItem(HINT_LAST_KEY) ?? "";
      } catch {
        /* fall through with defaults */
      }
      if (!forced) {
        if (Date.now() - lastAt < HINT_MIN_GAP_MS) return;
        if (Math.random() > HINT_CHANCE) return;
      }
      const pool = hintPool(pathname).filter((h) => h !== last);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      try {
        localStorage.setItem(HINT_AT_KEY, String(Date.now()));
        localStorage.setItem(HINT_LAST_KEY, pick);
      } catch {
        /* ignore */
      }
      setHint(pick);
    }, 1800);
    return () => clearTimeout(t);
  }, [enabled, signedIn, pathname, intro]);

  // Hints leave by themselves.
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), HINT_DWELL_MS);
    return () => clearTimeout(t);
  }, [hint]);

  function closeIntro() {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setIntro(false);
  }

  if (enabled !== true) return null;

  if (intro) {
    return (
      <div
        role="status"
        className="sd-card-rise fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 mx-auto w-[calc(100%-2rem)] max-w-sm sm:bottom-6"
      >
        <div className="flex gap-3 rounded-xl border border-paper-edge bg-paper-deep p-4 shadow-[0_8px_24px_rgba(32,38,43,0.16)]">
          <Mascot pose="wave" size={64} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-stamp">Meet Skye</p>
            <p className="mt-1 font-serif text-sm text-ink">{INTRO_LINES[0]}</p>
            <p className="mt-1 font-serif text-sm text-ink-soft">
              Switch me off any time under{" "}
              <Link href="/settings" onClick={closeIntro} className="text-sky-deep underline">
                Settings → Your companion
              </Link>
              .
            </p>
            <button type="button" onClick={closeIntro} className="sd-btn sd-btn--log mt-3 !px-3 !py-1.5 !text-xs">
              Noted
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hint) {
    return (
      <button
        type="button"
        onClick={() => setHint(null)}
        aria-label="Dismiss hint"
        className="sd-card-rise fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 mx-auto flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 text-left sm:bottom-6"
      >
        <Mascot pose="point" size={48} className="shrink-0 drop-shadow-sm" />
        <span className="sd-says flex-1 font-serif text-sm text-ink shadow-[0_8px_24px_rgba(32,38,43,0.16)]">{hint}</span>
      </button>
    );
  }

  return null;
}
