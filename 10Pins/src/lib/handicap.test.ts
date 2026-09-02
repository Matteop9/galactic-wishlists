import { describe, expect, it } from 'vitest';
import { defaultHandicap } from './handicap';

describe('defaultHandicap', () => {
  it('applies the standard 90% of (200 − average) formula', () => {
    expect(defaultHandicap(120, 200, 90)).toBe(72); // 0.9 × 80
    expect(defaultHandicap(150, 200, 90)).toBe(45);
    expect(defaultHandicap(100, 200, 90)).toBe(90);
  });

  it('rounds to the nearest pin', () => {
    expect(defaultHandicap(150.5, 200, 90)).toBe(45); // 44.55 → 45
    expect(defaultHandicap(149.5, 200, 90)).toBe(45); // 45.45 → 45
    expect(defaultHandicap(133.3, 200, 90)).toBe(60); // 60.03 → 60
  });

  it('never goes below zero for players above the basis', () => {
    expect(defaultHandicap(200, 200, 90)).toBe(0);
    expect(defaultHandicap(230, 200, 90)).toBe(0);
    expect(defaultHandicap(300, 200, 90)).toBe(0);
  });

  it('gives guests and new players (no average) a zero handicap', () => {
    expect(defaultHandicap(null, 200, 90)).toBe(0);
    expect(defaultHandicap(undefined, 200, 90)).toBe(0);
    expect(defaultHandicap(Number.NaN, 200, 90)).toBe(0);
  });

  it('respects a custom basis and percentage', () => {
    expect(defaultHandicap(120, 220, 100)).toBe(100);
    expect(defaultHandicap(120, 180, 50)).toBe(30);
    expect(defaultHandicap(120, 200, 0)).toBe(0);
  });

  it('handles a perfect-scrub 0 average', () => {
    expect(defaultHandicap(0, 200, 90)).toBe(180);
  });
});
