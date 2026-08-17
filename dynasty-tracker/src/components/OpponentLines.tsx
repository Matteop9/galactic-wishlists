import type { Direction } from '../lib/engine/direction'
import type { OpponentLine } from '../lib/engine/report'
import { DirectionSelect } from './DirectionSelect'

interface Props {
  opponents: OpponentLine[]
  onOverride: (rosterId: number, direction: Direction | null) => void
}

export function OpponentLines({ opponents, onOverride }: Props) {
  return (
    <div className="card">
      <ul className="opponent-lines">
        {opponents.map((opponent) => (
          <li key={opponent.rosterId}>
            <div className="opponent-row">
              <span className="who">{opponent.ownerName}</span>
              <DirectionSelect
                direction={opponent.direction}
                autoDirection={opponent.autoDirection}
                manual={opponent.manual}
                onChange={(direction) => onOverride(opponent.rosterId, direction)}
              />
            </div>
            <div>{opponent.line}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
