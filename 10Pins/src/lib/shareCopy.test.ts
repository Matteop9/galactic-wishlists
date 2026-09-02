import { describe, expect, it } from 'vitest';
import { shareCopy, type ShareCopyInput } from './shareCopy';

function input(overrides: Partial<ShareCopyInput> = {}): ShareCopyInput {
  return {
    players: [
      { name: 'Dave K', score: 213, isYou: true },
      { name: 'Matt', score: 169 },
    ],
    verification: 'verified',
    highlights: ['PB', '200_CLUB'],
    strikes: 7,
    groupName: 'Thursday Pin Club',
    venueName: 'Hollywood Bowl',
    playedAt: '2026-07-03T20:00:00.000Z',
    ...overrides,
  };
}

describe('shareCopy', () => {
  it('builds the hi-fi card: winner, score, pills, margin and proof', () => {
    const copy = shareCopy(input())!;
    expect(copy.winner).toBe('Dave K');
    expect(copy.score).toBe(213);
    expect(copy.pills).toEqual(['NEW PB', '200 CLUB']);
    expect(copy.statPill).toBe('7 STRIKES');
    expect(copy.stinger).toBe('Beat Matt by 44 · pics attached, so it counts');
    expect(copy.meta).toBe('FRI 3 JUL · HOLLYWOOD BOWL');
  });

  it('has nothing to say about a game with no scores', () => {
    expect(shareCopy(input({ players: [{ name: 'Dave', score: null }] }))).toBeNull();
  });

  it('picks the best game, and prefers you when you tie for it', () => {
    const you = shareCopy(
      input({
        players: [
          { name: 'Matt', score: 200 },
          { name: 'Dave', score: 200, isYou: true },
        ],
      }),
    )!;
    expect(you.winner).toBe('Dave');
    expect(you.stinger).toContain('Tied with Matt on 200');
  });

  it('phrases a one-pin win as a pipping', () => {
    const copy = shareCopy(
      input({ players: [{ name: 'Dave', score: 170, isYou: true }, { name: 'Matt', score: 169 }] }),
    )!;
    expect(copy.stinger).toContain('Pipped Matt by 1');
  });

  it('handles a solo game without inventing an opponent', () => {
    const copy = shareCopy(input({ players: [{ name: 'Dave', score: 178, isYou: true }] }))!;
    expect(copy.stinger).toBe('178 on the night · pics attached, so it counts');
  });

  it('never brags on a game nobody photographed', () => {
    expect(shareCopy(input({ verification: 'unverified' }))!.stinger).toContain(
      'scored frame by frame, unverified',
    );
    expect(shareCopy(input({ verification: 'live' }))!.stinger).toContain('scored live, frame by frame');
  });

  it('measures the margin against the best of the others, not the last of them', () => {
    const copy = shareCopy(
      input({
        players: [
          { name: 'Dave', score: 213, isYou: true },
          { name: 'Jen', score: 90 },
          { name: 'Matt', score: 200 },
        ],
      }),
    )!;
    expect(copy.stinger).toContain('Beat Matt by 13');
  });

  it('ignores players the monitor never gave a score', () => {
    const copy = shareCopy(
      input({ players: [{ name: 'Dave', score: 213, isYou: true }, { name: 'Ghost', score: null }] }),
    )!;
    expect(copy.stinger).toContain('213 on the night');
  });

  it('drops the strike pill when there were none, or none counted', () => {
    expect(shareCopy(input({ strikes: 0 }))!.statPill).toBeNull();
    expect(shareCopy(input({ strikes: undefined }))!.statPill).toBeNull();
  });

  it('says "1 STRIKE", not "1 STRIKES"', () => {
    expect(shareCopy(input({ strikes: 1 }))!.statPill).toBe('1 STRIKE');
  });

  it('keeps the shared message short enough for a chat preview', () => {
    const copy = shareCopy(
      input({ groupName: 'A group with an extremely long name '.repeat(10) }),
    )!;
    expect(copy.text.length).toBeLessThanOrEqual(180);
    expect(copy.text.endsWith('…')).toBe(true);
  });

  it('copes with no venue and no date', () => {
    expect(shareCopy(input({ venueName: null, playedAt: undefined }))!.meta).toBe('');
  });
});
