import { useMemo, useState } from 'react'
import type { TeamUsage } from '../lib/queries'
import { TeamBadge } from './ui'

/* Searchable team picker for the W acca (ported from The Acca): type to
   filter every known club (crest + how often the group has picked it), or
   just keep typing for a brand-new one. Free text is always allowed — the
   dropdown is a shortcut, not a gate. */

interface Props {
  value: string
  onChange: (v: string) => void
  options: TeamUsage[]
  placeholder: string
  disabled?: boolean
}

export default function TeamCombobox({ value, onChange, options, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const q = value.trim().toLowerCase()

  const filtered = useMemo(() => {
    const base = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options
    return base.slice(0, 8)
  }, [options, q])

  const exactOnly = filtered.length === 1 && filtered[0].name.toLowerCase() === q

  return (
    <div className="relative">
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        className="w-full rounded-[10px] border bg-surface-2 px-3.5 py-3 text-[15px] disabled:opacity-40"
        style={{ borderColor: 'var(--color-line-strong)' }}
      />
      {open && !disabled && filtered.length > 0 && !exactOnly && (
        <div
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-[10px] border bg-surface-2 shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
          style={{ borderColor: 'var(--color-line-strong)' }}
        >
          {filtered.map((o) => (
            <button
              key={o.name}
              type="button"
              onMouseDown={(e) => e.preventDefault() /* beat the input blur */}
              onClick={() => {
                onChange(o.name)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 border-b px-3 py-2 text-left last:border-b-0"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <TeamBadge name={o.name} size={18} />
              <span className="flex-1 truncate text-[13px] font-semibold">{o.name}</span>
              {o.uses > 0 && <span className="font-mono text-[9px] text-muted">{o.uses}×</span>}
            </button>
          ))}
          <div className="px-3 py-1.5 text-[9.5px] text-muted" style={{ borderTop: '1px solid var(--color-line)' }}>
            Team not listed? Just type the name in full.
          </div>
        </div>
      )}
    </div>
  )
}
