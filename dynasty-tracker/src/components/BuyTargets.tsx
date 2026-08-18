import { fmtValue } from '../lib/format'
import type { BuyTarget } from '../lib/engine/verdicts'
import { HoverCard } from './HoverCard'
import { PlayerFace } from './PlayerFace'

export function BuyTargets({ targets }: { targets: BuyTarget[] }) {
  if (targets.length === 0) {
    return (
      <div className="card dim">No targets clear the bar this week — the right assets are not for sale cheap.</div>
    )
  }
  return (
    <div className="tile-grid">
      {targets.map((target) => (
        <HoverCard
          key={target.playerId}
          className="buy-tile"
          summary={
            <>
              <PlayerFace playerId={target.playerId} name={target.name} position={target.position} />
              <div className="tile-main">
                <div className="name">{target.name}</div>
                <div className="tile-meta dim">
                  {target.position} · {target.age} · {fmtValue(target.adjValue)}
                </div>
              </div>
              {target.marginalStarterValue > 0 && (
                <span className="gain">+{fmtValue(target.marginalStarterValue)}</span>
              )}
            </>
          }
        >
          <div className="pop-title">{target.name}</div>
          <div className="pop-line">
            Held by {target.holderName} ({target.holderDirection}).
          </div>
          {target.marginalStarterValue > 0 && (
            <div className="pop-line">Adds {fmtValue(target.marginalStarterValue)} to my starting lineup.</div>
          )}
          <div className="pop-line dim">{target.reason}.</div>
        </HoverCard>
      ))}
    </div>
  )
}
