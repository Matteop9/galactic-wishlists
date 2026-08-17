import { useState } from 'react'
import { fmtTrend, fmtValue } from '../lib/format'
import { effectiveVerdict, type VerdictKind, type VerdictRow } from '../lib/engine/verdicts'

const COLUMNS: { kind: VerdictKind; className: string }[] = [
  { kind: 'Sell', className: 'col-sell' },
  { kind: 'Unsure', className: 'col-unsure' },
  { kind: 'Hold', className: 'col-hold' },
]

const KINDS: VerdictKind[] = ['Sell', 'Unsure', 'Hold']

interface FormState {
  playerId: string
  desired: VerdictKind | null
  note: string
}

interface Props {
  rows: VerdictRow[]
  onDispute: (row: VerdictRow, desired: VerdictKind, note: string) => void
  onClearDispute: (playerId: string) => void
}

export function VerdictColumns({ rows, onDispute, onClearDispute }: Props) {
  const [form, setForm] = useState<FormState | null>(null)

  function renderCard(row: VerdictRow) {
    const trendClass = (row.trend30Day ?? 0) > 0 ? 'trend-up' : (row.trend30Day ?? 0) < 0 ? 'trend-down' : 'dim'
    const formOpen = form?.playerId === row.playerId
    const alternatives = KINDS.filter((k) => k !== effectiveVerdict(row))

    return (
      <div className={`verdict-card ${row.dispute ? 'disputed' : ''}`} key={row.playerId}>
        <div className="verdict-card-top">
          <span className="name">{row.name}</span>
          <span className={trendClass}>{fmtTrend(row.trend30Day)}</span>
        </div>
        <div className="verdict-card-meta dim">
          {row.position} · {row.ageEstimated ? `~${row.age}` : row.age} · {fmtValue(row.adjValue)}
        </div>

        {row.dispute ? (
          <>
            <div className={`dispute-badge ${row.dispute.engineAgrees ? 'agrees' : ''}`}>
              {row.dispute.engineAgrees ? 'Engine now agrees' : `Disputed — engine says ${row.verdict}`}
            </div>
            {!row.dispute.engineAgrees && (
              <div className="verdict-card-reason dim">Engine: {row.reason}</div>
            )}
            {row.dispute.note && <div className="verdict-card-reason">“{row.dispute.note}”</div>}
          </>
        ) : (
          <div className="verdict-card-reason">{row.reason}</div>
        )}

        {row.counterparty && effectiveVerdict(row) !== 'Hold' && (
          <div className="verdict-card-buyer small">
            <span className="dim">Buyer:</span> {row.counterparty}
          </div>
        )}

        {formOpen && form ? (
          <div className="dispute-form">
            <div className="dispute-choices">
              {alternatives.map((kind) => (
                <button
                  key={kind}
                  className={`verdict-choice ${form.desired === kind ? 'chosen' : ''}`}
                  onClick={() => setForm((f) => (f ? { ...f, desired: kind } : f))}
                >
                  {kind}
                </button>
              ))}
            </div>
            <textarea
              value={form.note}
              onChange={(e) => setForm((f) => (f ? { ...f, note: e.target.value } : f))}
              placeholder="Why? This teaches the engine."
              rows={2}
            />
            <div className="dispute-actions">
              <button
                disabled={form.desired === null}
                onClick={() => {
                  if (form.desired === null) return
                  onDispute(row, form.desired, form.note.trim())
                  setForm(null)
                }}
              >
                Save dispute
              </button>
              <button onClick={() => setForm(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="dispute-actions">
            {row.dispute ? (
              <button className="dispute-btn" onClick={() => onClearDispute(row.playerId)}>
                Clear dispute
              </button>
            ) : (
              <button
                className="dispute-btn"
                onClick={() => setForm({ playerId: row.playerId, desired: null, note: '' })}
              >
                Dispute
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="verdict-columns">
      {COLUMNS.map(({ kind, className }) => {
        const group = rows.filter((r) => effectiveVerdict(r) === kind)
        return (
          <div className={`verdict-column ${className}`} key={kind}>
            <div className="verdict-column-head">
              {kind} <span className="dim">({group.length})</span>
            </div>
            {group.length === 0 ? <div className="dim small">Nothing here.</div> : group.map(renderCard)}
          </div>
        )
      })}
    </div>
  )
}
