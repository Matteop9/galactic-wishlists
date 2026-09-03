import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { remainingMs } from '../lib/celebrate';
import { useCelebration } from '../lib/celebrationStore';
import { useReducedMotion } from '../lib/useReducedMotion';

/**
 * Where celebrations get shown. Mounted once, high in the tree and OUTSIDE the
 * route cross-fade wrapper: inside it, every navigation would remount this
 * and kill the celebration mid-flight.
 *
 * Three intensities, all quiet: a strike is a small ink toast, a turkey the
 * same toast with a detail line, a new high game a paper card over a scrim.
 * Red is the one colour allowed here, because a celebration is "hot".
 *
 * "Always skippable" is four things, not one: tiers 1–2 are pointer-events-
 * none so they cannot block anything; the next keypad tap replaces or clears
 * whatever is showing; tier 3 has a full-screen tap-to-dismiss backdrop; and
 * changing screen dismisses everything.
 *
 * Tiers 1–2 sit at the top of the screen on purpose: in the live scorer the
 * sheet is above and the keypad below, so a bottom toast would land on the keys.
 */
export default function CelebrationHost() {
  const { current, shownAt, dismiss } = useCelebration();
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  // Auto-dismiss. Keyed on the celebration's id so a replacement restarts the clock.
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

  // Tier 3 is a full-screen moment, but under reduced motion a scrim that
  // blinks in and out is worse than no celebration, so it drops to the toast.
  if (current.tier === 3 && !reduced) {
    return (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-scrim px-6"
        onClick={dismiss}
        role="status"
        aria-live="polite"
      >
        <div className="sheet-up strip flex w-full max-w-[320px] flex-col items-center gap-2 px-6 py-7 text-center">
          <p className="num text-[30px] font-semibold leading-none text-red">{current.label}</p>
          {current.detail && <p className="text-[14px] text-ink-faded">{current.detail}</p>}
          {current.gameId && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                dismiss();
                navigate(`/games/${current.gameId}`);
              }}
              className="btn-primary-sm mt-3"
            >
              See the game
            </button>
          )}
          <p className="pt-1 text-[12px] text-ink-faded">Tap to carry on</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-50 mx-auto flex w-full max-w-[390px] justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="sheet-up flex items-baseline gap-2 rounded-r2 bg-ink px-4 py-2 text-paper">
        <span className="num text-[15px] font-semibold">{current.label}</span>
        {current.detail && <span className="text-[12px] text-card">{current.detail}</span>}
      </div>
    </div>
  );
}
