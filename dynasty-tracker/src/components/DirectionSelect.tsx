import type { Direction } from '../lib/engine/direction'

const DIRECTIONS: Direction[] = ['Contender', 'Ascending', 'Mushy middle', 'Rebuilding']

interface Props {
  direction: Direction
  autoDirection: Direction
  manual: boolean
  onChange: (direction: Direction | null) => void
}

// Team status control: "Auto" tracks the classifier; picking a direction pins
// it, and the choice feeds verdicts, counterparties and buy targets.
export function DirectionSelect({ direction, autoDirection, manual, onChange }: Props) {
  return (
    <select
      className="direction-select"
      value={manual ? direction : 'auto'}
      onChange={(e) => onChange(e.target.value === 'auto' ? null : (e.target.value as Direction))}
      title="Override this team's status; Auto follows the classifier"
    >
      <option value="auto">Auto — {autoDirection}</option>
      {DIRECTIONS.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  )
}
