import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { remainingMs } from '../lib/celebrate';
import { useCelebration } from '../lib/celebrationStore';
import { useReducedMotion } from '../lib/useReducedMotion';

/**
 * Where celebrations get shown. Mounted once, high in the tree and OUTSIDE the
 * route cross-fade wrapper — inside it, every navigation would remount this
 * and kill the celebration mid-flight.
 *
 * "Always skippable" is four things, not one:
 *  1. tiers 1–2 are `pointer-events-none`, so they cannot be tapped and cannot
 *     block anything — the strongest form of skippable there is;
 *  2. the next keypad tap replaces or clears whatever is showing;
 *  3. tier 3 has a full-screen tap-to-dismiss backdrop;
 *  4. changing screen dismisses everything.
 *
 * Tiers 1–2 sit at the TOP of the screen on purpose: in the live scorer the
 * scorecard is above and the keypad below, so a bottom toast would land
 * directly on the keys.
 */
export default function CelebrationHost() {
  const { current, shownAt, dismiss } = useCelebration();
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  // Auto-dismiss. Keyed on the celebration’s id so a replacement restarts the clock.
  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(dismiss, remainingMs({ current, shownAt }, Date.now()));
    return () => window.clearTimeout(timer);
  }, [current, shownAt, dismiss]);

  // A celebration belongs to the screen that earned it.
  useEffect(() => {
    dismiss();
  }, [location.pathname, dismiss]);

  useEffect(() => {
    if (!current || current.tier < 3) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, dismiss]);

  if (!current) return null;

  // Tier 3 is a full-screen moment — but under reduced motion a scrim that
  // blinks in and out is worse than no celebration, so it drops to a pill.
  if (current.tier === 3 && !reduced) {
    return (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-ink/70 px-6"
        onClick={dismiss}
        role="status"
        aria-live="polite"
      >
        <div className="celebrate-glow flex flex-col items-center gap-2 rounded-sheet border border-phosphor/50 bg-panel px-6 py-6 text-center">
          <p className="font-display text-[26px] font-extrabold tracking-[.02em] text-phosphor">
            {current.label}
          </p>
          {current.detail && <p className="text-[13.5px] text-dim">{current.detail}</p>}
          {current.gameId && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                dismiss();
                navigate(`/games/${current.gameId}`);
              }}
              className="press mt-2 rounded-control bg-phosphor px-4 py-2 font-display text-[13px] font-bold text-ink"
            >
              See it
            </button>
          )}
          <p className="text-[12px] text-dim pt-1">Tap to carry on</p>
        </div>
      </div>
    );
  }

  const spark = current.tier === 1;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-50 mx-auto flex w-full max-w-[390px] justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={`${spark ? 'celebrate-spark' : 'celebrate-toast'} rounded-full border border-phosphor/45 bg-panel/95 px-4 py-1.5`}
      >
        <span className="font-display text-[14px] font-bold text-phosphor">{current.label}</span>
        {current.detail && <span className="ml-2 text-[12px] text-dim">{current.detail}</span>}
      </div>
    </div>
  );
}
