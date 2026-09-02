import type { FrameInput, Roll } from '../engine';
import { highlightLabel } from './highlights';

/**
 * The celebration ladder (README: "Celebrations escalate — strike → turkey →
 * PB/200/250/300 club — ≤1.2s, always skippable, never block scoring").
 *
 * Pure: no React, no DOM, no Supabase — same shape as `skeleton.ts`, so the
 * decisions are unit-testable and the UI only has to render what it's told.
 *
 * The governing rule that makes "never blocks scoring" structural rather than
 * a promise: **a per-roll celebration never rises above tier 2**, and tier 2
 * is a `pointer-events-none` strip at the top of the screen, away from the
 * keypad. Tier 3 is a centred overlay, and it can only fire at the end of a
 * game — the point at which `LiveScorer` has already unmounted the keypad.
 *
 * Spares deliberately don't celebrate. They're roughly a third of all frames;
 * celebrating them turns the ladder into wallpaper and spends the amber that
 * spec §12 reserves for earned states.
 */

export const CELEBRATE_MAX_MS = 1200;

export type CelebrationTier = 1 | 2 | 3;

export interface Celebration {
  /** stable identity for one event — lets the host remount and de-dupe */
  id: string;
  tier: CelebrationTier;
  /** the headline, in the display face */
  label: string;
  /** second line, tier 3 only — the runners-up */
  detail?: string;
  durationMs: number;
  /** tier 3 only: offers "Share it" for this game */
  gameId?: string;
}

export interface CelebrationState {
  current: Celebration | null;
  shownAt: number;
}

const DURATION: Record<CelebrationTier, number> = { 1: 400, 2: 900, 3: CELEBRATE_MAX_MS };

/**
 * Every roll in bowling order. Frames 1–9 hold `['X']` for a strike, so a flat
 * concat already gives the right 9th → 10th run with no special-casing.
 */
export function flattenRolls(frames: FrameInput[]): Roll[] {
  return frames.flatMap((frame) => frame.rolls);
}

function trailingStrikes(rolls: Roll[]): number {
  let run = 0;
  for (let i = rolls.length - 1; i >= 0; i--) {
    if (rolls[i] !== 'X') break;
    run++;
  }
  return run;
}

/** Strike-run wording. Bowlers say double and turkey; past four, say the number. */
function runLabel(run: number): { label: string; tier: CelebrationTier } {
  if (run <= 1) return { label: 'Strike', tier: 1 };
  if (run === 2) return { label: 'Double', tier: 2 };
  if (run === 3) return { label: 'Turkey', tier: 2 };
  if (run === 4) return { label: 'Four-bagger', tier: 2 };
  return { label: `${run} in a row`, tier: 2 };
}

/**
 * What to celebrate for the roll that turned `previous` into `next`.
 *
 * Works off the two frame arrays rather than the roll itself, so the caller's
 * existing `onChange(next)` contract is unchanged — and an undo (which makes
 * `next` shorter) correctly celebrates nothing.
 */
export function rollCelebration(
  previous: FrameInput[],
  next: FrameInput[],
  who?: string,
): Celebration | null {
  const before = flattenRolls(previous);
  const after = flattenRolls(next);
  if (after.length <= before.length) return null; // undo, or an edit that added nothing
  if (after[after.length - 1] !== 'X') return null;

  const run = trailingStrikes(after);
  const { label, tier } = runLabel(run);
  // A strike is too frequent to keep naming the bowler; a turkey isn't.
  const named = tier > 1 && who ? `${who} · ${label.toLowerCase()}` : label;

  return {
    id: `roll:${after.length}:${run}`,
    tier,
    label: named,
    durationMs: DURATION[tier],
  };
}

/** Loudest first. Anything not listed doesn't celebrate. */
const HIGHLIGHT_RANK: { code: string; tier: CelebrationTier; label?: string; detail?: string }[] = [
  { code: '300_CLUB', tier: 3, label: 'Perfect game', detail: 'Twelve strikes. Three hundred.' },
  { code: '250_CLUB', tier: 3 },
  { code: '200_CLUB', tier: 3 },
  { code: 'PB', tier: 3, label: 'New personal best' },
  { code: '150_CLUB', tier: 2 },
  { code: '100_CLUB', tier: 2 },
  { code: 'TURKEY', tier: 2 },
  { code: 'FIRST_GAME', tier: 2, label: 'First game on the board' },
];

/**
 * The end-of-game celebration for a set of `computeHighlights` codes: the
 * single loudest one, with the runners-up folded into `detail`. A 300 game is
 * one moment, not three toasts stacked on each other.
 */
export function gameCelebration(highlights: string[], gameId?: string): Celebration | null {
  const winner = HIGHLIGHT_RANK.find((entry) => highlights.includes(entry.code));
  if (!winner) return null;

  const others = HIGHLIGHT_RANK.filter(
    (entry) => entry.code !== winner.code && highlights.includes(entry.code),
  ).map((entry) => highlightLabel(entry.code));

  return {
    id: `game:${gameId ?? 'x'}:${winner.code}`,
    tier: winner.tier,
    label: winner.label ?? highlightLabel(winner.code),
    detail: winner.detail ?? (others.length > 0 ? others.join(' · ') : undefined),
    durationMs: DURATION[winner.tier],
    gameId: winner.tier === 3 ? gameId : undefined,
  };
}

/**
 * Whether an incoming celebration replaces what's on screen. Louder always
 * interrupts quieter; equal-or-quieter is dropped rather than queued, because
 * a queue is how a 1.2s cap turns into four seconds of confetti.
 */
export function celebrationStep(
  incoming: Celebration,
  state: CelebrationState,
  now: number,
): { kind: 'show'; celebration: Celebration } | { kind: 'ignore' } {
  const { current, shownAt } = state;
  if (!current) return { kind: 'show', celebration: incoming };
  if (incoming.tier > current.tier) return { kind: 'show', celebration: incoming };
  if (now - shownAt >= current.durationMs) return { kind: 'show', celebration: incoming };
  return { kind: 'ignore' };
}

/** Milliseconds until auto-dismiss; 0 when nothing is showing or it has expired. */
export function remainingMs(state: CelebrationState, now: number): number {
  if (!state.current) return 0;
  return Math.max(0, state.shownAt + state.current.durationMs - now);
}
