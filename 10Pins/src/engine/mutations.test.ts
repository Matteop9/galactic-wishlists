import { describe, expect, it } from 'vitest';
import {
  EngineError,
  applyRoll,
  editRoll,
  nextRoll,
  reconciles,
  score,
  type FrameInput,
  type Roll,
} from './index';

const g = (...frames: Roll[][]): FrameInput[] => frames.map((rolls) => ({ rolls }));
const gutters9 = Array.from({ length: 9 }, () => [0, 0] as Roll[]);

describe('applyRoll', () => {
  it('plays out a perfect game roll by roll', () => {
    let frames: FrameInput[] = [];
    for (let i = 0; i < 12; i++) frames = applyRoll(frames, 'X');
    const game = score(frames);
    expect(game.total).toBe(300);
    expect(game.complete).toBe(true);
    expect(frames).toHaveLength(10);
    expect(frames[9].rolls).toEqual(['X', 'X', 'X']);
  });

  it('starts a new frame after an open frame resolves', () => {
    const frames = applyRoll(g([5, 3]), 7);
    expect(frames).toEqual(g([5, 3], [7]));
  });

  it('normalises on the way in: 10 becomes X, a rack-clearing second roll becomes /', () => {
    expect(applyRoll([], 10)).toEqual(g(['X']));
    expect(applyRoll(g([7]), 3)).toEqual(g([7, '/']));
  });

  it('rejects an illegal roll', () => {
    expect(() => applyRoll(g([7]), 9)).toThrow(EngineError);
  });

  it('rejects rolls once the game is complete', () => {
    expect(() => applyRoll(g(...gutters9, [7, 2]), 5)).toThrow('game is complete');
  });

  it('does not mutate its input', () => {
    const input = g([5]);
    applyRoll(input, 3);
    expect(input).toEqual(g([5]));
  });
});

describe('editRoll', () => {
  it('editing frame 3 of a strike chain ripples frames 1–2', () => {
    const before = score(g(['X'], ['X'], [5, 3]));
    expect(before.frames.map((f) => f.cumulative)).toEqual([25, 43, 51]);

    const after = score(editRoll(g(['X'], ['X'], [5, 3]), 2, 0, 2));
    expect(after.frames.map((f) => f.cumulative)).toEqual([22, 37, 42]);
  });

  it('normalises the edited frame: pair now summing to 10 becomes a spare', () => {
    expect(editRoll(g([5, 3]), 0, 1, 5)).toEqual(g([5, '/']));
  });

  it('editing the first roll to X drops the now-impossible second roll', () => {
    expect(editRoll(g([5, 3]), 0, 0, 'X')).toEqual(g(['X']));
  });

  it('drops 10th-frame bonus rolls the edit no longer earns', () => {
    expect(editRoll(g(...gutters9, ['X', 'X', 'X']), 9, 0, 5)).toEqual(g(...gutters9, [5]));
  });

  it('rejects an edit that is illegal in context', () => {
    expect(() => editRoll(g([7, 2]), 0, 1, 9)).toThrow(EngineError); // 7 + 9 > 10
    expect(() => editRoll(g([7, 2]), 0, 0, '/')).toThrow(EngineError); // spare can't lead a frame
  });

  it('rejects edits to frames or rolls that do not exist', () => {
    expect(() => editRoll(g([5, 3]), 4, 0, 1)).toThrow('no frame 5');
    expect(() => editRoll(g([5, 3]), 0, 2, 1)).toThrow('has no roll 3');
  });

  it('does not mutate its input', () => {
    const input = g([5, 3], [7, 1]);
    editRoll(input, 1, 0, 2);
    expect(input).toEqual(g([5, 3], [7, 1]));
  });
});

describe('nextRoll', () => {
  it('an empty game starts at frame 1, roll 1', () => {
    expect(nextRoll([])).toEqual({ frame: 0, roll: 0 });
  });

  it('points at the second roll mid-frame', () => {
    expect(nextRoll(g([7]))).toEqual({ frame: 0, roll: 1 });
  });

  it('a strike moves straight to the next frame', () => {
    expect(nextRoll(g(['X']))).toEqual({ frame: 1, roll: 0 });
  });

  it('walks the 10th frame and returns null when the game is over', () => {
    expect(nextRoll(g(...gutters9, ['X', 'X']))).toEqual({ frame: 9, roll: 2 });
    expect(nextRoll(g(...gutters9, [7, 2]))).toBeNull();
  });
});

describe('reconciles', () => {
  const frames = g(['X'], [5, 3], [9, '/'], [7, 2]);
  // engine cumulatives: 18, 26, 43, 52

  it('happy path: all claims match', () => {
    expect(reconciles(frames, [18, 26, 43, 52])).toEqual({ ok: true, badFrames: [] });
  });

  it('flags exactly the corrupted frame', () => {
    expect(reconciles(frames, [18, 27, 43, 52])).toEqual({ ok: false, badFrames: [1] });
  });

  it('skips null claims (unreadable or pending frames)', () => {
    expect(reconciles(frames, [18, null, null, 52])).toEqual({ ok: true, badFrames: [] });
  });

  it('flags claims for frames the rolls cannot support', () => {
    expect(reconciles(g(['X']), [30, 60])).toEqual({ ok: false, badFrames: [0, 1] });
  });

  it('reports the failing frame when the rolls themselves are illegal', () => {
    expect(reconciles(g([5, 3], [7, 4]), [8, 19])).toEqual({ ok: false, badFrames: [1] });
  });
});
