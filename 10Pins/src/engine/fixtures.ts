/**
 * Game fixtures decoded from the design bundle (`10 Pins Hi-fi.dc.html`, renderVals()).
 * The four-player game is verified correct per the build spec §3 — every cumulative
 * is asserted in fixtures.test.ts. Also reused later by the component gallery (milestone 3).
 */

import type { FrameInput, Roll } from './index';

export interface PlayerFixture {
  name: string;
  frames: FrameInput[];
  cumulatives: number[];
  total: number;
}

const g = (...frames: Roll[][]): FrameInput[] => frames.map((rolls) => ({ rolls }));

export const HIFI_GAME: PlayerFixture[] = [
  {
    name: 'MATT',
    frames: g([9, '/'], ['X'], [8, 0], ['X'], ['X'], [7, 2], [9, '/'], ['X'], [8, 1], ['X', 9, '/']),
    cumulatives: [20, 38, 46, 73, 92, 101, 121, 140, 149, 169],
    total: 169,
  },
  {
    name: 'DAVE',
    frames: g(['X'], ['X'], ['X'], [9, 0], [8, '/'], ['X'], [7, '/'], [9, 0], ['X'], ['X', 'X', 8]),
    cumulatives: [30, 59, 78, 87, 107, 127, 146, 155, 185, 213],
    total: 213,
  },
  {
    name: 'SOPH',
    frames: g([7, 2], [9, '/'], [8, 1], [0, 6], ['X'], [7, 2], [8, '/'], [9, 0], [6, 3], [7, '/', 8]),
    cumulatives: [9, 27, 36, 42, 61, 70, 89, 98, 107, 125],
    total: 125,
  },
  {
    name: 'JEN',
    frames: g([8, 0], [7, '/'], ['X'], [9, '/'], [0, 7], [8, 1], ['X'], [7, 2], [9, '/'], ['X', 7, 2]),
    cumulatives: [8, 28, 48, 58, 65, 74, 93, 102, 122, 141],
    total: 141,
  },
];

/**
 * MATT’s live-session game from the hi-fi file. Frame 4 is displayed as `7,3` open
 * with cumulative 58 — illegal input (7 + 3 = 10 must be a spare). The build spec
 * says these must NOT be used as scoring fixtures; instead we assert the engine
 * normalises the frame to `7, /` and that reconciles flags it.
 */
export const LIVE_MATT_ILLEGAL = {
  frames: g([8, '/'], [9, 0], ['X'], [7, 3], ['X'], ['X'], [9, '/']),
  claimedCumulatives: [19, 28, 48, 58, 87, 107, null, null, null, null],
};
