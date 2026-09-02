import { describe, expect, it } from 'vitest';
import { reconciles, score } from './index';
import { HIFI_GAME, LIVE_MATT_ILLEGAL } from './fixtures';

describe('design-bundle four-player game (verified correct per spec §3)', () => {
  for (const player of HIFI_GAME) {
    it(`${player.name} — every cumulative and the ${player.total} total`, () => {
      const game = score(player.frames);
      expect(game.frames.map((f) => f.cumulative)).toEqual(player.cumulatives);
      expect(game.total).toBe(player.total);
      expect(game.complete).toBe(true);
      expect(reconciles(player.frames, player.cumulatives)).toEqual({ ok: true, badFrames: [] });
    });
  }
});

describe('live-session fixture is illegal and must not reconcile (spec §3)', () => {
  it("normalises MATT’s frame 4 `7,3` to a spare `7,/`", () => {
    const game = score(LIVE_MATT_ILLEGAL.frames);
    expect(game.frames[3].rolls).toEqual([7, '/']);
    expect(game.frames[3].isSpare).toBe(true);
    expect(game.frames[3].isOpen).toBe(false);
  });

  it('reconciles flags frame 4 (and its downstream victims) against the claimed open-frame totals', () => {
    const { ok, badFrames } = reconciles(LIVE_MATT_ILLEGAL.frames, LIVE_MATT_ILLEGAL.claimedCumulatives);
    expect(ok).toBe(false);
    expect(badFrames).toContain(3); // the illegal `7,3 = 58` frame
    expect(badFrames).toEqual([3, 4, 5]); // spare bonus shifts frames 5–6 too
  });
});
