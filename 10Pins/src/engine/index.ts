/**
 * 10 Pins scoring engine — pure TypeScript, zero dependencies, no React.
 *
 * The single source of truth for all bowling totals (build spec §3).
 * The database stores raw rolls; every cumulative total is derived here.
 * Frame indices in the public API are 0-based (frame 1 = index 0).
 */

export type Roll = number | 'X' | '/' | 'F';

export interface FrameInput {
  rolls: Roll[];
}

export interface ScoredFrame {
  rolls: Roll[];
  pinsPerRoll: number[];
  cumulative: number | null; // null while bonus rolls are pending
  isStrike: boolean;
  isSpare: boolean;
  isOpen: boolean;
  isSplit?: boolean; // splits need pin positions, which rolls alone can't tell — set from photo extraction
}

export interface ScoredGame {
  frames: ScoredFrame[];
  total: number | null;
  complete: boolean;
}

export class EngineError extends Error {
  readonly frameIndex: number;

  constructor(message: string, frameIndex: number) {
    super(message);
    this.name = 'EngineError';
    this.frameIndex = frameIndex;
  }
}

const TENTH = 9;

/** Pin value of a roll given how many pins were standing when it was thrown. */
function rollValue(roll: Roll, standing: number): number {
  if (roll === 'X') return 10;
  if (roll === '/') return standing;
  if (roll === 'F') return 0;
  return roll;
}

/**
 * Validate one frame and normalise its notation:
 * a first-ball 10 becomes 'X', any pair summing to 10 becomes `n, /`.
 * Tracks the rack through the frame so 10th-frame fresh-rack resets
 * (after a strike or spare) get strike/spare semantics right.
 */
function normalizeFrame(rolls: Roll[], frameIndex: number): Roll[] {
  const isTenth = frameIndex === TENTH;
  const maxRolls = isTenth ? 3 : 2;
  if (rolls.length > maxRolls) {
    throw new EngineError(`frame ${frameIndex + 1}: at most ${maxRolls} rolls`, frameIndex);
  }

  const out: Roll[] = [];
  let standing = 10;
  let freshRack = true;

  for (let r = 0; r < rolls.length; r++) {
    let roll = rolls[r];

    if (!isTenth && out.length === 1 && out[0] === 'X') {
      throw new EngineError(`frame ${frameIndex + 1}: no roll after a strike`, frameIndex);
    }
    if (isTenth && r === 2 && out[0] !== 'X' && out[1] !== '/') {
      throw new EngineError('frame 10: third roll needs a strike or spare first', frameIndex);
    }

    if (typeof roll === 'number') {
      if (!Number.isInteger(roll) || roll < 0 || roll > 10) {
        throw new EngineError(`frame ${frameIndex + 1}: invalid pin count ${roll}`, frameIndex);
      }
      if (roll > standing) {
        throw new EngineError(
          `frame ${frameIndex + 1}: ${roll} pins with only ${standing} standing`,
          frameIndex,
        );
      }
      if (roll === standing) roll = freshRack ? 'X' : '/';
    } else if (roll === 'X') {
      if (!freshRack) {
        throw new EngineError(`frame ${frameIndex + 1}: strike mid-rack — a two-roll 10 is a spare`, frameIndex);
      }
    } else if (roll === '/') {
      if (freshRack) {
        throw new EngineError(`frame ${frameIndex + 1}: spare needs a previous roll on the rack`, frameIndex);
      }
    } else if (roll !== 'F') {
      throw new EngineError(`frame ${frameIndex + 1}: unknown roll ${String(roll)}`, frameIndex);
    }

    standing -= rollValue(roll, standing);
    out.push(roll);
    freshRack = false;
    if (standing === 0) {
      standing = 10;
      freshRack = true;
    }
  }
  return out;
}

/** Validate and normalise a whole game. Throws EngineError on illegal input. */
export function normalizeFrames(frames: FrameInput[]): FrameInput[] {
  if (frames.length > 10) {
    throw new EngineError('a game has at most 10 frames', frames.length - 1);
  }
  return frames.map((frame, i) => ({ rolls: normalizeFrame(frame.rolls, i) }));
}

/** Pin values for each roll in a (normalised) frame, honouring 10th-frame rack resets. */
function framePins(rolls: Roll[]): number[] {
  const pins: number[] = [];
  let standing = 10;
  for (const roll of rolls) {
    const value = rollValue(roll, standing);
    pins.push(value);
    standing -= value;
    if (standing === 0) standing = 10;
  }
  return pins;
}

/** How many rolls this frame needs to be finished. */
function rollsNeeded(rolls: Roll[], frameIndex: number): number {
  const isStrike = rolls[0] === 'X';
  if (frameIndex === TENTH) {
    return isStrike || rolls[1] === '/' ? 3 : 2;
  }
  return isStrike ? 1 : 2;
}

/** Full recompute, tolerant of partial games. */
export function score(frames: FrameInput[]): ScoredGame {
  const norm = normalizeFrames(frames);
  const pinsByFrame = norm.map((frame) => framePins(frame.rolls));

  const flat: number[] = [];
  const flatStart: number[] = [];
  pinsByFrame.forEach((pins) => {
    flatStart.push(flat.length);
    flat.push(...pins);
  });

  const scored: ScoredFrame[] = [];
  let running: number | null = 0;
  let complete = norm.length === 10;

  norm.forEach((frame, i) => {
    const rolls = frame.rolls;
    const pins = pinsByFrame[i];
    const isStrike = rolls[0] === 'X';
    const isSpare = !isStrike && rolls.length >= 2 && rolls[1] === '/';
    const filled = rolls.length >= rollsNeeded(rolls, i);
    if (!filled) complete = false;
    const isOpen = filled && !isStrike && !isSpare;

    let frameScore: number | null = null;
    if (i === TENTH) {
      if (filled) frameScore = pins.reduce((a, b) => a + b, 0);
    } else if (isStrike) {
      const bonus1 = flat[flatStart[i] + 1];
      const bonus2 = flat[flatStart[i] + 2];
      if (bonus1 !== undefined && bonus2 !== undefined) frameScore = 10 + bonus1 + bonus2;
    } else if (isSpare) {
      const bonus = flat[flatStart[i] + 2];
      if (bonus !== undefined) frameScore = 10 + bonus;
    } else if (filled) {
      frameScore = pins[0] + pins[1];
    }

    running = running === null || frameScore === null ? null : running + frameScore;
    scored.push({ rolls, pinsPerRoll: pins, cumulative: running, isStrike, isSpare, isOpen });
  });

  return {
    frames: scored,
    total: complete ? scored[TENTH].cumulative : null,
    complete,
  };
}

/** Where the next roll goes, or null if the game is complete. */
function findPosition(norm: FrameInput[]): { frame: number; roll: number } | null {
  for (let i = 0; i < 10; i++) {
    const frame = norm[i];
    if (!frame) return { frame: i, roll: 0 };
    if (frame.rolls.length < rollsNeeded(frame.rolls, i)) {
      return { frame: i, roll: frame.rolls.length };
    }
  }
  return null;
}

/** Where the next roll goes (0-based frame and roll), or null when the game is complete. */
export function nextRoll(frames: FrameInput[]): { frame: number; roll: number } | null {
  return findPosition(normalizeFrames(frames));
}

/** Legal next-roll set for keypad disabling. Empty set when the game is complete. */
export function legalRolls(frames: FrameInput[]): Set<Roll> {
  const norm = normalizeFrames(frames);
  const pos = findPosition(norm);
  const legal = new Set<Roll>();
  if (!pos) return legal;

  const prior = norm[pos.frame]?.rolls ?? [];
  let standing = 10;
  let freshRack = true;
  for (const roll of prior) {
    standing -= rollValue(roll, standing);
    freshRack = false;
    if (standing === 0) {
      standing = 10;
      freshRack = true;
    }
  }

  legal.add('F');
  if (freshRack) {
    for (let d = 0; d <= 9; d++) legal.add(d);
    legal.add('X'); // a first-ball 10 is always X, never a digit
  } else {
    for (let d = 0; d < standing; d++) legal.add(d);
    legal.add('/'); // clearing the rack mid-frame is always a spare
  }
  return legal;
}

/** Append the next roll (normalised on the way in). Throws if the game is over or the roll illegal. */
export function applyRoll(frames: FrameInput[], roll: Roll): FrameInput[] {
  const norm = normalizeFrames(frames);
  const pos = findPosition(norm);
  if (!pos) throw new EngineError('game is complete — no further rolls', TENTH);

  const next = norm.map((frame) => ({ rolls: [...frame.rolls] }));
  while (next.length <= pos.frame) next.push({ rolls: [] });
  next[pos.frame].rolls.push(roll);
  return normalizeFrames(next);
}

/**
 * Replace one existing roll, then re-normalise. Later rolls in the same frame
 * that the edit makes illegal are dropped (e.g. editing the first roll to X).
 * Throws if the edited roll itself is illegal in context. Caller recomputes via score().
 */
export function editRoll(frames: FrameInput[], f: number, r: number, roll: Roll): FrameInput[] {
  const norm = normalizeFrames(frames);
  if (f < 0 || f >= norm.length) throw new EngineError(`no frame ${f + 1} to edit`, f);
  const rolls = [...norm[f].rolls];
  if (r < 0 || r >= rolls.length) throw new EngineError(`frame ${f + 1} has no roll ${r + 1}`, f);

  rolls[r] = roll;
  let fixed: Roll[] | null = null;
  for (let len = rolls.length; len >= r + 1; len--) {
    try {
      fixed = normalizeFrame(rolls.slice(0, len), f);
      break;
    } catch (err) {
      if (len === r + 1) throw err;
    }
  }
  return norm.map((frame, i) => (i === f ? { rolls: fixed! } : { rolls: [...frame.rolls] }));
}

/**
 * Compare engine-computed cumulatives with claimed ones (from photo extraction).
 * Null claims (unreadable / pending frames) are skipped. Returns 0-based failing
 * frame indices — the amber-highlight and verification input.
 */
export function reconciles(
  frames: FrameInput[],
  claimedCumulatives: (number | null)[],
): { ok: boolean; badFrames: number[] } {
  let game: ScoredGame;
  try {
    game = score(frames);
  } catch (err) {
    // normalizeFrames only ever throws EngineError, which carries the frame index
    return { ok: false, badFrames: [(err as EngineError).frameIndex] };
  }

  const badFrames: number[] = [];
  for (let i = 0; i < claimedCumulatives.length; i++) {
    const claimed = claimedCumulatives[i];
    if (claimed === null) continue;
    const actual = game.frames[i]?.cumulative ?? null;
    if (actual !== claimed) badFrames.push(i);
  }
  return { ok: badFrames.length === 0, badFrames };
}
