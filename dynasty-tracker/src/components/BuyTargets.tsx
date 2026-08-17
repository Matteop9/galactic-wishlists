import { fmtValue } from '../lib/format'
import type { BuyTarget } from '../lib/engine/verdicts'

export function BuyTargets({ targets }: { targets: BuyTarget[] }) {
  if (targets.length === 0) {
    return (
      <div className="card dim">No targets clear the bar this week — the right assets are not for sale cheap.</div>
    )
  }
  return (
    <div className="card">
      {targets.map((target) => (
        <div className="buy-target" key={target.playerId}>
          <span className="who">
            {target.name} ({target.position}, {target.age}, {fmtValue(target.adjValue)})
          </span>{' '}
          — held by {target.holderName} ({target.holderDirection}); adds{' '}
          <strong>{fmtValue(target.marginalStarterValue)}</strong> to my starting lineup.{' '}
          <span className="dim">{target.reason}.</span>
        </div>
      ))}
    </div>
  )
}
