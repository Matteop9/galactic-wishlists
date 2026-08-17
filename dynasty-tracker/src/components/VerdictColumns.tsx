import { fmtTrend, fmtValue } from '../lib/format'
import type { VerdictKind, VerdictRow } from '../lib/engine/verdicts'

const COLUMNS: { kind: VerdictKind; className: string }[] = [
  { kind: 'Sell', className: 'col-sell' },
  { kind: 'Unsure', className: 'col-unsure' },
  { kind: 'Hold', className: 'col-hold' },
]

function Card({ row }: { row: VerdictRow }) {
  const trendClass = (row.trend30Day ?? 0) > 0 ? 'trend-up' : (row.trend30Day ?? 0) < 0 ? 'trend-down' : 'dim'
  return (
    <div className="verdict-card">
      <div className="verdict-card-top">
        <span className="name">{row.name}</span>
        <span className={trendClass}>{fmtTrend(row.trend30Day)}</span>
      </div>
      <div className="verdict-card-meta dim">
        {row.position} · {row.ageEstimated ? `~${row.age}` : row.age} · {fmtValue(row.adjValue)}
      </div>
      <div className="verdict-card-reason">{row.reason}</div>
      {row.counterparty && (
        <div className="verdict-card-buyer small">
          <span className="dim">Buyer:</span> {row.counterparty}
        </div>
      )}
    </div>
  )
}

export function VerdictColumns({ rows }: { rows: VerdictRow[] }) {
  return (
    <div className="verdict-columns">
      {COLUMNS.map(({ kind, className }) => {
        const group = rows.filter((r) => r.verdict === kind)
        return (
          <div className={`verdict-column ${className}`} key={kind}>
            <div className="verdict-column-head">
              {kind} <span className="dim">({group.length})</span>
            </div>
            {group.length === 0 ? (
              <div className="dim small">Nothing here.</div>
            ) : (
              group.map((row) => <Card key={row.playerId} row={row} />)
            )}
          </div>
        )
      })}
    </div>
  )
}
