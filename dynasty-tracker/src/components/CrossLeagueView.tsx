import { fmtValue } from '../lib/format'
import type { ExposureModel, OwnedExposure } from '../lib/engine/exposure'
import { HoverCard } from './HoverCard'
import { PlayerFace } from './PlayerFace'

function verdictDot(verdict: string): string {
  if (verdict === 'Sell') return 'dot dot-sell'
  if (verdict === 'Unsure') return 'dot dot-unsure'
  return 'dot dot-hold'
}

function OwnedTile({ entry }: { entry: OwnedExposure }) {
  return (
    <HoverCard
      className="exposure-tile"
      summary={
        <>
          <PlayerFace playerId={entry.playerId} name={entry.name} position={entry.position} size={44} />
          <div className="tile-main">
            <div className="name">{entry.name}</div>
            <div className="tile-meta dim">
              {entry.position} · {entry.age}
            </div>
            <div className="dot-row">
              {entry.leagues.map((l) => (
                <span key={l.leagueId} className={verdictDot(l.verdict)} title={`${l.label}: ${l.verdict}`} />
              ))}
            </div>
          </div>
        </>
      }
    >
      <div className="pop-title">{entry.name}</div>
      {entry.leagues.map((l) => (
        <div className="pop-line" key={l.leagueId}>
          <span className={verdictDot(l.verdict)} /> {l.label}: {l.verdict} <span className="dim">({fmtValue(l.adjValue)})</span>
        </div>
      ))}
    </HoverCard>
  )
}

export function CrossLeagueView({ exposure }: { exposure: ExposureModel }) {
  const groups = new Map<number, OwnedExposure[]>()
  for (const entry of exposure.owned) {
    const list = groups.get(entry.leagues.length) ?? []
    list.push(entry)
    groups.set(entry.leagues.length, list)
  }
  const counts = [...groups.keys()].sort((a, b) => b - a)

  return (
    <section className="league-section">
      <div className="league-tags">
        Verdict per league on hover — <span className="dot dot-sell" /> sell · <span className="dot dot-unsure" /> unsure ·{' '}
        <span className="dot dot-hold" /> hold
      </div>
      {counts.map((count) => (
        <div key={count}>
          <h3>
            Owned in {count} league{count === 1 ? '' : 's'}{' '}
            <span className="dim">({groups.get(count)!.length})</span>
          </h3>
          <div className="tile-grid faces">
            {groups.get(count)!.map((entry) => (
              <OwnedTile key={entry.playerId} entry={entry} />
            ))}
          </div>
        </div>
      ))}

      <h3>Top players I own nowhere</h3>
      <div className="tile-grid faces">
        {exposure.unowned.map((entry) => (
          <HoverCard
            key={entry.playerId}
            className="exposure-tile"
            summary={
              <>
                <PlayerFace playerId={entry.playerId} name={entry.name} position={entry.position} size={44} />
                <div className="tile-main">
                  <div className="name">{entry.name}</div>
                  <div className="tile-meta dim">
                    {entry.position} · {entry.age ?? '–'} · {fmtValue(entry.value)}
                  </div>
                </div>
              </>
            }
          >
            <div className="pop-title">{entry.name}</div>
            {entry.leagues.map((l) => (
              <div className="pop-line" key={l.label}>
                {l.label}:{' '}
                {l.holder === null ? (
                  <span className="trend-up">free agent</span>
                ) : (
                  <>
                    {l.holder} <span className="dim">({l.holderDirection ?? 'unknown'})</span>
                  </>
                )}
              </div>
            ))}
          </HoverCard>
        ))}
      </div>
    </section>
  )
}
