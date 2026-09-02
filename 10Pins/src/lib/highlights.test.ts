import { describe, expect, it } from 'vitest';
import { score, type FrameInput, type Roll } from '../engine';
import { computeHighlights } from './highlights';
import { framesFromRows, frameCounts, deserializeRolls, serializeRolls } from './frames';

const g = (...frames: Roll[][]): FrameInput[] => frames.map((rolls) => ({ rolls }));
const gutters9 = Array.from({ length: 9 }, () => [0, 0] as Roll[]);

describe('computeHighlights', () => {
  it('first game', () => {
    expect(computeHighlights({ score: 87, previousBest: null })).toEqual(['FIRST_GAME']);
  });

  it('PB when beating the previous best', () => {
    expect(computeHighlights({ score: 150, previousBest: 140 })).toEqual(['PB', '150_CLUB']);
    expect(computeHighlights({ score: 130, previousBest: 140 })).toEqual([]);
  });

  it('awards only the highest newly crossed club, once', () => {
    expect(computeHighlights({ score: 212, previousBest: 190 })).toEqual(['PB', '200_CLUB']);
    expect(computeHighlights({ score: 205, previousBest: 210 })).toEqual([]); // already a member
    expect(computeHighlights({ score: 300, previousBest: 240 })).toEqual(['PB', '300_CLUB']);
  });

  it('detects a turkey across frames', () => {
    const turkey = score(g([5, 3], ['X'], ['X'], ['X'], [5, 3], ...Array(4).fill([0, 0]), [0, 0]));
    expect(computeHighlights({ score: 999, previousBest: 999, game: turkey })).toContain('TURKEY');
  });

  it('detects a turkey entirely inside the 10th frame', () => {
    const tenth = score(g(...gutters9, ['X', 'X', 'X']));
    expect(computeHighlights({ score: 30, previousBest: 30, game: tenth })).toContain('TURKEY');
  });

  it('a broken strike chain is not a turkey', () => {
    const two = score(g(['X'], ['X'], [5, '/'], ['X'], ['X'], [5, 3], ...Array(3).fill([0, 0]), [0, 0]));
    expect(computeHighlights({ score: 1, previousBest: 1, game: two })).not.toContain('TURKEY');
  });

  it('spanning frame 9 into the 10th counts', () => {
    const spanning = score(g(...Array.from({ length: 8 }, () => [0, 0] as Roll[]), ['X'], ['X', 'X', 4]));
    expect(computeHighlights({ score: 1, previousBest: 1, game: spanning })).toContain('TURKEY');
  });
});

describe('frames serialization', () => {
  it('round-trips rolls through the jsonb string format', () => {
    expect(serializeRolls([9, '/'])).toEqual(['9', '/']);
    expect(serializeRolls(['X'])).toEqual(['X']);
    expect(serializeRolls([0, 'F'])).toEqual(['0', 'F']);
    expect(deserializeRolls(['9', '/'])).toEqual([9, '/']);
    expect(deserializeRolls(['X', '7', '2'])).toEqual(['X', 7, 2]);
    expect(deserializeRolls('rubbish')).toEqual([]);
    expect(deserializeRolls(['?'])).toEqual([0]);
  });

  it('rebuilds engine input from frame rows regardless of order', () => {
    const rows = [
      { frame_no: 2, rolls: ['X'] },
      { frame_no: 1, rolls: ['9', '/'] },
      { frame_no: 3, rolls: ['8', '0'] },
    ];
    expect(framesFromRows(rows)).toEqual(g([9, '/'], ['X'], [8, 0]));
    expect(framesFromRows([])).toEqual([]);
  });

  it('counts strikes, spares and opens for the cached columns', () => {
    const game = score(g(['X'], [5, '/'], [3, 4], ['X'], [7, '/'], [0, 0], ['X'], [1, 2], [9, '/'], ['X', 'X', 'X']));
    expect(frameCounts(game)).toEqual({ strikes: 4, spares: 3, opens: 3 });
  });
});
