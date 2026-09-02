import { highlightLabel } from './highlights';

/**
 * The words on the share card, and the message that goes with it.
 *
 * Pure, so the fiddly branches — who won, by how much, what you’re allowed to
 * boast about — are unit-tested rather than eyeballed. The card itself
 * (`components/share/ShareCard.tsx`) only renders what this returns.
 *
 * One rule worth naming: **an unverified score never brags.** The design’s
 * stinger for a verified card is "pics attached, so it counts"; a game nobody
 * photographed says something quieter, because the whole point of the badge is
 * that it means something.
 */

export interface SharePlayer {
  name: string;
  score: number | null;
  isYou?: boolean;
}

export interface ShareCopyInput {
  players: SharePlayer[];
  verification: 'verified' | 'live' | 'unverified';
  highlights: string[];
  /** strikes in the winner’s game, for the glass stat pill */
  strikes?: number;
  groupName?: string | null;
  venueName?: string | null;
  playedAt?: string;
}

export interface ShareCopy {
  /** whose game the card is about */
  winner: string;
  score: number;
  /** amber pills (earned highlights) then one glass pill (the strike count) */
  pills: string[];
  statPill: string | null;
  /** the line above the stamp */
  stinger: string;
  /** the message body when the image is shared */
  text: string;
  /** e.g. "FRI 3 JUL · HOLLYWOOD BOWL" */
  meta: string;
}

const MAX_TEXT = 180;

type ScoredPlayer = SharePlayer & { score: number };

function scored(players: SharePlayer[]): ScoredPlayer[] {
  return players.filter((p): p is ScoredPlayer => typeof p.score === 'number');
}

/** The card is about the best game on the sheet — yours if you tie for it. */
function pickWinner(players: SharePlayer[]): ScoredPlayer | null {
  const eligible = scored(players);
  if (eligible.length === 0) return null;
  const best = Math.max(...eligible.map((p) => p.score));
  const tied = eligible.filter((p) => p.score === best);
  return tied.find((p) => p.isYou) ?? tied[0];
}

function marginLine(winner: ScoredPlayer, players: SharePlayer[]): string {
  const others = scored(players).filter((p) => p !== winner);
  if (others.length === 0) return `${winner.score} on the night`;

  const runnerUp = others.reduce((best, p) => (p.score > best.score ? p : best), others[0]);
  const margin = winner.score - runnerUp.score;
  if (margin === 0) return `Tied with ${runnerUp.name} on ${winner.score}`;
  if (margin === 1) return `Pipped ${runnerUp.name} by 1`;
  return `Beat ${runnerUp.name} by ${margin}`;
}

export function shareCopy(input: ShareCopyInput): ShareCopy | null {
  const winner = pickWinner(input.players);
  if (!winner) return null;

  const pills = input.highlights.map(highlightLabel).map((label) => label.toUpperCase());
  const statPill =
    typeof input.strikes === 'number' && input.strikes > 0
      ? `${input.strikes} ${input.strikes === 1 ? 'STRIKE' : 'STRIKES'}`
      : null;

  const margin = marginLine(winner, input.players);
  const proof =
    input.verification === 'verified'
      ? 'pics attached, so it counts'
      : input.verification === 'live'
        ? 'scored live, frame by frame'
        : 'scored frame by frame, unverified';

  const meta = [
    input.playedAt
      ? new Date(input.playedAt)
          .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          .toUpperCase()
      : null,
    input.venueName?.toUpperCase() ?? null,
  ]
    .filter(Boolean)
    .join(' · ');

  const headline = `${winner.name} · ${winner.score}`;
  const body = [headline, margin, input.groupName].filter(Boolean).join(' · ');

  return {
    winner: winner.name,
    score: winner.score,
    pills,
    statPill,
    stinger: `${margin} · ${proof}`,
    text: body.length > MAX_TEXT ? `${body.slice(0, MAX_TEXT - 1)}…` : body,
    meta,
  };
}
