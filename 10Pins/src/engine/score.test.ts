import { describe, expect, it } from 'vitest';
import { EngineError, score, type FrameInput, type Roll } from './index';

const g = (...frames: Roll[][]): FrameInput[] => frames.map((rolls) => ({ rolls }));
const cumulatives = (frames: FrameInput[]) => score(frames).frames.map((f) => f.cumulative);
const gutters9 = Array.from({ length: 9 }, () => [0, 0] as Roll[]);

describe('classic full games', () => {
  it('scores a perfect 300', () => {
    const game = score(g(...Array.from({ length: 9 }, () => ['X'] as Roll[]), ['X', 'X', 'X']));
    expect(game.total).toBe(300);
    expect(game.complete).toBe(true);
    expect(game.frames.map((f) => f.cumulative)).toEqual([30, 60, 90, 120, 150, 180, 210, 240, 270, 300]);
    expect(game.frames.every((f) => f.isStrike)).toBe(true);
  });

  it('scores all 5,/ spares as 150', () => {
    const game = score(g(...Array.from({ length: 9 }, () => [5, '/'] as Roll[]), [5, '/', 5]));
    expect(game.total).toBe(150);
    expect(game.complete).toBe(true);
    expect(game.frames.map((f) => f.cumulative)).toEqual([15, 30, 45, 60, 75, 90, 105, 120, 135, 150]);
    expect(game.frames.slice(0, 9).every((f) => f.isSpare)).toBe(true);
  });

  it('scores all gutters as 0', () => {
    const game = score(g(...gutters9, [0, 0]));
    expect(game.total).toBe(0);
    expect(game.complete).toBe(true);
    expect(game.frames.every((f) => f.cumulative === 0)).toBe(true);
    expect(game.frames.every((f) => f.isOpen)).toBe(true);
  });

  it('scores a Dutch 200 (alternating strike and spare)', () => {
    const game = score(
      g(['X'], [5, '/'], ['X'], [5, '/'], ['X'], [5, '/'], ['X'], [5, '/'], ['X'], [5, '/', 'X']),
    );
    expect(game.total).toBe(200);
    expect(game.frames.map((f) => f.cumulative)).toEqual([20, 40, 60, 80, 100, 120, 140, 160, 180, 200]);
  });
});

describe('10th frame — every case', () => {
  const tenth = (rolls: Roll[]) => score(g(...gutters9, rolls));

  it('X-X-X scores 30', () => expect(tenth(['X', 'X', 'X']).total).toBe(30));
  it('X-X-n scores 10+10+n', () => expect(tenth(['X', 'X', 4]).total).toBe(24));
  it('X-n-/ scores 20', () => expect(tenth(['X', 4, '/']).total).toBe(20));
  it('X-n-m scores 10+n+m', () => expect(tenth(['X', 4, 3]).total).toBe(17));
  it('n-/-X scores 20', () => expect(tenth([4, '/', 'X']).total).toBe(20));
  it('n-/-m scores 10+m', () => expect(tenth([4, '/', 6]).total).toBe(16));
  it('open 10th completes with two rolls', () => {
    const game = tenth([7, 2]);
    expect(game.total).toBe(9);
    expect(game.complete).toBe(true);
    expect(game.frames[9].isOpen).toBe(true);
  });
  it('foul in the 10th: F-/-X scores 20', () => expect(tenth(['F', '/', 'X']).total).toBe(20));
  it('foul in the 10th: X-F-/ scores 20', () => expect(tenth(['X', 'F', '/']).total).toBe(20));
  it('foul in the 10th: n-/-F scores 10', () => expect(tenth([5, '/', 'F']).total).toBe(10));
  it('flags strike/spare correctly in the 10th', () => {
    expect(tenth(['X', 4, '/']).frames[9].isStrike).toBe(true);
    expect(tenth([4, '/', 'X']).frames[9].isSpare).toBe(true);
  });
});

describe('fouls interacting with bonuses', () => {
  it('a foul counts 0 towards a strike bonus but consumes a roll', () => {
    const game = score(g(['X'], ['F', 5]));
    expect(game.frames[0].cumulative).toBe(15); // 10 + 0 + 5
    expect(game.frames[0].pinsPerRoll).toEqual([10]);
    expect(game.frames[1].pinsPerRoll).toEqual([0, 5]);
  });

  it('a foul counts 0 towards a spare bonus', () => {
    const game = score(g([5, '/'], ['F', 3]));
    expect(game.frames[0].cumulative).toBe(10); // 10 + 0
    expect(game.frames[1].cumulative).toBe(13);
  });

  it('foul then clearing the rack is a spare worth 10 + bonus', () => {
    const game = score(g(['F', '/'], [4, 2]));
    expect(game.frames[0].isSpare).toBe(true);
    expect(game.frames[0].cumulative).toBe(14); // 10 + 4
    expect(game.frames[0].pinsPerRoll).toEqual([0, 10]);
  });
});

describe('partial games — null cumulatives at every stage', () => {
  it('empty game', () => {
    expect(score([])).toEqual({ frames: [], total: null, complete: false });
  });

  it('lone strike is pending', () => {
    expect(cumulatives(g(['X']))).toEqual([null]);
  });

  it('strike + one roll is still pending', () => {
    expect(cumulatives(g(['X'], [5]))).toEqual([null, null]);
  });

  it('strike resolves once both bonus rolls exist', () => {
    expect(cumulatives(g(['X'], [5, 3]))).toEqual([18, 26]);
  });

  it('a strike chain stays pending until two rolls follow', () => {
    expect(cumulatives(g(['X'], ['X']))).toEqual([null, null]);
    expect(cumulatives(g(['X'], ['X'], ['X']))).toEqual([30, null, null]);
  });

  it('a spare is pending until one roll follows', () => {
    expect(cumulatives(g([5, '/']))).toEqual([null]);
    expect(cumulatives(g([5, '/'], [7]))).toEqual([17, null]);
  });

  it('an open frame scores immediately, a half-open frame does not', () => {
    expect(cumulatives(g([3, 4]))).toEqual([7]);
    expect(cumulatives(g([3]))).toEqual([null]);
  });

  it('nulls propagate downstream from a pending frame', () => {
    expect(cumulatives(g(['X'], [3, 4]))).toEqual([17, 24]);
    expect(cumulatives(g([5, '/'], ['X']))).toEqual([20, null]);
  });

  it('10th frame stays pending until all owed rolls exist', () => {
    expect(cumulatives(g(...gutters9, ['X'])).at(-1)).toBeNull();
    expect(score(g(...gutters9, ['X'])).complete).toBe(false);
    expect(cumulatives(g(...gutters9, ['X', 'X'])).at(-1)).toBeNull();
    expect(cumulatives(g(...gutters9, [5])).at(-1)).toBeNull();
    expect(cumulatives(g(...gutters9, [5, '/'])).at(-1)).toBeNull();
    expect(score(g(...gutters9, [5, '/', 'X'])).complete).toBe(true);
  });

  it('an incomplete game has a null total even when every present frame is scored', () => {
    const game = score(g([3, 4], [5, 2]));
    expect(game.frames.map((f) => f.cumulative)).toEqual([7, 14]);
    expect(game.total).toBeNull();
    expect(game.complete).toBe(false);
  });
});

describe('normalisation', () => {
  it('converts a two-roll 10 into a spare', () => {
    const game = score(g([7, 3]));
    expect(game.frames[0].rolls).toEqual([7, '/']);
    expect(game.frames[0].isSpare).toBe(true);
  });

  it('converts a first-roll 10 into X', () => {
    expect(score(g([10])).frames[0].rolls).toEqual(['X']);
  });

  it('converts 0 then 10 into a spare', () => {
    expect(score(g([0, 10])).frames[0].rolls).toEqual([0, '/']);
  });

  it('converts a rack-clearing third roll in the 10th into a spare', () => {
    expect(score(g(...gutters9, ['X', 4, 6])).frames[9].rolls).toEqual(['X', 4, '/']);
  });
});

describe('illegal input is rejected with the failing frame index', () => {
  const rejects = (frames: FrameInput[], frameIndex: number) => {
    let caught: unknown;
    try {
      score(frames);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect((caught as EngineError).frameIndex).toBe(frameIndex);
  };

  it('rejects two rolls summing past 10', () => rejects(g([3, 4], [7, 4]), 1));
  it('rejects a spare as the first roll', () => rejects(g(['/']), 0));
  it('rejects X mid-rack', () => rejects(g([5, 'X']), 0));
  it('rejects a roll after a strike in frames 1–9', () => rejects(g(['X', 3]), 0));
  it('rejects three rolls in frames 1–9', () => rejects(g([1, 2, 3]), 0));
  it('rejects a third roll in an open 10th', () => rejects(g(...gutters9, [7, 2, 5]), 9));
  it('rejects four rolls in the 10th', () => rejects(g(...gutters9, ['X', 'X', 'X', 'X']), 9));
  it('rejects an 11th frame', () => rejects(g(...gutters9, [0, 0], [0, 0]), 10));
  it('rejects non-integer pins', () => rejects(g([3.5]), 0));
  it('rejects negative pins', () => rejects(g([-1]), 0));
  it('rejects more than 10 pins', () => rejects(g([11]), 0));
  it('rejects unknown marks', () => rejects(g(['Z' as Roll]), 0));
  it('rejects a spare on a fresh 10th-frame rack', () => rejects(g(...gutters9, ['X', '/']), 9));
  it('rejects a spare right after a spare-reset rack', () => rejects(g(...gutters9, [5, '/', '/']), 9));
  it('rejects X mid-rack in the 10th', () => rejects(g(...gutters9, ['X', 5, 'X']), 9));
});
