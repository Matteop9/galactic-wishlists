/**
 * Skeleton timing, kept pure so it can be tested without a DOM (every test in
 * this project is a pure-function test). `useSkeleton` in ./useSkeleton.ts is a
 * thin wrapper that just runs the timer this decides.
 */

/** Warm caches answer in well under this, so no skeleton flashes for them. */
export const SKELETON_DELAY_MS = 140;
/** Once a skeleton is up it stays up this long — no strobe on a near-miss. */
export const SKELETON_MIN_MS = 300;

export interface SkeletonState {
  /** Is the skeleton currently on screen? */
  shown: boolean;
  /** When it went up (ms epoch), or null if it isn't up. */
  shownAt: number | null;
}

export type SkeletonStep =
  /** Nothing to schedule — the current state is already right. */
  | { kind: 'settle' }
  /** Put the skeleton up after `delayMs`. */
  | { kind: 'show'; delayMs: number }
  /** Take it down after `delayMs` (0 = immediately). */
  | { kind: 'hide'; delayMs: number };

/**
 * What should happen next, given the query's pending flag and what's on screen.
 *
 * - pending, nothing shown → show after the delay (a fast query never gets one)
 * - pending, already shown → settle
 * - settled, nothing shown → settle
 * - settled, shown → hide once the minimum on-screen time is served
 */
export function skeletonStep(pending: boolean, state: SkeletonState, now: number): SkeletonStep {
  if (pending) {
    return state.shown ? { kind: 'settle' } : { kind: 'show', delayMs: SKELETON_DELAY_MS };
  }
  if (!state.shown) return { kind: 'settle' };

  const shownFor = state.shownAt == null ? SKELETON_MIN_MS : now - state.shownAt;
  const remaining = SKELETON_MIN_MS - shownFor;
  return { kind: 'hide', delayMs: remaining > 0 ? remaining : 0 };
}
