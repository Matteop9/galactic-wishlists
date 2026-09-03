import { applyRoll, legalRolls, nextRoll, score, type FrameInput, type Roll } from '../engine';
import Avatar from './Avatar';
import Keypad from './Keypad';
import { frameGlyphs, glyphColor } from './scorecard/display';

/**
 * Frame editor: header (bowler, frame and roll, an always-visible Undo), the
 * focused frame as a boxed numeral, then the keypad. One component for live
 * scoring, photo-review correction and manual entry.
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar name={playerName} size={40} />
        <div className="min-w-0 flex-1">
          <p className="num truncate text-[17px] font-semibold">{playerName}</p>
          <p className="text-[13px] text-ink-faded">
            {pos ? `Frame ${pos.frame + 1}, roll ${pos.roll + 1}` : 'Game complete'}
          </p>
        </div>
        <button type="button" onClick={onUndo} disabled={!canUndo} className="btn-secondary-sm">
          Undo
        </button>
      </div>

      {/* The boxed numeral: r0, 1.5px ink border, ball cells over the total. */}
      <div className={`mx-auto ${focusIndex === 9 ? 'w-40' : 'w-32'} strip`}>
        <div className="flex h-10 divide-x divide-hairline">
          {glyphs.map((g, i) => (
            <span key={i} className={`num grid flex-1 place-items-center text-[20px] ${glyphColor(g)}`}>
              {g}
            </span>
          ))}
        </div>
        <div className="grid h-10 place-items-center border-t border-hairline">
          <span className="num text-[20px] font-medium text-ink">{focusFrame?.cumulative ?? ''}</span>
        </div>
      </div>

      <Keypad legal={legal} onRoll={(roll: Roll) => onChange(applyRoll(frames, roll))} />
    </div>
  );
}
