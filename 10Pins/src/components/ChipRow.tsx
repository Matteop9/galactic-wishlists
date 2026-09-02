export interface ChipOption {
  value: string;
  label: string;
}

/**
 * A radiogroup of pills (or, with `fill`, an equal-width segmented control).
 * Active idiom matches the "Series" picker in `MatchDaySetup.tsx`:
 * `border-phosphor/50 bg-phosphor/10 text-phosphor` vs `border-line bg-panel text-dim`.
 */
export default function ChipRow({
  label,
  options,
  value,
  onChange,
  fill = false,
}: {
  label: string;
  options: ChipOption[];
  value: string;
  onChange: (v: string) => void;
  fill?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={
        fill
          ? 'flex gap-2'
          : 'flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      }
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`press border text-[12.5px] font-bold ${
              fill ? 'flex-1 rounded-control py-2' : 'shrink-0 rounded-full px-3 py-1.5'
            } ${active ? 'border-phosphor/50 bg-phosphor/10 text-phosphor' : 'border-line bg-panel text-dim'}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
