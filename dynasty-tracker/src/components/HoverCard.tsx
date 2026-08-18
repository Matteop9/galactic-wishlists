import { useState, type ReactNode } from 'react'

interface Props {
  summary: ReactNode
  children: ReactNode
  className?: string
  // Keeps the popover open regardless of hover — used while a form inside it is active.
  pinned?: boolean
}

// The detail-on-demand primitive: the summary stays compact, the full text
// lives in a popover shown on hover (desktop) or tap (mobile).
export function HoverCard({ summary, children, className = '', pinned = false }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`hover-card ${open || pinned ? 'open' : ''} ${className}`}>
      <div className="hover-trigger" onClick={() => setOpen((o) => !o)}>
        {summary}
      </div>
      <div className="hover-pop" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
