import { describe, expect, it } from 'vitest';
import { skeletonStep, SKELETON_DELAY_MS, SKELETON_MIN_MS } from './skeleton';

const NOW = 1_000_000;

describe('skeletonStep', () => {
  it('schedules the skeleton behind the delay so a warm cache never flashes one', () => {
    expect(skeletonStep(true, { shown: false, shownAt: null }, NOW)).toEqual({
      kind: 'show',
      delayMs: SKELETON_DELAY_MS,
    });
  });

  it('settles while pending with the skeleton already up', () => {
    expect(skeletonStep(true, { shown: true, shownAt: NOW - 50 }, NOW)).toEqual({ kind: 'settle' });
  });

  it('settles when nothing is pending and nothing is shown', () => {
    expect(skeletonStep(false, { shown: false, shownAt: null }, NOW)).toEqual({ kind: 'settle' });
  });

  it('holds a just-shown skeleton for the rest of its minimum time', () => {
    const shownFor = 100;
    expect(skeletonStep(false, { shown: true, shownAt: NOW - shownFor }, NOW)).toEqual({
      kind: 'hide',
      delayMs: SKELETON_MIN_MS - shownFor,
    });
  });

  it('hides immediately once the minimum has been served', () => {
    expect(skeletonStep(false, { shown: true, shownAt: NOW - SKELETON_MIN_MS }, NOW)).toEqual({
      kind: 'hide',
      delayMs: 0,
    });
  });

  it('never asks for a negative delay on a long-shown skeleton', () => {
    const step = skeletonStep(false, { shown: true, shownAt: NOW - 10_000 }, NOW);
    expect(step).toEqual({ kind: 'hide', delayMs: 0 });
  });

  it('hides straight away if it is shown without a timestamp', () => {
    expect(skeletonStep(false, { shown: true, shownAt: null }, NOW)).toEqual({
      kind: 'hide',
      delayMs: 0,
    });
  });
});
