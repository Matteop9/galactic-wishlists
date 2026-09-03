import type { Roll } from '../engine';

/**
 * The scoring keypad: digits, miss and foul in the left three columns; X and /
 * double-height in the fourth. Context-aware legality: illegal keys are
 * disabled before the tap, never an error after. Disabled is the token pair,
 * not opacity.
 */
export default function Keypad({ legal, onRoll }: { legal: Set<Roll>; onRoll: (roll: Roll) => void }) {
  const key = (label: string, roll: Roll, opts?: { area?: string; glyph?: string; big?: boolean }) => {
    const enabled = legal.has(roll);
    return (
      <button
        key={`${label}`}
        type="button"
        disabled={!enabled}
        aria-label={label === '-' ? 'Miss' : label === 'F' ? 'Foul' : label}
        onClick={() => onRoll(roll)}
        className={`num press rounded-r2 border font-medium ${opts?.big ? 'text-[26px]' : 'text-[20px]'} ${
          opts?.area ?? ''
        } ${
          enabled
            ? `border-rule bg-sheet ${opts?.glyph ?? 'text-ink'}`
            : 'border-transparent bg-disabled-bg text-disabled-fg'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-[repeat(3,1fr)_1.2fr] grid-rows-[repeat(4,52px)] gap-2">
      {key('X', 'X', { area: '[grid-area:1/4/3/5]', glyph: 'text-red', big: true })}
      {key('/', '/', { area: '[grid-area:3/4/5/5]', glyph: 'text-blue', big: true })}
      {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((n) => key(String(n), n))}
      {key('0', 0)}
      {key('-', 0)}
      {key('F', 'F', { glyph: 'text-red' })}
    </div>
  );
}
