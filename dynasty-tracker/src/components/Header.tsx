import { fmtDate } from '../lib/format'
import type { Snapshot } from '../lib/types'

interface Props {
  meta: Snapshot['meta'] | null
  live: boolean
  liveLoading: boolean
  onLiveFetch: () => void
  onCopyMarkdown: () => void
  copied: boolean
  trainingCount: number
  onCopyTraining: () => void
  trainingCopied: boolean
}

export function Header({
  meta,
  live,
  liveLoading,
  onLiveFetch,
  onCopyMarkdown,
  copied,
  trainingCount,
  onCopyTraining,
  trainingCopied,
}: Props) {
  let metaLine = ''
  if (meta) {
    const label = meta.kind === 'preseason' ? `Preseason baseline ${meta.season}` : `Week ${meta.week}, ${meta.season}`
    metaLine = live ? `${label} — live data` : `${label} — fetched ${fmtDate(meta.fetchedAt)}`
  }
  return (
    <header className="header">
      <h1>
        Dynasty <span>Tracker</span>
      </h1>
      {metaLine && <div className="meta">{metaLine}</div>}
      <div className="actions">
        {trainingCount > 0 && (
          <button onClick={onCopyTraining} title="Copy all disputed verdicts as a report to paste into Claude">
            {trainingCopied ? 'Copied' : `Copy training report (${trainingCount})`}
          </button>
        )}
        <button onClick={onCopyMarkdown} disabled={!meta}>
          {copied ? 'Copied' : 'Copy markdown'}
        </button>
        <button onClick={onLiveFetch} disabled={liveLoading}>
          {liveLoading ? 'Fetching…' : 'Live fetch'}
        </button>
      </div>
    </header>
  )
}
