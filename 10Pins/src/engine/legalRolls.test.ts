import { describe, expect, it } from 'vitest';
import { legalRolls, type FrameInput, type Roll } from './index';

const g = (...frames: Roll[][]): FrameInput[] => frames.map((rolls) => ({ rolls }));
const gutters9 = Array.from({ length: 9 }, () => [0, 0] as Roll[]);

const FRESH_RACK = new Set<Roll>([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'X', 'F']);
const midRack = (standing: number) =>
  new Set<Roll>([...Array.from({ length: standing }, (_, d) => d), '/', 'F']);

describe('legalRolls — frames 1–9', () => {
  it('fresh frame: digits 0–9, X and F (never /, never 10)', () => {
    expect(legalRolls([])).toEqual(FRESH_RACK);
    expect(legalRolls(g([5, 3]))).toEqual(FRESH_RACK); // next frame
    expect(legalRolls(g(['X']))).toEqual(FRESH_RACK); // frame after a strike
  });

  it('after a 7: only 0–2, / and F', () => {
    expect(legalRolls(g([7]))).toEqual(new Set<Roll>([0, 1, 2, '/', 'F']));
  });

  it('after a gutter or foul: 0–9, / and F (no X — a two-roll 10 is a spare)', () => {
    expect(legalRolls(g([0]))).toEqual(midRack(10));
    expect(legalRolls(g(['F']))).toEqual(midRack(10));
  });

  it('after a 9: only 0, / and F', () => {
    expect(legalRolls(g([9]))).toEqual(new Set<Roll>([0, '/', 'F']));
  });
});

describe('legalRolls — every 10th-frame state', () => {
  const tenth = (rolls: Roll[]) => legalRolls(g(...gutters9, rolls));

  it('first roll: fresh rack', () => expect(tenth([])).toEqual(FRESH_RACK));
  it('after X: fresh rack again (pin reset)', () => expect(tenth(['X'])).toEqual(FRESH_RACK));
  it('after X,X: fresh rack for the third ball', () => expect(tenth(['X', 'X'])).toEqual(FRESH_RACK));
  it('after X,7: only 0–2, / and F', () => expect(tenth(['X', 7])).toEqual(midRack(3)));
  it('after X,F: 0–9, / and F', () => expect(tenth(['X', 'F'])).toEqual(midRack(10)));
  it('after a 7: only 0–2, / and F', () => expect(tenth([7])).toEqual(midRack(3)));
  it('after 7,/: fresh rack for the bonus ball', () => expect(tenth([7, '/'])).toEqual(FRESH_RACK));
  it('open 10th ends the game: empty set', () => expect(tenth([7, 2])).toEqual(new Set()));
  it('X,X,X ends the game: empty set', () => expect(tenth(['X', 'X', 'X'])).toEqual(new Set()));
  it('7,/,X ends the game: empty set', () => expect(tenth([7, '/', 'X'])).toEqual(new Set()));
});
