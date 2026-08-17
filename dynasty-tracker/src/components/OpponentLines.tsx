import type { OpponentLine } from '../lib/engine/report'

export function OpponentLines({ opponents }: { opponents: OpponentLine[] }) {
  return (
    <div className="card">
      <ul className="opponent-lines">
        {opponents.map((opponent) => (
          <li key={opponent.ownerName}>
            <span className="who">{opponent.ownerName}</span>
            {opponent.line}
          </li>
        ))}
      </ul>
    </div>
  )
}
