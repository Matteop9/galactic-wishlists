import { fmtShare, fmtValue, ordinal } from '../lib/format'
import type { SummaryRow } from '../lib/engine/report'
import { directionClass } from './direction'

export function SummaryTable({ rows }: { rows: SummaryRow[] }) {
  return (
    <div className="card summary-table">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>League</th>
              <th>Direction</th>
              <th className="num">Starter rank</th>
              <th className="num">Youth share</th>
              <th className="num">Pick capital</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.leagueId}>
                <td>
                  <a href={`#league-${row.leagueId}`}>{row.label}</a>
                </td>
                <td className={directionClass(row.direction)}>{row.direction}</td>
                <td className="num">
                  {ordinal(row.starterRank)} <span className="dim">of {row.numTeams}</span>
                </td>
                <td className="num">{fmtShare(row.youthShare)}</td>
                <td className="num">
                  {fmtValue(row.pickCapitalValue)} <span className="dim">({ordinal(row.pickCapitalRank)})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
