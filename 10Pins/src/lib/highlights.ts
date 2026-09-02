import type { ScoredGame } from '../engine';

const CLUBS = [300, 250, 200, 150, 100] as const;

/**
 * Highlights written into feed_events on game confirm (spec §9):
 * PB, threshold clubs, turkey (three consecutive strikes anywhere), first game.
 */
export function computeHighlights(opts: {
  score: number;
  /** the player's best before this game; null = no previous games */
  previousBest: number | null;
  /** only for frame-scored games — enables turkey detection */
  game?: ScoredGame;
}): string[] {
  const { score, previousBest, game } = opts;
  const out: string[] = [];

  if (previousBest === null) out.push('FIRST_GAME');
  else if (score > previousBest) out.push('PB');

  const club = CLUBS.find((t) => score >= t && (previousBest ?? -1) < t);
  if (club) out.push(`${club}_CLUB`);

  if (game && hasTurkey(game)) out.push('TURKEY');
  return out;
}

/** Three consecutive strike ROLLS anywhere, including inside the 10th frame. */
function hasTurkey(game: ScoredGame): boolean {
  let run = 0;
  for (let i = 0; i < game.frames.length; i++) {
    const frame = game.frames[i];
    if (i < 9) {
      if (frame.isStrike) {
        run++;
        if (run >= 3) return true;
      } else {
        run = 0;
      }
    } else {
      for (const roll of frame.rolls) {
        if (roll === 'X') {
          run++;
          if (run >= 3) return true;
        } else {
          run = 0;
        }
      }
    }
  }
  return false;
}
