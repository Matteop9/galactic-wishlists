import type { FormCell } from '../lib/types'
import { dayMonth } from '../lib/format'
import { teamColor } from './ui'

/* Design guide §3 form grid: 26x24px cells, solid fills, mono values,
   gold column header on sweep weeks, four-swatch legend always shown. */

const cellStyle = (v: number) => {
  if (v === 2) return { background: 'var(--color-gold)', color: 'var(--color-on-gold)' }
  if (v === 1) return { background: 'var(--color-win-solid)', color: '#EAF0E6' }
  if (v === -2) return { background: 'var(--color-nopick)', color: 'var(--color-nopick-text)' }
  return { background: 'var(--color-loss-solid)', color: '#EAF0E6' }
}
const cellLabel = (v: number) => (v === 2 ? '2' : v > 0 ? `+${v}` : `${v}`)

export default function FormGrid({ cells }: { cells: FormCell[] }) {
  const dates = [...new Set(cells.map((c) => c.gw_date))].sort()
  const sweepDates = new Set(cells.filter((c) => c.week_has_sweep).map((c) => c.gw_date))
  const players = [...new Map(cells.map((c) => [c.player_id, c])).values()].sort((a, b) =>
    a.acca_team === b.acca_team ? a.name.localeCompare(b.name) : a.acca_team === 'VDL' ? -1 : 1,
  )
  const byKey = new Map(cells.map((c) => [`${c.player_id}|${c.gw_date}`, c]))

  return (
    <div>
      <div className="grid gap-y-1" style={{ gridTemplateColumns: `52px repeat(${dates.length}, 26px) 1fr` }}>
        <div />
        {dates.map((d) => (
          <div
            key={d}
            className="pb-1 text-center font-mono text-[8px]"
            style={{ color: sweepDates.has(d) ? 'var(--color-gold)' : 'var(--color-muted)' }}
          >
            {dayMonth(d)}
          </div>
        ))}
        <div className="pb-1 pr-1 text-right font-mono text-[8px] text-muted">FORM</div>

        {players.map((p) => {
          const good = dates.filter((d) => {
            const c = byKey.get(`${p.player_id}|${d}`)
            return c && c.form_value >= 1
          }).length
          return (
            <FragmentRow key={p.player_id}>
              <div className="truncate pr-1 text-[11px] font-semibold leading-6" style={{ color: teamColor(p.acca_team) }}>
                {p.name}
              </div>
              {dates.map((d) => {
                const c = byKey.get(`${p.player_id}|${d}`)
                return c ? (
                  <div
                    key={d}
                    className="mx-auto flex h-6 w-[26px] items-center justify-center rounded-[5px] font-mono text-[9px] font-semibold"
                    style={cellStyle(c.form_value)}
                  >
                    {cellLabel(c.form_value)}
                  </div>
                ) : (
                  <div key={d} className="mx-auto h-6 w-[26px] rounded-[5px]" style={{ background: 'var(--color-surface-2)' }} />
                )
              })}
              <div
                className="pr-1 text-right font-mono text-[11px] font-semibold leading-6"
                style={{ color: good === dates.length && dates.length > 0 ? 'var(--color-accent)' : undefined }}
              >
                {good}/{dates.length}
              </div>
            </FragmentRow>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {[
          { v: 1, label: 'Won' },
          { v: 2, label: 'Team sweep' },
          { v: -1, label: 'Lost' },
          { v: -2, label: 'No pick' },
        ].map((l) => (
          <span key={l.v} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-[3px]" style={cellStyle(l.v)} />
            <span className="text-[10px] text-muted">{l.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
