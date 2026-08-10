import { useState } from 'react'
import { CHANGELOG } from '../lib/changelog'
import { longDate } from '../lib/format'

/* Front-page changelog: the latest release is always visible, older ones
   sit behind a toggle. */

export default function WhatsNew() {
  const [showOlder, setShowOlder] = useState(false)
  const [latest, ...older] = CHANGELOG

  const Entry = ({ e }: { e: (typeof CHANGELOG)[number] }) => (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline justify-between">
        <span className="text-[12.5px] font-bold">
          {e.title}
          <span className="ml-1.5 font-mono text-[9px] font-semibold text-muted">v{e.version}</span>
        </span>
        <span className="font-mono text-[9px] text-muted">{longDate(e.date)}</span>
      </div>
      <ul className="mt-1 flex flex-col gap-0.5">
        {e.items.map((item) => (
          <li key={item} className="flex gap-1.5 text-[11.5px] text-muted">
            <span style={{ color: 'var(--color-accent)' }}>+</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="mt-1">
      <div className="overline mb-2 px-1">WHAT'S NEW</div>
      <div className="rounded-[14px] bg-surface p-3.5">
        <Entry e={latest} />
        {showOlder && older.map((e) => <Entry key={e.version} e={e} />)}
        {older.length > 0 && (
          <button
            onClick={() => setShowOlder(!showOlder)}
            className="mt-1 text-[10.5px] font-semibold underline underline-offset-2 text-muted"
          >
            {showOlder ? 'Hide older updates' : `Older updates (${older.length})`}
          </button>
        )}
      </div>
    </div>
  )
}
