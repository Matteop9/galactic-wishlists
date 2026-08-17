import { fmtShare, fmtValue, ordinal } from '../lib/format'
import type { SummaryRow } from '../lib/engine/report'
import { directionClass } from './direction'

interface Props {
  rows: SummaryRow[]
  activeLeagueId: string
  onSelect: (leagueId: string) => void
}

export function SummaryTable({ rows, activeLeagueId, onSelect }: Props) {
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
              <tr key={row.leagueId} className={row.leagueId === activeLeagueId ? 'active-row' : ''}>
                <td>
                  <button className="link-btn" onClick={() => onSelect(row.leagueId)}>
                    {row.label}
                  </button>
                </td>
                <td>
                  <span className={directionClass(row.direction)}>{row.direction}</span>
                  {row.manual && <span className="dim small"> (manual)</span>}
                </td>
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
