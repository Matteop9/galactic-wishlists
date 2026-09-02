import { describe, expect, it } from 'vitest';
import { applyRoll, type FrameInput } from '../engine';
import {
  applyRollEvent,
  clearSnapshot,
  diffPending,
  gameComplete,
  liveStandings,
  loadSnapshot,
  nextUp,
  queueFrame,
  runningTotal,
  saveSnapshot,
  snapshotKey,
  type LivePlayer,
  type LiveSnapshot,
  type PendingFrame,
} from './liveState';

function player(id: string, seatOrder: number, frames: FrameInput[] = []): LivePlayer {
  return {
    gamePlayerId: id,
    profileId: id,
    guestName: null,
    displayName: id.toUpperCase(),
    seatOrder,
    frames,
  };
}

/** Roll a game out one roll at a time, for building fixtures. */
function rolls(...list: (number | 'X' | '/' | 'F')[]): FrameInput[] {
  return list.reduce<FrameInput[]>((frames, roll) => applyRoll(frames, roll), []);
}

const PERFECT = rolls(...Array<'X'>(12).fill('X'));

describe('nextUp', () => {
  it('starts with the lowest seat order', () => {
    const turn = nextUp([player('b', 1), player('a', 0)]);
    expect(turn?.player.gamePlayerId).toBe('a');
    expect(turn).toMatchObject({ frame: 0, roll: 0 });
  });

  it('keeps a bowler at the line until their frame resolves', () => {
    const turn = nextUp([player('a', 0, rolls(7)), player('b', 1)]);
    expect(turn?.player.gamePlayerId).toBe('a');
    expect(turn).toMatchObject({ frame: 0, roll: 1 });
  });

  it('rotates to the next seat once the frame is done', () => {
    const turn = nextUp([player('a', 0, rolls('X')), player('b', 1)]);
    expect(turn?.player.gamePlayerId).toBe('b');
    expect(turn).toMatchObject({ frame: 0, roll: 0 });
  });

  it('waits for the whole rack before anyone starts frame 2', () => {
    const turn = nextUp([player('a', 0, rolls('X')), player('b', 1, rolls('X')), player('c', 2)]);
    expect(turn?.player.gamePlayerId).toBe('c');
  });

  it('comes back round to seat 0 for frame 2', () => {
    const turn = nextUp([player('a', 0, rolls('X')), player('b', 1, rolls('X'))]);
    expect(turn?.player.gamePlayerId).toBe('a');
    expect(turn?.frame).toBe(1);
  });

  it('skips a player who has finished their game', () => {
    const turn = nextUp([player('a', 0, PERFECT), player('b', 1, rolls('X'))]);
    expect(turn?.player.gamePlayerId).toBe('b');
    expect(turn?.frame).toBe(1);
  });

  it('is null when everyone is done', () => {
    expect(nextUp([player('a', 0, PERFECT)])).toBeNull();
  });

  it('is null with no players', () => {
    expect(nextUp([])).toBeNull();
  });
});

describe('gameComplete', () => {
  it('is true only when every player has finished', () => {
    expect(gameComplete([player('a', 0, PERFECT), player('b', 1, PERFECT)])).toBe(true);
    expect(gameComplete([player('a', 0, PERFECT), player('b', 1, rolls('X'))])).toBe(false);
  });

  it('is false for an empty lane', () => {
    expect(gameComplete([])).toBe(false);
  });
});

describe('runningTotal', () => {
  it('is the last settled cumulative, not the pending one', () => {
    // 9/ then X: frame 1 is still waiting on the strike's second bonus ball
    expect(runningTotal(rolls(9, '/', 'X'))).toBe(20);
  });

  it('is null before anything has settled', () => {
    expect(runningTotal(rolls('X'))).toBeNull();
    expect(runningTotal([])).toBeNull();
  });

  it('is 300 for a perfect game', () => {
    expect(runningTotal(PERFECT)).toBe(300);
  });
});

describe('liveStandings', () => {
  it('sorts by running total, unscored last, ties by seat', () => {
    const a = player('a', 0, rolls(9, 0));
    const b = player('b', 1, rolls('X', 'X', 'X'));
    const c = player('c', 2);
    const d = player('d', 3, rolls(9, 0));
    expect(liveStandings([c, d, b, a]).map((row) => row.player.gamePlayerId)).toEqual([
      'b',
      'a',
      'd',
      'c',
    ]);
  });
});

describe('applyRollEvent', () => {
  const base = [player('a', 0, rolls('X')), player('b', 1)];

  it('replaces the named frame for the named player', () => {
    const next = applyRollEvent(base, { gameId: 'g', gamePlayerId: 'b', frameNo: 1, rolls: ['9', '/'] });
    expect(next[1].frames[0].rolls).toEqual([9, '/']);
    expect(next[0].frames[0].rolls).toEqual(['X']);
  });

  it('pads intervening frames when an event arrives out of order', () => {
    const next = applyRollEvent(base, { gameId: 'g', gamePlayerId: 'a', frameNo: 3, rolls: ['7'] });
    expect(next[0].frames).toHaveLength(3);
    expect(next[0].frames[1].rolls).toEqual([]);
    expect(next[0].frames[2].rolls).toEqual([7]);
  });

  it('ignores a player it does not know about', () => {
    const next = applyRollEvent(base, { gameId: 'g', gamePlayerId: 'zz', frameNo: 1, rolls: ['X'] });
    expect(next).toEqual(base);
  });
});

describe('queueFrame', () => {
  const entry = (gamePlayerId: string, frameNo: number, roll: string): PendingFrame => ({
    gamePlayerId,
    frameNo,
    rolls: [roll],
    cumulative: null,
  });

  it('collapses repeat writes of the same frame to the latest', () => {
    const queue = queueFrame(queueFrame([], entry('a', 1, '7')), entry('a', 1, '9'));
    expect(queue).toEqual([entry('a', 1, '9')]);
  });

  it('keeps frames from different players and frames, most recent last', () => {
    let queue = queueFrame([], entry('a', 1, 'X'));
    queue = queueFrame(queue, entry('b', 1, '7'));
    queue = queueFrame(queue, entry('a', 2, '9'));
    queue = queueFrame(queue, entry('a', 1, '8')); // correction to the first frame
    expect(queue.map((p) => [p.gamePlayerId, p.frameNo])).toEqual([
      ['b', 1],
      ['a', 2],
      ['a', 1],
    ]);
  });
});

describe('diffPending', () => {
  it('writes only the frame the roll landed in', () => {
    const before = [player('a', 0, rolls('X')), player('b', 1)];
    const after = [player('a', 0, rolls('X', 7)), player('b', 1)];
    expect(diffPending(before, after)).toEqual([
      { gamePlayerId: 'a', frameNo: 2, rolls: ['7'], cumulative: null },
    ]);
  });

  it('carries the cumulative once the bonus balls have settled', () => {
    const after = [player('a', 0, rolls('X', 7, 2))];
    expect(diffPending([player('a', 0, rolls('X', 7))], after)).toEqual([
      { gamePlayerId: 'a', frameNo: 2, rolls: ['7', '2'], cumulative: 28 },
    ]);
  });

  it('empties a frame that an undo took back', () => {
    const before = [player('a', 0, rolls('X', 7))];
    const after = [player('a', 0, rolls('X'))];
    expect(diffPending(before, after)).toEqual([
      { gamePlayerId: 'a', frameNo: 2, rolls: [], cumulative: null },
    ]);
  });

  it('is empty when nothing moved', () => {
    const players = [player('a', 0, rolls('X')), player('b', 1, rolls(9, '/'))];
    expect(diffPending(players, players)).toEqual([]);
  });

  it('treats a player it has never seen as all-new frames', () => {
    expect(diffPending([], [player('a', 0, rolls(9, 0))])).toEqual([
      { gamePlayerId: 'a', frameNo: 1, rolls: ['9', '0'], cumulative: 9 },
    ]);
  });
});

describe('snapshots', () => {
  function memoryStore() {
    const map = new Map<string, string>();
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      map,
    };
  }

  const snapshot: LiveSnapshot = {
    sessionId: 's1',
    gameId: 'g1',
    gameNumber: 1,
    updatedAt: '2026-09-01T20:00:00.000Z',
    players: [player('a', 0, rolls('X', 9, '/'))],
    pending: [{ gamePlayerId: 'a', frameNo: 1, rolls: ['X'], cumulative: null }],
  };

  it('round-trips a game in progress', () => {
    const store = memoryStore();
    saveSnapshot(snapshot, store);
    expect(store.map.has(snapshotKey('s1'))).toBe(true);
    expect(loadSnapshot('s1', store)).toEqual(snapshot);
  });

  it('returns null for an unknown session and after clearing', () => {
    const store = memoryStore();
    expect(loadSnapshot('nope', store)).toBeNull();
    saveSnapshot(snapshot, store);
    clearSnapshot('s1', store);
    expect(loadSnapshot('s1', store)).toBeNull();
  });

  it('rejects corrupt or half-written snapshots rather than resuming garbage', () => {
    const store = memoryStore();
    store.setItem(snapshotKey('s1'), '{not json');
    expect(loadSnapshot('s1', store)).toBeNull();
    store.setItem(snapshotKey('s1'), JSON.stringify({ sessionId: 's1' }));
    expect(loadSnapshot('s1', store)).toBeNull();
  });

  it('defaults a missing pending queue to empty', () => {
    const store = memoryStore();
    const { pending: _pending, ...withoutQueue } = snapshot;
    store.setItem(snapshotKey('s1'), JSON.stringify(withoutQueue));
    expect(loadSnapshot('s1', store)?.pending).toEqual([]);
  });

  it('is a no-op when storage is unavailable', () => {
    expect(() => saveSnapshot(snapshot, null)).not.toThrow();
    expect(loadSnapshot('s1', null)).toBeNull();
    expect(() => clearSnapshot('s1', null)).not.toThrow();
  });
});
