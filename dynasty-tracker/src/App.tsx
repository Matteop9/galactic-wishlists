import { useEffect, useMemo, useState } from 'react'
import { buildSnapshot } from './lib/api/buildSnapshot'
import { leaguesConfig, thresholds } from './lib/config'
import type { Direction } from './lib/engine/direction'
import { buildReport, type DirectionOverrides } from './lib/engine/report'
import { buildMarkdown } from './lib/report/markdown'
import { loadActiveLeague, loadOverrides, saveActiveLeague, withOverride } from './lib/overrides'
import { latestSnapshot, loadPlayers } from './lib/snapshots'
import type { PlayersFile, Snapshot } from './lib/types'
import { Header } from './components/Header'
import { SummaryTable } from './components/SummaryTable'
import { LeagueSection } from './components/LeagueSection'

export default function App() {
  const [baseline, setBaseline] = useState<Snapshot | null>(null)
  const [players, setPlayers] = useState<PlayersFile | null>(null)
  const [live, setLive] = useState<Snapshot | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [overrides, setOverrides] = useState<DirectionOverrides>(() => loadOverrides())
  const [activeLeague, setActiveLeague] = useState<string | null>(() => loadActiveLeague())

  useEffect(() => {
    const ref = latestSnapshot()
    if (!ref) {
      setError('No snapshots bundled — run npm run refresh, then rebuild.')
      return
    }
    Promise.all([ref.load(), loadPlayers(ref.season)])
      .then(([snapshot, playersFile]) => {
        setBaseline(snapshot)
        setPlayers(playersFile)
      })
      .catch((cause) => setError(String(cause)))
  }, [])

  const active = live ?? baseline
  const report = useMemo(
    () => (active && players ? buildReport(active, players, leaguesConfig, thresholds, overrides) : null),
    [active, players, overrides],
  )

  const currentLeague = useMemo(() => {
    if (!report || report.leagues.length === 0) return null
    return report.leagues.find((l) => l.leagueId === activeLeague) ?? report.leagues[0]
  }, [report, activeLeague])

  function selectLeague(leagueId: string) {
    setActiveLeague(leagueId)
    saveActiveLeague(leagueId)
  }

  function overrideDirection(leagueId: string, rosterId: number, direction: Direction | null) {
    setOverrides(withOverride(overrides, leagueId, rosterId, direction))
  }

  async function onLiveFetch() {
    setLiveLoading(true)
    setError(null)
    try {
      setLive(await buildSnapshot(leaguesConfig, thresholds))
    } catch (cause) {
      setError(`Live fetch failed: ${String(cause)}`)
    } finally {
      setLiveLoading(false)
    }
  }

  async function onCopyMarkdown() {
    if (!report) return
    await navigator.clipboard.writeText(buildMarkdown(report))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="app">
      <Header
        meta={report?.meta ?? null}
        live={live !== null}
        liveLoading={liveLoading}
        onLiveFetch={onLiveFetch}
        onCopyMarkdown={onCopyMarkdown}
        copied={copied}
      />
      {live !== null && (
        <div className="live-banner">
          Live data — viewed only, not saved as a snapshot.
          <button onClick={() => setLive(null)}>Back to snapshot</button>
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}
      {!report && !error && <div className="loading">Loading snapshot…</div>}
      {report && currentLeague && (
        <>
          <SummaryTable rows={report.summary} activeLeagueId={currentLeague.leagueId} onSelect={selectLeague} />
          <nav className="tabs">
            {report.leagues.map((league) => (
              <button
                key={league.leagueId}
                className={`tab ${league.leagueId === currentLeague.leagueId ? 'active' : ''}`}
                onClick={() => selectLeague(league.leagueId)}
              >
                {league.label}
              </button>
            ))}
          </nav>
          <LeagueSection league={currentLeague} onOverride={overrideDirection} />
        </>
      )}
    </div>
  )
}
