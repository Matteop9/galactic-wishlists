import { create } from 'zustand';
import { celebrationStep, type Celebration, type CelebrationState } from './celebrate';

/**
 * Where celebrations live. A store rather than context because the two main
 * triggers are inside react-query `onSuccess` callbacks — not React render
 * scope — so they need a plain function they can call, and because the host
 * has to render above the tab bar from a single mount point.
 *
 * Every decision (does this replace what's showing? how long for?) belongs to
 * `celebrate.ts`; this file only holds the result.
 */

interface Store extends CelebrationState {
  push: (celebration: Celebration) => void;
  dismiss: () => void;
}

export const useCelebration = create<Store>((set, get) => ({
  current: null,
  shownAt: 0,
  push: (celebration) => {
    const step = celebrationStep(celebration, { current: get().current, shownAt: get().shownAt }, Date.now());
    if (step.kind === 'show') set({ current: step.celebration, shownAt: Date.now() });
  },
  dismiss: () => set({ current: null, shownAt: 0 }),
}));

/**
 * Fire a celebration from anywhere, React or not. Takes null so callers can
 * pipe a decision straight in: `celebrate(rollCelebration(before, after))`.
 */
export function celebrate(celebration: Celebration | null): void {
  if (celebration) useCelebration.getState().push(celebration);
}

export function dismissCelebration(): void {
  useCelebration.getState().dismiss();
}
