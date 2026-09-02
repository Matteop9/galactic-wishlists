import { useState } from 'react';
import Keypad from '../../components/Keypad';
import { normalizeFrames, score, type FrameInput, type Roll } from '../../engine';
import { frameGlyphs, glyphColor } from '../../components/scorecard/display';

const CANDIDATES: Roll[] = ['X', '/', 'F', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Rewrite one frame's rolls, keeping every other frame as it is. */
function withFrameRolls(frames: FrameInput[], frameIndex: number, rolls: Roll[]): FrameInput[] {
  return normalizeFrames(frames.map((frame, i) => (i === frameIndex ? { rolls } : { rolls: [...frame.rolls] })));
}

/**
 * Spot-edit one frame from photo review (README §Flagship, mode "spot-edit").
 *
 * You re-enter the frame the monitor disagrees with, roll by roll, and every
 * later total re-derives immediately. Key legality is decided by handing the
 * candidate frame to the engine and seeing whether it objects — the same rules
 * that score every other game here, not a second copy written for a keypad.
 */
export default function SpotFrameEditor({
  frames,
  frameIndex,
  playerName,
  onChange,
  onDone,
}: {
  frames: FrameInput[];
  frameIndex: number;
  playerName: string;
  onChange: (next: FrameInput[]) => void;
  onDone: () => void;
}) {
  const isTenth = frameIndex === 9;
  const maxRolls = isTenth ? 3 : 2;
  const rolls = frames[frameIndex]?.rolls ?? [];
  const [slot, setSlot] = useState(Math.min(rolls.length, maxRolls - 1));

  const scored = safeScore(frames);
  const glyphs = frameGlyphs(scored?.frames[frameIndex], isTenth);

  const candidateFor = (roll: Roll): Roll[] => [...rolls.slice(0, slot), roll];

  const legal = new Set<Roll>(
    CANDIDATES.filter((roll) => {
      try {
        withFrameRolls(frames, frameIndex, candidateFor(roll));
        return true;
      } catch {
        return false;
      }
    }),
  );

  function apply(roll: Roll) {
    let next: FrameInput[];
    try {
      next = withFrameRolls(frames, frameIndex, candidateFor(roll));
    } catch {
      return; // the key was disabled; nothing to do
    }
    onChange(next);
    const after = next[frameIndex]?.rolls ?? [];
    const frameFinished = after.length >= maxRolls || (!isTenth && after[0] === 'X');
    if (frameFinished) onDone();
    else setSlot(after.length);
  }

  function clearFrame() {
    onChange(withFrameRolls(frames, frameIndex, []));
    setSlot(0);
  }

  return (
    <div className="sheet-up flex flex-col gap-4 rounded-2xl border border-phosphor/40 bg-panel p-4 shadow-sheet">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-bold">
            Frame {frameIndex + 1} · {playerName}
          </p>
          <p className="text-[12px] text-dim">
            {rolls.length === 0
              ? 'Tap the rolls as the monitor shows them'
              : `Roll ${Math.min(slot + 1, maxRolls)} of ${maxRolls}`}
          </p>
        </div>
        <button
          type="button"
          onClick={clearFrame}
          className="press rounded-lg border border-line bg-well px-3 py-2 text-[13px] text-dim"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onDone}
          className="press rounded-lg border border-line bg-well px-3 py-2 text-[13px] text-text"
        >
          Done
        </button>
      </div>

      <div
        className={`mx-auto ${
          isTenth ? 'w-36' : 'w-28'
        } overflow-hidden rounded border-[1.5px] border-phosphor bg-well shadow-glow-amber`}
      >
        <div className="flex h-9 divide-x divide-hairline">
          {glyphs.map((g, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlot(i)}
              disabled={i > rolls.length}
              className={`grid flex-1 place-items-center font-display text-[15px] font-semibold ${
                i === slot ? 'bg-phosphor/15' : ''
              } ${glyphColor(g)}`}
              aria-label={`Roll ${i + 1}`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="grid h-9 place-items-center border-t border-hairline">
          <span className="score-text text-[14px] text-text">
            {scored?.frames[frameIndex]?.cumulative ?? ''}
          </span>
        </div>
      </div>

      <Keypad legal={legal} onRoll={apply} />
    </div>
  );
}

function safeScore(frames: FrameInput[]) {
  try {
    return score(frames);
  } catch {
    return null;
  }
}
