import type { Roll } from '../engine';

/**
 * The scoring keypad (README §Flagship): digits + – + F in the left three
 * columns; X and / double-height in the fourth. Context-aware legality —
 * illegal keys are visually disabled BEFORE the tap, never an error after.
 */
export default function Keypad({ legal, onRoll }: { legal: Set<Roll>; onRoll: (roll: Roll) => void }) {
  const key = (label: string, roll: Roll, opts?: { area?: string; glyph?: string; big?: boolean }) => {
    const enabled = legal.has(roll);
    return (
      <button
        key={`${label}`}
        type="button"
        disabled={!enabled}
        aria-label={label === '–' ? 'Miss' : label === 'F' ? 'Foul' : label}
        onClick={() => onRoll(roll)}
        className={`rounded-lg font-display font-bold transition-transform duration-75 ${
          opts?.big ? 'text-[24px]' : 'text-[18px]'
        } ${opts?.area ?? ''} ${
          enabled
            ? `border border-line bg-well active:scale-[.97] ${opts?.glyph ?? 'text-text'}`
            : 'border border-hairline bg-well text-disabled'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-[repeat(3,1fr)_1.2fr] grid-rows-[repeat(4,52px)] gap-2">
      {key('X', 'X', { area: '[grid-area:1/4/3/5]', glyph: 'text-mark', big: true })}
      {key('/', '/', { area: '[grid-area:3/4/5/5]', glyph: 'text-mark glow-mark', big: true })}
      {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((n) => key(String(n), n))}
      {key('0', 0)}
      {key('–', 0)}
      {key('F', 'F', { glyph: 'text-signal' })}
    </div>
  );
}
