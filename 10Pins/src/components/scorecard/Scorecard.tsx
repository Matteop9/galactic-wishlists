import type { ReactNode } from 'react';
import { score, type FrameInput } from '../../engine';
import { StripHeader } from '../Strip';
import { frameGlyphs, glyphColor } from './display';

/**
 * The scoresheet strip for a game: the frame-grid primitive (DESIGN.md).
 *
 * One strip per player: a header row (name, meta, total right-aligned) over a
 * ten-frame grid with two ball cells top-right per frame (three in the 10th)
 * and the cumulative total beneath. Marks: X red, / blue, pin counts ink,
 * misses as a dash.
 *
 * Variants change sizing and state marking, never the shape:
 * - full: the game page (30px total)
 * - compact: feed cards (24px total)
 * - live: the frame being bowled is filled with `--card` and ruled in ink;
 *   frames not yet bowled are blank
 * - editing: tappable cells; flagged frames (a scan the engine can't
 *   reconcile) are filled with `--card`
 * - share: larger cells for the 540px share card
 */
export type ScorecardVariant = 'full' | 'compact' | 'live' | 'editing' | 'share';

export interface ScorecardPlayer {
  name: string;
  frames: FrameInput[];
  /** the line under the name: venue and date, "Game 2 of 3", "at the line" */
  meta?: ReactNode;
  /** live: this player is at the line */
  current?: boolean;
  /** live/editing: 0-based frame index being bowled or edited */
  currentFrame?: number;
  /** editing: 0-based frames the engine can't reconcile with the photo */
  amberFrames?: number[];
  /** frames whose cumulative just changed: the total fills in */
  settleFrames?: number[];
  /** colour the total: hot = red (a high game), steady = blue */
  tone?: 'hot' | 'steady' | null;
  /** override the header total (a totals-only game, or a running total) */
  total?: number | null;
}

interface Sizing {
  ball: string;
  ballText: string;
  total: string;
  header: 'md' | 'lg';
}

const BASE: Sizing = { ball: 'h-[18px] w-[15px]', ballText: 'text-[12px]', total: 'py-1 text-[13px]', header: 'md' };
const FULL: Sizing = { ...BASE, header: 'lg' };
const SHARE: Sizing = { ball: 'h-6 w-5', ballText: 'text-[15px]', total: 'py-1.5 text-[16px]', header: 'lg' };

export default function Scorecard({
  players,
  variant = 'full',
  onFrameTap,
  className = '',
}: {
  players: ScorecardPlayer[];
  variant?: ScorecardVariant;
  /** editing: make every cell tappable, for photo-review spot edits */
  onFrameTap?: (playerIndex: number, frameIndex: number) => void;
  className?: string;
}) {
  const size = variant === 'share' ? SHARE : variant === 'full' ? FULL : BASE;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {players.map((player, playerIndex) => (
        // Keyed by seat, not name: a monitor photo can legitimately return two
        // players called MATT, and React would collapse them into one row.
        <PlayerStrip
          key={playerIndex}
          player={player}
          variant={variant}
          size={size}
          onFrameTap={onFrameTap ? (frameIndex) => onFrameTap(playerIndex, frameIndex) : undefined}
        />
      ))}
    </div>
  );
}

function PlayerStrip({
  player,
  variant,
  size,
  onFrameTap,
}: {
  player: ScorecardPlayer;
  variant: ScorecardVariant;
  size: Sizing;
  onFrameTap?: (frameIndex: number) => void;
}) {
  const game = score(player.frames);
  const running = [...game.frames].reverse().find((f) => f.cumulative !== null)?.cumulative ?? null;
  const total = player.total !== undefined ? player.total : game.total ?? running;
  const meta =
    player.meta ?? (variant === 'live' && player.current ? 'at the line' : undefined);

  return (
    <div className="strip">
      <StripHeader
        title={player.name}
        meta={meta}
        right={total ?? ''}
        tone={player.tone ?? (total === null ? 'faded' : null)}
        size={size.header}
        className="border-b border-hairline"
      />
      <div className="grid grid-cols-[repeat(9,1fr)_1.45fr]">
        {Array.from({ length: 10 }, (_, i) => (
          <FrameCell
            key={i}
            index={i}
            player={player}
            variant={variant}
            size={size}
            glyphs={frameGlyphs(game.frames[i], i === 9)}
            cumulative={game.frames[i]?.cumulative ?? null}
            onTap={onFrameTap ? () => onFrameTap(i) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function FrameCell({
  index,
  player,
  variant,
  size,
  glyphs,
  cumulative,
  onTap,
}: {
  index: number;
  player: ScorecardPlayer;
  variant: ScorecardVariant;
  size: Sizing;
  glyphs: string[];
  cumulative: number | null;
  onTap?: () => void;
}) {
  const isTenth = index === 9;
  const focused =
    (variant === 'live' || variant === 'editing') && player.current !== false && player.currentFrame === index;
  const flagged = variant === 'editing' && (player.amberFrames ?? []).includes(index);
  const settling = (player.settleFrames ?? []).includes(index);

  const Cell = onTap ? 'button' : 'div';

  return (
    <Cell
      {...(onTap ? { type: 'button' as const, onClick: onTap, 'aria-label': `Frame ${index + 1}` } : {})}
      className={`relative flex min-w-0 flex-col ${isTenth ? '' : 'border-r border-hairline'} ${
        onTap ? 'press text-left' : ''
      } ${focused || flagged ? 'bg-card' : ''}`}
    >
      <div className={`flex ${isTenth ? '' : 'justify-end'} border-b border-hairline`}>
        {glyphs.map((g, i) => (
          <span
            key={i}
            className={`num flex items-center justify-center ${isTenth ? 'h-[18px] flex-1' : size.ball} ${
              i > 0 ? 'border-l border-hairline' : ''
            } ${size.ballText} ${glyphColor(g)}`}
          >
            {g}
          </span>
        ))}
      </div>
      <span
        key={`${index}-${cumulative}`}
        className={`num text-center font-medium leading-none ${size.total} ${settling ? 'settle' : ''}`}
      >
        {cumulative ?? ' '}
      </span>
      {focused && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-ink" aria-hidden />}
    </Cell>
  );
}
