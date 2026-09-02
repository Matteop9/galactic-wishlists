import { applyRoll, legalRolls, nextRoll, score, type FrameInput, type Roll } from '../engine';
import Keypad from './Keypad';
import { frameGlyphs, glyphColor } from './scorecard/display';

/**
 * Frame editor: header (bowler + frame/roll context + always-visible Undo),
 * the focused frame cell, then the keypad. One component for live scoring,
 * photo-review correction and manual entry (README §Flagship).
 */
export default function FrameEditor({
  frames,
  onChange,
  onUndo,
  canUndo,
  playerName,
}: {
  frames: FrameInput[];
  onChange: (next: FrameInput[]) => void;
  onUndo: () => void;
  canUndo: boolean;
  playerName: string;
}) {
  const pos = nextRoll(frames);
  const legal = legalRolls(frames);
  const scored = score(frames);
  const focusIndex = pos?.frame ?? 9;
  const focusFrame = scored.frames[focusIndex];
  const glyphs = frameGlyphs(focusFrame, focusIndex === 9);
  const initials = playerName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-well font-display text-[13px] font-bold text-glass">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-bold">{playerName}</p>
          <p className="text-[12px] text-dim">
            {pos ? `Frame ${pos.frame + 1} · Roll ${pos.roll + 1}` : 'Game complete'}
          </p>
        </div>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-chip border border-line bg-well px-4 py-2 text-[13.5px] text-dim disabled:border-hairline disabled:text-disabled"
        >
          Undo
        </button>
      </div>

      <div
        className={`mx-auto ${focusIndex === 9 ? 'w-36' : 'w-28'} overflow-hidden rounded-cell border-[1.5px] ${
          pos ? 'border-phosphor shadow-glow-amber' : 'border-line'
        } bg-well`}
      >
        <div className="flex h-9 divide-x divide-hairline">
          {glyphs.map((g, i) => (
            <span
              key={i}
              className={`grid flex-1 place-items-center font-display text-[15px] font-semibold ${glyphColor(g)}`}
            >
              {g}
            </span>
          ))}
        </div>
        <div className="grid h-9 place-items-center border-t border-hairline">
          <span className="score-text text-[14px] text-text">{focusFrame?.cumulative ?? ''}</span>
        </div>
      </div>

      <Keypad legal={legal} onRoll={(roll: Roll) => onChange(applyRoll(frames, roll))} />
    </div>
  );
}
