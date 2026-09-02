import { describe, expect, it } from 'vitest';
import {
  CELEBRATE_MAX_MS,
  celebrationStep,
  flattenRolls,
  gameCelebration,
  remainingMs,
  rollCelebration,
  type Celebration,
} from './celebrate';
import { applyRoll, type FrameInput, type Roll } from '../engine';

/** Build a game by bowling it, so the fixtures are engine-legal by construction. */
function bowl(...rolls: Roll[]): FrameInput[] {
  return rolls.reduce<FrameInput[]>((frames, roll) => applyRoll(frames, roll), []);
}

describe('flattenRolls', () => {
  it('reads strikes as one roll per frame', () => {
    expect(flattenRolls(bowl('X', 'X', 'X'))).toEqual(['X', 'X', 'X']);
  });

  it('keeps both rolls of an open frame', () => {
    expect(flattenRolls(bowl(7, 2))).toEqual([7, 2]);
  });

  it('is empty for an untouched card', () => {
    expect(flattenRolls([])).toEqual([]);
  });
});

describe('rollCelebration', () => {
  it('celebrates a single strike quietly, at tier 1', () => {
    const c = rollCelebration(bowl(), bowl('X'));
    expect(c).toMatchObject({ tier: 1, label: 'Strike' });
    expect(c!.durationMs).toBeLessThanOrEqual(CELEBRATE_MAX_MS);
  });

  it('escalates through the run', () => {
    expect(rollCelebration(bowl('X'), bowl('X', 'X'))).toMatchObject({ tier: 2, label: 'Double' });
    expect(rollCelebration(bowl('X', 'X'), bowl('X', 'X', 'X'))).toMatchObject({ label: 'Turkey' });
    expect(rollCelebration(bowl('X', 'X', 'X'), bowl('X', 'X', 'X', 'X'))).toMatchObject({
      label: 'Four-bagger',
    });
    expect(
      rollCelebration(bowl('X', 'X', 'X', 'X'), bowl('X', 'X', 'X', 'X', 'X')),
    ).toMatchObject({ label: '5 in a row' });
  });

  it('never rises above tier 2 — that is what keeps the keypad clear', () => {
    let frames = bowl();
    for (let i = 1; i <= 9; i++) {
      const next = applyRoll(frames, 'X');
      expect(rollCelebration(frames, next)!.tier).toBeLessThanOrEqual(2);
      frames = next;
    }
  });

  it('says nothing for a spare, an open frame, a gutter or a foul', () => {
    expect(rollCelebration(bowl(9), bowl(9, '/'))).toBeNull();
    expect(rollCelebration(bowl(7), bowl(7, 2))).toBeNull();
    expect(rollCelebration(bowl(), bowl(0))).toBeNull();
    expect(rollCelebration(bowl(), bowl('F'))).toBeNull();
  });

  it('says nothing when the card did not gain a roll (undo, or no change)', () => {
    const three = bowl('X', 'X', 'X');
    expect(rollCelebration(three, three)).toBeNull();
    expect(rollCelebration(three, bowl('X', 'X'))).toBeNull();
  });

  it('resets the run when a spare breaks it', () => {
    const before = bowl('X', 'X', 9, '/');
    expect(rollCelebration(before, applyRoll(before, 'X'))).toMatchObject({ label: 'Strike' });
  });

  it('counts a run that crosses into the tenth frame', () => {
    // eight opens, then a strike in the 9th and two in the 10th
    const opens: Roll[] = Array.from({ length: 8 }).flatMap(() => [7, 2] as Roll[]);
    const before = bowl(...opens, 'X', 'X');
    expect(rollCelebration(before, applyRoll(before, 'X'))).toMatchObject({ label: 'Turkey' });
  });

  it('names the bowler from tier 2 up, but not for a lone strike', () => {
    expect(rollCelebration(bowl(), bowl('X'), 'Dave')!.label).toBe('Strike');
    expect(rollCelebration(bowl('X', 'X'), bowl('X', 'X', 'X'), 'Dave')!.label).toBe('Dave · turkey');
  });
});

describe('gameCelebration', () => {
  it('celebrates nothing for an unremarkable game', () => {
    expect(gameCelebration([])).toBeNull();
    expect(gameCelebration(['SOMETHING_ELSE'])).toBeNull();
  });

  it('fires once for a perfect game, not once per highlight', () => {
    const c = gameCelebration(['300_CLUB', 'PB', 'TURKEY', '200_CLUB']);
    expect(c).toMatchObject({ tier: 3, label: 'Perfect game' });
    expect(c!.detail).toBe('Twelve strikes. Three hundred.');
  });

  it('leads with the loudest and keeps the rest as detail', () => {
    const c = gameCelebration(['PB', '200_CLUB', 'TURKEY']);
    expect(c!.label).toBe('200 club');
    expect(c!.detail).toContain('New PB');
    expect(c!.detail).toContain('Turkey');
  });

  it('treats a first game as worth a toast, not a banner', () => {
    expect(gameCelebration(['FIRST_GAME'])).toMatchObject({ tier: 2 });
  });

  it('offers the share card only on a tier-3 moment', () => {
    expect(gameCelebration(['PB'], 'game-1')!.gameId).toBe('game-1');
    expect(gameCelebration(['TURKEY'], 'game-1')!.gameId).toBeUndefined();
  });

  it('never exceeds the 1.2s motion budget', () => {
    for (const code of ['300_CLUB', '250_CLUB', '200_CLUB', 'PB', '150_CLUB', '100_CLUB', 'TURKEY', 'FIRST_GAME']) {
      expect(gameCelebration([code])!.durationMs).toBeLessThanOrEqual(CELEBRATE_MAX_MS);
    }
  });
});

describe('celebrationStep', () => {
  const idle = { current: null, shownAt: 0 };
  const toast: Celebration = { id: 'a', tier: 2, label: 'Turkey', durationMs: 900 };
  const banner: Celebration = { id: 'b', tier: 3, label: 'New personal best', durationMs: 1200 };
  const spark: Celebration = { id: 'c', tier: 1, label: 'Strike', durationMs: 400 };

  it('shows anything when nothing is up', () => {
    expect(celebrationStep(toast, idle, 0)).toEqual({ kind: 'show', celebration: toast });
  });

  it('lets a louder moment interrupt a quieter one', () => {
    expect(celebrationStep(banner, { current: toast, shownAt: 0 }, 100).kind).toBe('show');
  });

  it('does not let a quieter one cut off a louder one', () => {
    expect(celebrationStep(spark, { current: banner, shownAt: 0 }, 100).kind).toBe('ignore');
  });

  it('drops an equal-tier repeat rather than queueing it', () => {
    expect(celebrationStep(toast, { current: toast, shownAt: 0 }, 50).kind).toBe('ignore');
  });

  it('allows the next one once the current has run its course', () => {
    expect(celebrationStep(toast, { current: toast, shownAt: 0 }, 950).kind).toBe('show');
  });
});

describe('remainingMs', () => {
  const banner: Celebration = { id: 'b', tier: 3, label: 'PB', durationMs: 1200 };

  it('is zero when nothing is showing', () => {
    expect(remainingMs({ current: null, shownAt: 0 }, 500)).toBe(0);
  });

  it('counts down and clamps at zero', () => {
    expect(remainingMs({ current: banner, shownAt: 1000 }, 1200)).toBe(1000);
    expect(remainingMs({ current: banner, shownAt: 1000 }, 9999)).toBe(0);
  });
});
