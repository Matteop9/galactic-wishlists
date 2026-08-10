import { useState } from 'react'
import { Link } from 'react-router-dom'
import { dayMonth } from '../lib/format'

/* Full gameweek history as a diverging bar chart: each row is one settled
   gameweek, the bar pulls LEFT (yellow) when VDL outscored JHP that week and
   RIGHT (blue) when JHP took it. Bar length is the margin, scaled to the
   biggest margin in the visible range. */

export interface GwHistoryRow {
  gameweek_id: string
  gw_date: string
  vdl: number
  jhp: number
}

const PAGE = 12

export default function GwHistoryChart({ rows }: { rows: GwHistoryRow[] }) {
  const [shown, setShown] = useState(PAGE)
  const sorted = [...rows].sort((a, b) => b.gw_date.localeCompare(a.gw_date))
  const visible = sorted.slice(0, shown)
  const maxAbs = Math.max(0.01, ...visible.map((r) => Math.abs(r.vdl - r.jhp)))

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between font-mono text-[9px] font-semibold uppercase tracking-[0.13em]">
        <span style={{ color: 'var(--color-vdl)' }}>◀ VDL took the week</span>
        <span style={{ color: 'var(--color-jhp)' }}>JHP took the week ▶</span>
      </div>
      {visible.map((r) => {
        const margin = r.vdl - r.jhp
        const vdlWin = margin > 0
        const pct = (Math.abs(margin) / maxAbs) * 50
        const color = margin === 0 ? 'var(--color-muted)' : vdlWin ? 'var(--color-vdl)' : 'var(--color-jhp)'
        return (
          <Link
            key={r.gameweek_id}
            to={`/gameweeks/${r.gameweek_id}`}
            className="flex items-center gap-2 py-[3px]"
          >
            <span className="w-[38px] shrink-0 font-mono text-[9px] text-muted">{dayMonth(r.gw_date)}</span>
            <div className="relative h-[13px] flex-1">
              <div
                className="absolute inset-y-0 left-1/2 w-px"
                style={{ background: 'var(--color-line-strong)' }}
              />
              {margin === 0 ? (
                <div
                  className="absolute top-1/2 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ background: 'var(--color-muted)' }}
                />
              ) : (
                <div
                  className={`absolute inset-y-[2px] ${vdlWin ? 'rounded-l-[3px]' : 'rounded-r-[3px]'}`}
                  style={{
                    width: `${Math.max(pct, 1.5)}%`,
                    [vdlWin ? 'right' : 'left']: '50%',
                    background: `linear-gradient(${vdlWin ? 270 : 90}deg, ${color}, color-mix(in srgb, ${color} 45%, transparent))`,
                  }}
                />
              )}
            </div>
            <span className="w-[52px] shrink-0 text-right font-mono text-[10px] font-semibold" style={{ color }}>
              {margin === 0 ? 'level' : `${vdlWin ? '+' : '−'}${Math.abs(margin).toFixed(2)}`}
            </span>
          </Link>
        )
      })}
      {rows.length === 0 && (
        <p className="py-3 text-center text-[12px] text-muted">No settled gameweeks in this range.</p>
      )}
      {sorted.length > shown && (
        <button
          onClick={() => setShown((s) => s + 24)}
          className="mt-2 w-full rounded-[10px] border py-2 text-[11px] font-semibold"
          style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }}
        >
          Load more — showing {shown} of {sorted.length}
        </button>
      )}
    </div>
  )
}
