import { useEffect, useMemo, useState } from 'react'
import { buildSnapshot } from './lib/api/buildSnapshot'
import { leaguesConfig, thresholds } from './lib/config'
import type { Direction } from './lib/engine/direction'
import { buildReport, type DirectionOverrides, type LeagueReport } from './lib/engine/report'
import type { Dispute, DisputeMap, VerdictKind, VerdictRow } from './lib/engine/verdicts'
import { buildMarkdown } from './lib/report/markdown'
import { buildTrainingReport } from './lib/report/training'
import { loadActiveLeague, loadOverrides, saveActiveLeague, withOverride } from './lib/overrides'
import { loadDisputes, withDispute, withoutDispute } from './lib/training'
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
  const [trainingCopied, setTrainingCopied] = useState(false)
  const [overrides, setOverrides] = useState<DirectionOverrides>(() => loadOverrides())
  const [disputes, setDisputes] = useState<DisputeMap>(() => loadDisputes())
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
    () =>
      active && players ? buildReport(active, players, leaguesConfig, thresholds, overrides, disputes) : null,
    [active, players, overrides, disputes],
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

  function disputeVerdict(league: LeagueReport, row: VerdictRow, desired: VerdictKind, note: string) {
    if (!report) return
    const dispute: Dispute = {
      leagueId: league.leagueId,
      playerId: row.playerId,
      desiredVerdict: desired,
      note,
      createdAt: new Date().toISOString(),
      context: {
        playerName: row.name,
        position: row.position,
        age: row.age,
        adjValue: row.adjValue,
        trend30Day: row.trend30Day,
        archetype: row.archetype,
        myDirection: league.myDirection,
        engineVerdict: row.verdict,
        engineReason: row.reason,
        season: report.meta.season,
        kind: report.meta.kind,
        week: report.meta.week,
      },
    }
    setDisputes(withDispute(disputes, dispute))
  }

  function clearDispute(leagueId: string, playerId: string) {
    setDisputes(withoutDispute(disputes, leagueId, playerId))
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

  async function onCopyTraining() {
    if (!report) return
    await navigator.clipboard.writeText(buildTrainingReport(report, disputes))
    setTrainingCopied(true)
    setTimeout(() => setTrainingCopied(false), 2000)
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
        trainingCount={Object.keys(disputes).length}
        onCopyTraining={onCopyTraining}
        trainingCopied={trainingCopied}
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
          <LeagueSection
            league={currentLeague}
            onOverride={overrideDirection}
            onDispute={(row, desired, note) => disputeVerdict(currentLeague, row, desired, note)}
            onClearDispute={(playerId) => clearDispute(currentLeague.leagueId, playerId)}
          />
        </>
      )}
    </div>
  )
}
