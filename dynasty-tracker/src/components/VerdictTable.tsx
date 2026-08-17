import { fmtTrend, fmtValue } from '../lib/format'
import type { VerdictRow } from '../lib/engine/verdicts'

export function VerdictTable({ rows }: { rows: VerdictRow[] }) {
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Pos</th>
              <th className="num">Age</th>
              <th className="num">Adj value</th>
              <th className="num hide-narrow">30d</th>
              <th>Verdict</th>
              <th>Counterparty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId}>
                <td>{row.name}</td>
                <td>{row.position}</td>
                <td className="num">{row.ageEstimated ? `~${row.age}` : row.age}</td>
                <td className="num">{fmtValue(row.adjValue)}</td>
                <td
                  className={`num hide-narrow ${
                    (row.trend30Day ?? 0) > 0 ? 'trend-up' : (row.trend30Day ?? 0) < 0 ? 'trend-down' : 'dim'
                  }`}
                >
                  {fmtTrend(row.trend30Day)}
                </td>
                <td>
                  <span className={row.verdict === 'Sell' ? 'verdict-sell' : 'verdict-hold'}>{row.verdict}</span>
                  <span className="dim"> — {row.reason}</span>
                </td>
                <td className="small">{row.counterparty ?? <span className="dim">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
