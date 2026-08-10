import type { LivePickStatus } from '../lib/types'

/* Live pick-status chip. "No live option" is a quiet first-class state,
   never styled as an error. */

const STYLES: Record<string, { label: string; color: string }> = {
  WINNING: { label: 'WINNING', color: 'var(--color-win)' },
  WON: { label: 'WON', color: 'var(--color-win)' },
  LANDED: { label: 'LANDED', color: 'var(--color-win)' },
  LEVEL: { label: 'LEVEL', color: 'var(--color-gold)' },
  WAITING: { label: 'WAITING', color: 'var(--color-gold)' },
  LOSING: { label: 'LOSING', color: 'var(--color-loss)' },
  LOST: { label: 'LOST', color: 'var(--color-loss)' },
  NO_LIVE: { label: 'NO LIVE OPTION', color: 'var(--color-muted)' },
  NOT_STARTED: { label: 'NOT STARTED', color: 'var(--color-muted)' },
}

export default function LivePickChip({ status }: { status: LivePickStatus }) {
  const s = STYLES[status.live_state] ?? STYLES.NO_LIVE
  const showScore =
    status.fixture_id != null &&
    !['NO_LIVE', 'NOT_STARTED'].includes(status.live_state) &&
    status.home_score != null

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="rounded-[4px] border px-1.5 py-px font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em]"
        style={{ borderColor: `color-mix(in srgb, ${s.color} 40%, transparent)`, color: s.color }}
      >
        {s.label}
      </span>
      {showScore && (
        <span className="font-mono text-[10.5px] text-muted">
          {status.home_score}–{status.away_score}
          {status.fixture_status === 'FINISHED'
            ? ' FT'
            : status.minute
              ? ` ${status.minute}'`
              : ''}
        </span>
      )}
    </span>
  )
}
