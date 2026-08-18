import { useEffect, useMemo, useState } from 'react'
import { buildSnapshot } from './lib/api/buildSnapshot'
import { leaguesConfig, thresholds } from './lib/config'
import { adjustedValue } from './lib/engine/adjust'
import type { Direction } from './lib/engine/direction'
import { buildExposure } from './lib/engine/exposure'
import type { MarketPlayer } from './lib/engine/tradeCheck'
import { buildReport, type DirectionOverrides, type LeagueReport } from './lib/engine/report'
import type { Dispute, DisputeMap, VerdictKind, VerdictRow } from './lib/engine/verdicts'
import { buildMarkdown } from './lib/report/markdown'
import { buildTrainingReport } from './lib/report/training'
import { loadIntel, withIntel, type IntelMap } from './lib/intel'
import { loadActiveLeague, loadOverrides, saveActiveLeague, withOverride } from './lib/overrides'
import { loadDisputes, withDispute, withoutDispute } from './lib/training'
import { latestSnapshot, loadPlayers } from './lib/snapshots'
import type { PlayersFile, Snapshot } from './lib/types'
import { Header } from './components/Header'
import { SummaryTable } from './components/SummaryTable'
import { LeagueSection } from './components/LeagueSection'
import { CrossLeagueView } from './components/CrossLeagueView'

const ALL_LEAGUES = '__all__'

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
  const [intel, setIntel] = useState<IntelMap>(() => loadIntel())
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

  const isAllView = activeLeague === ALL_LEAGUES
  const exposure = useMemo(
    () => (isAllView && active && players && report ? buildExposure(active, players, report, thresholds) : null),
    [isAllView, active, players, report],
  )

  const currentLeague: LeagueReport | null = useMemo(() => {
    if (!report || report.leagues.length === 0 || isAllView) return null
    return report.leagues.find((l) => l.leagueId === activeLeague) ?? report.leagues[0]
  }, [report, activeLeague, isAllView])

  // The current league's opposing rosters as a searchable pool for Trade check.
  const marketPool = useMemo<MarketPlayer[]>(() => {
    if (!active || !players || !currentLeague) return []
    const league = active.leagues.find((l) => l.leagueId === currentLeague.leagueId)
    if (!league) return []
    const fcMap = active.fantasyCalc[league.fantasyCalcVariant]
    const out: MarketPlayer[] = []
    for (const roster of league.rosters) {
      if (roster.rosterId === currentLeague.myProfile.rosterId) continue
      const holderName = currentLeague.rosterOwners[roster.rosterId] ?? 'Unclaimed team'
      for (const id of roster.players) {
        const fc = fcMap[id]
        if (!fc) continue
        const info = players.players[id]
        out.push({
          playerId: id,
          name: info?.name ?? fc.name,
          position: info?.position ?? fc.position,
          age: info?.age ?? fc.age ?? thresholds.ageBands.defaultAge,
          fc,
          adjValue: adjustedValue(fc, league.settings.derived, thresholds),
          holderName,
        })
      }
    }
    return out.sort((a, b) => b.adjValue - a.adjValue)
  }, [active, players, currentLeague])

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
    await navigator.clipboard.writeText(buildMarkdown(report, intel))
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
      {report && (
        <>
          <SummaryTable
            rows={report.summary}
            activeLeagueId={currentLeague?.leagueId ?? ''}
            onSelect={selectLeague}
          />
          <nav className="tabs">
            <button
              className={`tab ${isAllView ? 'active' : ''}`}
              onClick={() => selectLeague(ALL_LEAGUES)}
            >
              All leagues
            </button>
            {report.leagues.map((league) => (
              <button
                key={league.leagueId}
                className={`tab ${league.leagueId === currentLeague?.leagueId ? 'active' : ''}`}
                onClick={() => selectLeague(league.leagueId)}
              >
                {league.label}
              </button>
            ))}
          </nav>
          {isAllView && exposure && <CrossLeagueView exposure={exposure} />}
          {currentLeague && (
            <LeagueSection
              league={currentLeague}
              pool={marketPool}
              intel={intel}
              onOverride={overrideDirection}
              onDispute={(row, desired, note) => disputeVerdict(currentLeague, row, desired, note)}
              onClearDispute={(playerId) => clearDispute(currentLeague.leagueId, playerId)}
              onIntel={(rosterId, text) => setIntel(withIntel(intel, currentLeague.leagueId, rosterId, text))}
            />
          )}
        </>
      )}
    </div>
  )
}
