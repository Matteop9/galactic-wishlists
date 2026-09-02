import { useEffect, useState } from 'react';
import { skeletonStep, type SkeletonState } from './skeleton';

/**
 * Gate a skeleton on this rather than on `query.isPending` directly: a query
 * that answers from cache never flashes one, and one that does show stays up
 * long enough to read. All the timing lives in `skeletonStep` (pure, tested).
 */
export function useSkeleton(pending: boolean): boolean {
  const [state, setState] = useState<SkeletonState>({ shown: false, shownAt: null });

  useEffect(() => {
    const step = skeletonStep(pending, state, Date.now());
    if (step.kind === 'settle') return;

    // shownAt is stamped when the skeleton actually goes up, not when it was scheduled.
    const apply = () =>
      setState(
        step.kind === 'show'
          ? { shown: true, shownAt: Date.now() }
          : { shown: false, shownAt: null },
      );

    if (step.delayMs === 0) {
      apply();
      return;
    }
    const timer = setTimeout(apply, step.delayMs);
    return () => clearTimeout(timer);
  }, [pending, state]);

  return state.shown;
}
