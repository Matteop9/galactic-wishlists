import { fmtShare, fmtValue, ordinal } from '../lib/format'
import type { LeagueReport } from '../lib/engine/report'
import { directionClass } from './direction'

const ROUND_NAMES = ['', '1st', '2nd', '3rd', '4th', '5th']

export function MyProfileCard({ league }: { league: LeagueReport }) {
  const p = league.myProfile
  return (
    <div className="card">
      <div className="profile-stats">
        <div className="stat">
          <div className="label">Direction</div>
          <div className={`value ${directionClass(league.myDirection)}`}>{league.myDirection}</div>
        </div>
        <div className="stat">
          <div className="label">Starter value</div>
          <div className="value">
            {fmtValue(p.starterValue)}
            <small>{ordinal(league.myRanks.starter)}</small>
          </div>
        </div>
        <div className="stat">
          <div className="label">Total value</div>
          <div className="value">
            {fmtValue(p.totalValue)}
            <small>{ordinal(league.myRanks.total)}</small>
          </div>
        </div>
        <div className="stat">
          <div className="label">Depth value</div>
          <div className="value">{fmtValue(p.depthValue)}</div>
        </div>
        <div className="stat">
          <div className="label">Pick capital</div>
          <div className="value">
            {fmtValue(p.pickCapital.total)}
            <small>{ordinal(league.myRanks.pickCapital)}</small>
          </div>
        </div>
      </div>

      <div className="age-bar" title="Share of roster value by age band">
        <div className="young" style={{ width: `${p.ageSplit.young * 100}%` }} />
        <div className="mid" style={{ width: `${p.ageSplit.mid * 100}%` }} />
        <div className="old" style={{ width: `${p.ageSplit.old * 100}%` }} />
      </div>
      <div className="age-legend">
        <span>25 and under: {fmtShare(p.ageSplit.young)}</span>
        <span>26–28: {fmtShare(p.ageSplit.mid)}</span>
        <span>29 and over: {fmtShare(p.ageSplit.old)}</span>
      </div>

      {p.pickCapital.picks.length > 0 && (
        <ul className="pick-list">
          {p.pickCapital.picks.map((pick, i) => {
            const via =
              pick.originalRosterId === p.rosterId
                ? ''
                : ` via ${league.rosterOwners[pick.originalRosterId] ?? `roster ${pick.originalRosterId}`}`
            return (
              <li key={i}>
                {pick.season} {ROUND_NAMES[pick.round] ?? `R${pick.round}`}
                {via} · {fmtValue(pick.value)}
              </li>
            )
          })}
        </ul>
      )}

      {p.unvalued.length > 0 && (
        <p className="dim small">Not valued by FantasyCalc: {p.unvalued.join(', ')}.</p>
      )}

      <p className="direction-statement">{league.directionStatement}</p>
    </div>
  )
}
