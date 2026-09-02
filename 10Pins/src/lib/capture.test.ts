import { describe, expect, it } from 'vitest';
import {
  badFramesFor,
  isCleanScan,
  isCompleteScan,
  matchDisplayedName,
  parseRoll,
  toReviewPlayers,
  verificationFor,
  type Identity,
  type ScanPlayerRow,
} from './capture';
import type { FrameInput } from '../engine';

/** A clean 174: X 9/ 72 X X 8- 5/ 63 X X9/ — the fixture the live pipeline was proved on. */
const CLEAN_ROLLS: string[][] = [
  ['X'],
  ['9', '/'],
  ['7', '2'],
  ['X'],
  ['X'],
  ['8', '0'],
  ['5', '/'],
  ['6', '3'],
  ['X'],
  ['X', '9', '/'],
];
const CLEAN_TOTALS = [20, 37, 46, 74, 92, 100, 116, 125, 154, 174];

function row(overrides: Partial<ScanPlayerRow> = {}): ScanPlayerRow {
  return {
    displayed_name: 'MATT',
    frames: CLEAN_ROLLS.map((rolls, i) => ({ frame: i + 1, rolls, cumulative: CLEAN_TOTALS[i] })),
    final_score: 174,
    ...overrides,
  };
}

describe('parseRoll', () => {
  it('reads the monitor tokens', () => {
    expect(parseRoll('X')).toBe('X');
    expect(parseRoll('x')).toBe('X');
    expect(parseRoll('/')).toBe('/');
    expect(parseRoll('F')).toBe('F');
    expect(parseRoll('7')).toBe(7);
    expect(parseRoll('0')).toBe(0);
  });

  it('treats anything unreadable as a miss rather than throwing', () => {
    expect(parseRoll('?')).toBe(0);
    expect(parseRoll('')).toBe(0);
    expect(parseRoll('11')).toBe(0);
  });
});

describe('toReviewPlayers', () => {
  it('maps a clean extraction with nothing amber', () => {
    const [player] = toReviewPlayers({ players: [row()] });
    expect(player.displayedName).toBe('MATT');
    expect(player.frames).toHaveLength(10);
    expect(player.frames[0].rolls).toEqual(['X']);
    expect(player.frames[9].rolls).toEqual(['X', 9, '/']);
    expect(player.claimed).toEqual(CLEAN_TOTALS);
    expect(player.badFrames).toEqual([]);
  });

  it('keeps frame numbering when a middle frame was unreadable', () => {
    const frames = row().frames.filter((f) => f.frame !== 6);
    const [player] = toReviewPlayers({ players: [row({ frames })] });
    expect(player.frames).toHaveLength(10);
    expect(player.frames[5].rolls).toEqual([]); // frame 6 is still frame 6
    expect(player.claimed[5]).toBeNull();
  });

  it('clears a frame the model read as impossible, and shows it amber', () => {
    const frames = row().frames.map((f) => (f.frame === 3 ? { ...f, rolls: ['8', '5'] } : f));
    const [player] = toReviewPlayers({ players: [row({ frames })] });
    expect(player.frames).toHaveLength(10); // did not throw, card still renders
    expect(player.frames[2].rolls).toEqual([]);
    expect(player.badFrames).toContain(2);
  });

  it('flags only the frame whose printed total is wrong', () => {
    const frames = row().frames.map((f) => (f.frame === 3 ? { ...f, cumulative: 99 } : f));
    const [player] = toReviewPlayers({ players: [row({ frames })] });
    expect(player.badFrames).toEqual([2]);
  });
});

describe('badFramesFor', () => {
  const frames: FrameInput[] = CLEAN_ROLLS.map((rolls) => ({ rolls: rolls.map(parseRoll) }));

  it('agrees with the engine on a clean card', () => {
    expect(badFramesFor(frames, CLEAN_TOTALS)).toEqual([]);
  });

  it('skips frames whose total could not be read', () => {
    const claimed: (number | null)[] = [...CLEAN_TOTALS];
    claimed[4] = null;
    expect(badFramesFor(frames, claimed)).toEqual([]);
  });
});

describe('verificationFor', () => {
  const clean = toReviewPlayers({ players: [row()] });

  it('verifies a card that recomputes exactly', () => {
    expect(isCleanScan(clean)).toBe(true);
    expect(verificationFor(clean)).toBe('verified');
  });

  it('will not verify while a frame is still amber', () => {
    const frames = row().frames.map((f) => (f.frame === 3 ? { ...f, cumulative: 99 } : f));
    const players = toReviewPlayers({ players: [row({ frames })] });
    expect(verificationFor(players)).toBe('unverified');
  });

  it('will not verify when there was nothing to check against', () => {
    const frames = row().frames.map((f) => ({ ...f, cumulative: null }));
    const players = toReviewPlayers({ players: [row({ frames })] });
    expect(isCleanScan(players)).toBe(true); // nothing failed…
    expect(verificationFor(players)).toBe('unverified'); // …because nothing was checked
  });

  it('verifies only when every player on the monitor adds up', () => {
    const broken = row({
      displayed_name: 'DAVE',
      frames: row().frames.map((f) => (f.frame === 8 ? { ...f, cumulative: 1 } : f)),
    });
    expect(verificationFor(toReviewPlayers({ players: [row(), broken] }))).toBe('unverified');
  });
});

describe('isCompleteScan', () => {
  it('accepts a full ten frames', () => {
    expect(isCompleteScan(toReviewPlayers({ players: [row()] }))).toBe(true);
  });

  it('rejects a game the monitor caught mid-way', () => {
    const frames = row().frames.slice(0, 6);
    expect(isCompleteScan(toReviewPlayers({ players: [row({ frames })] }))).toBe(false);
  });
});

describe('matchDisplayedName', () => {
  const candidates = [
    { profileId: 'p1', displayName: 'Matt B' },
    { profileId: 'p2', displayName: 'Dave K' },
    { profileId: 'p3', displayName: 'Jen' },
  ];

  it('prefers what this group corrected last time', () => {
    const remembered = new Map<string, Identity>([
      ['MATT', { kind: 'profile', profileId: 'p2', displayName: 'Dave K' }],
    ]);
    expect(matchDisplayedName('MATT', candidates, remembered)).toEqual({
      kind: 'profile',
      profileId: 'p2',
      displayName: 'Dave K',
    });
  });

  it('matches an exact display name', () => {
    expect(matchDisplayedName('jen', candidates)).toMatchObject({ kind: 'profile', profileId: 'p3' });
  });

  it('matches on first name', () => {
    expect(matchDisplayedName('MATT', candidates)).toMatchObject({ kind: 'profile', profileId: 'p1' });
  });

  it('matches on initials', () => {
    expect(matchDisplayedName('DK', candidates)).toMatchObject({ kind: 'profile', profileId: 'p2' });
  });

  it('refuses to guess between two people with the same first name', () => {
    const twoSams = [
      { profileId: 'a', displayName: 'Sam Jones' },
      { profileId: 'b', displayName: 'Sam Patel' },
    ];
    expect(matchDisplayedName('SAM', twoSams)).toEqual({ kind: 'guest', guestName: 'SAM' });
  });

  it('falls back to a guest chip carrying the monitor name', () => {
    expect(matchDisplayedName('SOPH', candidates)).toEqual({ kind: 'guest', guestName: 'SOPH' });
  });
});
