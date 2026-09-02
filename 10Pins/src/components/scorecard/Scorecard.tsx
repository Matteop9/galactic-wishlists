import { score, type FrameInput } from '../../engine';
import { frameGlyphs, glyphColor, miniGlyph } from './display';

/**
 * The canonical scorecard grid — the single most important object (README §Flagship).
 * Variants: full (feed detail/review), compact (feed cards), live (current frame
 * amber), editing (focused/mismatch frames), share (larger, branded render).
 */
export type ScorecardVariant = 'full' | 'compact' | 'live' | 'editing' | 'share';

export interface ScorecardPlayer {
  name: string;
  frames: FrameInput[];
  /** live: this player is at the line — gets the NOW BOWLING pill */
  current?: boolean;
  /** live/editing: 0-based frame index with the amber focus outline */
  currentFrame?: number;
  /** editing: 0-based frames that fail to recompute — amber mismatch fill */
  amberFrames?: number[];
  /** frames whose cumulative just changed — settle flash */
  settleFrames?: number[];
}

interface Sizing {
  name: string;
  strip: string;
  roll: string;
  total: string;
}

// Totals are 10px, not 11: three digits of Martian Mono at 11px measure ~23px
// and a frame cell is 22.3px at 375px wide, so every score over 99 was being
// shaved a pixel (spec §12: totals must not clip).
const BASE: Sizing = { name: 'w-11 text-[9px]', strip: 'h-[18px]', roll: 'text-[10px]', total: 'h-5 text-[10px]' };
// The live variant spends 32px of the row on the running-total column, which
// leaves 19px cells — 2px short of three digits at 10px. It gets 9px and
// slightly tighter tracking rather than a clipped score.
const LIVE: Sizing = { ...BASE, total: 'h-5 text-[9px] tracking-[-0.02em]' };
const SHARE: Sizing = { name: 'w-14 text-[11px]', strip: 'h-6', roll: 'text-[13px]', total: 'h-7 text-[14px]' };

export default function Scorecard({
  players,
  variant = 'full',
  onFrameTap,
}: {
  players: ScorecardPlayer[];
  variant?: ScorecardVariant;
  /** editing: make every cell tappable, for photo-review spot edits */
  onFrameTap?: (playerIndex: number, frameIndex: number) => void;
}) {
  if (variant === 'compact') return <CompactCard players={players} />;

  const size = variant === 'share' ? SHARE : variant === 'live' ? LIVE : BASE;
  const current = variant === 'live' ? players.find((p) => p.current) : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {current && (
        <div className="mb-1 flex items-center justify-between">
          <span className="label-caps">{current.name}</span>
          <span className="rounded-full border border-phosphor px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[.12em] text-phosphor shadow-glow-amber">
            Now bowling
          </span>
        </div>
      )}
      {players.map((player, playerIndex) => (
        // Keyed by seat, not name: a monitor photo can legitimately return two
        // players called MATT, and React would collapse them into one row.
        <PlayerRow
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

function PlayerRow({
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

  return (
    <div className="flex items-center gap-1">
      <span className={`${size.name} shrink-0 truncate font-mono font-semibold uppercase tracking-[.08em] text-dim`}>
        {player.name}
      </span>
      <div className="flex min-w-0 flex-1 items-stretch gap-[3px]">
        {Array.from({ length: 10 }, (_, i) => (
          <FrameCell
            key={i}
            index={i}
            player={player}
            variant={variant}
            size={size}
            glyphs={frameGlyphs(game.frames[i], i === 9)}
            cumulative={game.frames[i]?.cumulative ?? null}
            empty={(game.frames[i]?.rolls.length ?? 0) === 0}
            onTap={onFrameTap ? () => onFrameTap(i) : undefined}
          />
        ))}
      </div>
      {variant === 'live' && (
        <span className="score-text w-8 shrink-0 text-right text-[13px] font-semibold text-text">
          {running ?? ''}
        </span>
      )}
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
  empty,
  onTap,
}: {
  index: number;
  player: ScorecardPlayer;
  variant: ScorecardVariant;
  size: Sizing;
  glyphs: string[];
  cumulative: number | null;
  empty: boolean;
  onTap?: () => void;
}) {
  const isTenth = index === 9;
  const focused =
    (variant === 'live' || variant === 'editing') && player.current !== false && player.currentFrame === index;
  const mismatch = variant === 'editing' && (player.amberFrames ?? []).includes(index);
  const settling = (player.settleFrames ?? []).includes(index);
  const pendingDim = variant === 'live' && empty && !focused;

  const border = focused
    ? 'border-[1.5px] border-phosphor shadow-glow-amber'
    : mismatch
      ? 'border-2 border-phosphor'
      : 'border border-line';

  const Cell = onTap ? 'button' : 'div';

  return (
    <>
      {isTenth && <span className="w-[2px] shrink-0 self-stretch rounded-full bg-[#2E4258]" />}
      <Cell
        {...(onTap ? { type: 'button' as const, onClick: onTap, 'aria-label': `Frame ${index + 1}` } : {})}
        className={`relative min-w-0 overflow-hidden rounded ${onTap ? 'press' : ''} ${border} ${
          mismatch ? 'bg-[rgba(255,174,43,.14)]' : 'bg-well'
        } ${pendingDim ? 'opacity-45' : ''} ${isTenth ? 'flex-[1.7]' : 'flex-1'}`}
      >
        <div className={`flex divide-x divide-hairline ${size.strip}`}>
          {glyphs.map((g, i) => (
            <span
              key={i}
              className={`grid flex-1 place-items-center font-display font-semibold ${size.roll} ${glyphColor(g)}`}
            >
              {g}
            </span>
          ))}
        </div>
        <div className={`grid place-items-center border-t border-hairline ${size.total}`}>
          <span key={`${index}-${cumulative}`} className={`score-text text-text ${settling ? 'settle' : ''}`}>
            {cumulative ?? ''}
          </span>
        </div>
        {focused && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-phosphor" />}
      </Cell>
    </>
  );
}

/** Compact variant: name (74px) + one-glyph mini strip + right-aligned total. */
function CompactCard({ players }: { players: ScorecardPlayer[] }) {
  return (
    <div className="flex flex-col gap-2">
      {players.map((player, playerIndex) => {
        const game = score(player.frames);
        return (
          <div key={playerIndex} className="flex h-6 items-center gap-2">
            <span className="w-[74px] shrink-0 truncate font-mono text-[10px] font-semibold uppercase tracking-[.08em] text-dim">
              {player.name}
            </span>
            <div className="flex flex-1 gap-[3px]">
              {Array.from({ length: 10 }, (_, i) => {
                const g = miniGlyph(game.frames[i]);
                return (
                  <span
                    key={i}
                    className={`grid h-5 flex-1 place-items-center rounded-[3px] border border-hairline bg-well font-display text-[9px] font-semibold ${glyphColor(g)}`}
                  >
                    {g}
                  </span>
                );
              })}
            </div>
            <span className="score-text w-8 shrink-0 text-right text-[14px] font-bold text-text">
              {game.total ?? ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
