export interface ChipOption {
  value: string;
  label: string;
}

/**
 * A radiogroup of chips (r2, ink fill when active) or, with `fill`, a
 * segmented control (r1, one ink outline, ink fill on the active segment).
 * Chips and the segmented control deliberately do not share a radius.
 */
export default function ChipRow({
  label,
  options,
  value,
  onChange,
  fill = false,
  size = 'md',
}: {
  label: string;
  options: ChipOption[];
  value: string;
  onChange: (v: string) => void;
  fill?: boolean;
  /** segmented only: `sm` is the secondary picker under a primary one */
  size?: 'md' | 'sm';
}) {
  if (fill) {
    const pad = size === 'sm' ? 'px-4 py-1.5 text-[12px]' : 'px-[18px] py-2 text-[13px]';
    return (
      <div
        role="radiogroup"
        aria-label={label}
        className={`inline-flex self-start overflow-hidden rounded-r1 border ${
          size === 'sm' ? 'border-rule' : 'border-ink'
        }`}
      >
        {options.map((opt, i) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={`press ${pad} ${i > 0 ? (size === 'sm' ? 'border-l border-rule' : 'border-l border-ink') : ''} ${
                active ? 'bg-ink font-semibold text-paper' : 'bg-transparent text-ink'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar flex gap-2 overflow-x-auto">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={active ? 'chip-active' : 'chip'}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
