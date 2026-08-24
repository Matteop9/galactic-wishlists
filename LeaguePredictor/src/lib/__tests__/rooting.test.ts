import { describe, expect, it } from 'vitest';
import { fixtureVerdict, stakeFor, type Stake } from '../rooting';

const stake = (predictedPos: number, currentPos: number): Stake => {
  const delta = currentPos - predictedPos;
  return {
    want: delta > 0 ? 'up' : delta < 0 ? 'down' : 'hold',
    places: Math.abs(delta),
    predictedPos,
    currentPos,
  };
};

describe('stakeFor', () => {
  const predicted = new Map([
    [1, 1],
    [2, 10],
    [3, 5],
  ]);
  const current = new Map([
    [1, 4],
    [2, 3],
    [3, 5],
  ]);

  it('wants a climb when predicted above current', () => {
    expect(stakeFor(1, predicted, current)).toEqual({
      want: 'up',
      places: 3,
      predictedPos: 1,
      currentPos: 4,
    });
  });

  it('wants a drop when predicted below current', () => {
    expect(stakeFor(2, predicted, current)).toEqual({
      want: 'down',
      places: 7,
      predictedPos: 10,
      currentPos: 3,
    });
  });

  it('holds when spot on', () => {
    expect(stakeFor(3, predicted, current)).toEqual({
      want: 'hold',
      places: 0,
      predictedPos: 5,
      currentPos: 5,
    });
  });

  it('returns null when the team is missing from either map', () => {
    expect(stakeFor(99, predicted, current)).toBeNull();
    expect(stakeFor(1, new Map(), current)).toBeNull();
  });
});

describe('fixtureVerdict', () => {
  it('cheers home when home needs to climb and away needs to drop', () => {
    expect(fixtureVerdict(stake(2, 6), stake(15, 8))).toEqual({ kind: 'home' });
  });

  it('cheers away in the mirror case', () => {
    expect(fixtureVerdict(stake(15, 8), stake(2, 6))).toEqual({ kind: 'away' });
  });

  it('cheers the climbing side against a spot-on side', () => {
    expect(fixtureVerdict(stake(2, 6), stake(5, 5))).toEqual({ kind: 'home' });
    expect(fixtureVerdict(stake(5, 5), stake(2, 6))).toEqual({ kind: 'away' });
  });

  it('cheers against a side that needs to drop when the other is spot on', () => {
    expect(fixtureVerdict(stake(15, 8), stake(5, 5))).toEqual({ kind: 'away' });
    expect(fixtureVerdict(stake(5, 5), stake(15, 8))).toEqual({ kind: 'home' });
  });

  it('is torn when both need to climb, leaning to the bigger gap', () => {
    expect(fixtureVerdict(stake(1, 8), stake(4, 6))).toEqual({ kind: 'torn', lean: 'home' });
    expect(fixtureVerdict(stake(4, 6), stake(1, 8))).toEqual({ kind: 'torn', lean: 'away' });
    expect(fixtureVerdict(stake(1, 4), stake(2, 5))).toEqual({ kind: 'torn', lean: null });
  });

  it('wants a draw when both need to drop', () => {
    expect(fixtureVerdict(stake(18, 3), stake(12, 7))).toEqual({ kind: 'draw' });
  });

  it('is happy either way when both are spot on', () => {
    expect(fixtureVerdict(stake(5, 5), stake(9, 9))).toEqual({ kind: 'either' });
  });

  it('handles a one-sided stake', () => {
    expect(fixtureVerdict(stake(2, 6), null)).toEqual({ kind: 'home' });
    expect(fixtureVerdict(stake(15, 8), null)).toEqual({ kind: 'away' });
    expect(fixtureVerdict(null, stake(2, 6))).toEqual({ kind: 'away' });
    expect(fixtureVerdict(null, stake(15, 8))).toEqual({ kind: 'home' });
    expect(fixtureVerdict(stake(5, 5), null)).toEqual({ kind: 'either' });
  });

  it('has no verdict with no stakes', () => {
    expect(fixtureVerdict(null, null)).toEqual({ kind: 'none' });
  });
});
