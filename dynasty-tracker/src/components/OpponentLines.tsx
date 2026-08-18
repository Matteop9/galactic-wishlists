import { useState } from 'react'
import type { Direction } from '../lib/engine/direction'
import type { OpponentLine } from '../lib/engine/report'
import { intelKey, type IntelMap } from '../lib/intel'
import { directionClass } from './direction'
import { DirectionSelect } from './DirectionSelect'
import { HoverCard } from './HoverCard'

interface Props {
  leagueId: string
  opponents: OpponentLine[]
  intel: IntelMap
  onOverride: (rosterId: number, direction: Direction | null) => void
  onIntel: (rosterId: number, text: string) => void
}

export function OpponentLines({ leagueId, opponents, intel, onOverride, onIntel }: Props) {
  const [editing, setEditing] = useState<number | null>(null)

  return (
    <div className="card">
      <ul className="opponent-lines">
        {opponents.map((opponent) => {
          const note = intel[intelKey(leagueId, opponent.rosterId)] ?? ''
          return (
            <li key={opponent.rosterId}>
              <div className="opponent-row">
                <HoverCard
                  className="opponent-name"
                  pinned={editing === opponent.rosterId}
                  summary={
                    <>
                      <span className="who">{opponent.ownerName}</span>{' '}
                      <span className={`small ${directionClass(opponent.direction)}`}>{opponent.direction}</span>
                      {note.trim() !== '' && <span className="dot dot-intel" title="Has intel" />}
                    </>
                  }
                >
                  <div className="pop-line">{opponent.line}</div>
                  <div className="pop-label">Intel</div>
                  <textarea
                    rows={3}
                    value={note}
                    placeholder="Paste chat or notes — what they want, how they rate their team, trades off the menu."
                    onFocus={() => setEditing(opponent.rosterId)}
                    onBlur={() => setEditing(null)}
                    onChange={(e) => onIntel(opponent.rosterId, e.target.value)}
                  />
                </HoverCard>
                <DirectionSelect
                  direction={opponent.direction}
                  autoDirection={opponent.autoDirection}
                  manual={opponent.manual}
                  onChange={(direction) => onOverride(opponent.rosterId, direction)}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
