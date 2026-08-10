import type { ReactNode } from 'react'

/* Accent-tinted banner shell: pulsing lime dot + message + right-side mono
   text. Used for LIVE state and the pick-window countdown. */

export default function LiveBanner({
  pulse = true,
  children,
  right,
}: {
  pulse?: boolean
  children: ReactNode
  right?: ReactNode
}) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-[12px] border px-3.5 py-2.5"
      style={{
        background: 'rgba(180,227,61,0.08)',
        borderColor: 'rgba(180,227,61,0.25)',
      }}
    >
      <span
        className={`h-[7px] w-[7px] shrink-0 rounded-full ${pulse ? 'live-dot' : ''}`}
        style={{ background: 'var(--color-accent)' }}
      />
      <span className="flex-1 text-[12.5px] font-semibold" style={{ color: 'var(--color-accent-bright)' }}>
        {children}
      </span>
      {right && <span className="font-mono text-[11px] text-muted">{right}</span>}
    </div>
  )
}
