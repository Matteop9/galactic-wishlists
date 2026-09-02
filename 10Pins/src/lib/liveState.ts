import { nextRoll, score, type FrameInput } from '../engine';
import { deserializeRolls, serializeRolls } from './frames';

/**
 * Live-session state: pure functions only (no React, no Supabase) so turn
 * order, offline survival and broadcast merging are all unit-testable.
 *
 * The scorer's device is the single writer (spec §8). It keeps the whole game
 * in memory, mirrors it to localStorage on every roll, and drains a queue of
 * frame upserts whenever it can reach the network.
 */

export interface LivePlayer {
  /** game_players.id — the key every roll event and frame row hangs off */
  gamePlayerId: string;
  profileId: string | null;
  guestName: string | null;
  displayName: string;
  seatOrder: number;
  frames: FrameInput[];
}

export interface TurnPosition {
  player: LivePlayer;
  /** 0-based */
  frame: number;
  /** 0-based roll within the frame */
  roll: number;
}

/**
 * Whose turn it is. Standard rotation: everyone bowls frame N in seat order
 * before anyone starts frame N+1, and a bowler mid-frame stays at the line
 * until the frame resolves. Players who have finished their game are skipped.
 * Null when every player is done.
 */
export function nextUp(players: LivePlayer[]): TurnPosition | null {
  const open = players
    .map((player) => ({ player, pos: nextRoll(player.frames) }))
    .filter((entry): entry is { player: LivePlayer; pos: { frame: number; roll: number } } => entry.pos !== null);
  if (open.length === 0) return null;

  const minFrame = Math.min(...open.map((entry) => entry.pos.frame));
  const atFrame = open
    .filter((entry) => entry.pos.frame === minFrame)
    .sort((a, b) => a.player.seatOrder - b.player.seatOrder);
  const { player, pos } = atFrame[0];
  return { player, frame: pos.frame, roll: pos.roll };
}

/** Every player's game is complete — time for the end-of-game screen. */
export function gameComplete(players: LivePlayer[]): boolean {
  return players.length > 0 && players.every((player) => score(player.frames).complete);
}

/** Running total per player (last non-null cumulative), for the live readout. */
export function runningTotal(frames: FrameInput[]): number | null {
  const scored = score(frames);
  for (let i = scored.frames.length - 1; i >= 0; i--) {
    const cumulative = scored.frames[i].cumulative;
    if (cumulative !== null) return cumulative;
  }
  return null;
}

/** Leader board within the live game, best first; ties keep seat order. */
export function liveStandings(players: LivePlayer[]): { player: LivePlayer; total: number | null }[] {
  return players
    .map((player) => ({ player, total: runningTotal(player.frames) }))
    .sort((a, b) => (b.total ?? -1) - (a.total ?? -1) || a.player.seatOrder - b.player.seatOrder);
}

// --- Broadcast ---------------------------------------------------------------

/** The only message the scorer broadcasts: one frame's rolls, after every tap. */
export interface RollEvent {
  gamePlayerId: string;
  /** 1-based, matching frames.frame_no */
  frameNo: number;
  rolls: string[];
  gameId: string;
}

/**
 * Merge a broadcast roll event into spectator state. Unknown players are
 * ignored (the spectator refetches on resubscribe, which is where a new
 * player or a new game gets picked up).
 */
export function applyRollEvent(players: LivePlayer[], event: RollEvent): LivePlayer[] {
  return players.map((player) => {
    if (player.gamePlayerId !== event.gamePlayerId) return player;
    const frames = [...player.frames];
    while (frames.length < event.frameNo) frames.push({ rolls: [] });
    frames[event.frameNo - 1] = { rolls: deserializeRolls(event.rolls) };
    return { ...player, frames };
  });
}

// --- Offline survival --------------------------------------------------------

export interface PendingFrame {
  gamePlayerId: string;
  /** 1-based */
  frameNo: number;
  rolls: string[];
  cumulative: number | null;
}

export interface LiveSnapshot {
  sessionId: string;
  gameId: string;
  gameNumber: number;
  updatedAt: string;
  players: LivePlayer[];
  /** frame upserts the server has not acknowledged yet, in write order */
  pending: PendingFrame[];
}

/**
 * Queue a frame write. One entry per frame — a frame written twice before the
 * network returns only needs its latest rolls, and moving it to the back keeps
 * the drain order "most recently touched last", which is the order the scorer
 * actually bowled them in.
 */
export function queueFrame(pending: PendingFrame[], entry: PendingFrame): PendingFrame[] {
  return [
    ...pending.filter((p) => !(p.gamePlayerId === entry.gamePlayerId && p.frameNo === entry.frameNo)),
    entry,
  ];
}

/**
 * Which frame rows a scorer edit actually changed. Covers a roll (one frame
 * grows) and an undo alike (a frame shrinks, or empties back to unbowled) —
 * an undone frame is written empty rather than deleted, so a spectator's next
 * refetch sees the same thing the scorer does.
 */
export function diffPending(previous: LivePlayer[], next: LivePlayer[]): PendingFrame[] {
  const before = new Map(previous.map((p) => [p.gamePlayerId, p]));
  const out: PendingFrame[] = [];

  for (const player of next) {
    const prior = before.get(player.gamePlayerId);
    const scored = score(player.frames);
    const frameCount = Math.max(player.frames.length, prior?.frames.length ?? 0);
    for (let i = 0; i < frameCount; i++) {
      const rolls = serializeRolls(player.frames[i]?.rolls ?? []);
      const priorRolls = serializeRolls(prior?.frames[i]?.rolls ?? []);
      if (rolls.join(',') === priorRolls.join(',')) continue;
      out.push({
        gamePlayerId: player.gamePlayerId,
        frameNo: i + 1,
        rolls,
        cumulative: scored.frames[i]?.cumulative ?? null,
      });
    }
  }
  return out;
}

export const snapshotKey = (sessionId: string) => `live-session:${sessionId}`;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStore(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // private mode / blocked storage — scoring still works in memory
  }
}

export function saveSnapshot(snapshot: LiveSnapshot, store: StorageLike | null = defaultStore()) {
  if (!store) return;
  try {
    store.setItem(snapshotKey(snapshot.sessionId), JSON.stringify(snapshot));
  } catch {
    /* quota or blocked storage: in-memory state is still the source of truth */
  }
}

export function loadSnapshot(
  sessionId: string,
  store: StorageLike | null = defaultStore(),
): LiveSnapshot | null {
  if (!store) return null;
  try {
    const raw = store.getItem(snapshotKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveSnapshot;
    if (!parsed?.gameId || !Array.isArray(parsed.players)) return null;
    return { ...parsed, pending: Array.isArray(parsed.pending) ? parsed.pending : [] };
  } catch {
    return null; // corrupt snapshot: fall back to the server's copy
  }
}

export function clearSnapshot(sessionId: string, store: StorageLike | null = defaultStore()) {
  if (!store) return;
  try {
    store.removeItem(snapshotKey(sessionId));
  } catch {
    /* nothing to do */
  }
}
