import type { FrameInput, Roll, ScoredGame } from '../engine';

/** DB representation of rolls is a jsonb string array, e.g. ["9","/"] or ["X"] (spec §4). */
export function serializeRolls(rolls: Roll[]): string[] {
  return rolls.map((roll) => String(roll));
}

export function deserializeRolls(raw: unknown): Roll[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry): Roll => {
    const s = String(entry);
    if (s === 'X' || s === '/' || s === 'F') return s;
    const n = Number(s);
    return Number.isInteger(n) && n >= 0 && n <= 10 ? n : 0;
  });
}

/** frames table rows → engine input, honouring frame_no order and gaps. */
export function framesFromRows(rows: { frame_no: number; rolls: unknown }[]): FrameInput[] {
  const byNo = new Map(rows.map((r) => [r.frame_no, deserializeRolls(r.rolls)]));
  const count = rows.length ? Math.max(...rows.map((r) => r.frame_no)) : 0;
  return Array.from({ length: count }, (_, i) => ({ rolls: byNo.get(i + 1) ?? [] }));
}

/** Cached per-player counters written on game_players (spec §4). */
export function frameCounts(game: ScoredGame): { strikes: number; spares: number; opens: number } {
  return {
    strikes: game.frames.filter((f) => f.isStrike).length,
    spares: game.frames.filter((f) => f.isSpare).length,
    opens: game.frames.filter((f) => f.isOpen).length,
  };
}
