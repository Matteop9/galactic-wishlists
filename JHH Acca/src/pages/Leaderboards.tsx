import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ALL_TIME,
  fetchAllTeamWeekScores,
  fetchCurrentGameweek,
  fetchFormGrid,
  fetchGameweeks,
  fetchLeaderboard,
  fetchLiveStatuses,
  fetchPickScores,
  fetchSeasonLeaderboard,
  fetchSeasons,
  fetchTeamLeaderboard,
} from '../lib/queries'
import { usePlayer } from '../hooks/usePlayer'
import { odds2, score2 } from '../lib/format'
import FormGrid from '../components/FormGrid'
import GwHistoryChart from '../components/GwHistoryChart'
import TugBar from '../components/TugBar'
import RequireAuth from '../components/RequireAuth'
import { PageTitle, SandboxChip, teamColor } from '../components/ui'
import type { LeaderboardRow, Season } from '../lib/types'

type SortKey = 'entries' | 'wins' | 'score' | 'spm'

function SortHeader({
  label,
  col,
  sort,
  onSort,
  className = 'text-right',
}: {
  label: string
  col: SortKey
  sort: { key: SortKey | null; asc: boolean }
  onSort: (k: SortKey) => void
  className?: string
}) {
  const active = sort.key === col
  return (
    <button
      onClick={() => onSort(col)}
      className={`${className} font-mono text-[8.5px] uppercase tracking-[0.12em]`}
      style={{ color: active ? 'var(--color-accent)' : 'var(--color-muted)' }}
    >
      {label}
      {active ? (sort.asc ? ' ▲' : ' ▼') : ''}
    </button>
  )
}

type Tab =
  | { kind: 'all' }
  | { kind: 'season'; season: Season }
  | { kind: 'test'; season: Season }
  | { kind: 'custom' }

function tabLabel(t: Tab) {
  if (t.kind === 'all') return 'All Time'
  if (t.kind === 'custom') return 'Custom'
  return t.season.name
}

function LeaderboardsInner() {
  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: fetchSeasons })
  const { data: allGws } = useQuery({ queryKey: ['gameweeks'], queryFn: fetchGameweeks })
  const today = new Date().toISOString().slice(0, 10)

  const tabs = useMemo<Tab[]>(() => {
    if (!seasons) return [{ kind: 'all' }]
    const hasData = (s: Season) =>
      (allGws ?? []).some((g) => g.season_id === s.id && ['settled', 'closed'].includes(g.status))
    const current = seasons.find(
      (s) => s.kind === 'league' && s.start_date <= today && s.end_date >= today,
    )
    const past = seasons
      .filter((s) => s.kind !== 'test' && s.id !== current?.id && s.start_date <= today && hasData(s))
      .sort((a, b) => b.start_date.localeCompare(a.start_date))
    const test = seasons.filter((s) => s.kind === 'test' && s.start_date <= today)
    return [
      ...(current ? [{ kind: 'season' as const, season: current }] : []),
      { kind: 'all' as const },
      ...past.map((season) => ({ kind: 'season' as const, season })),
      ...test.map((season) => ({ kind: 'test' as const, season })),
      { kind: 'custom' as const },
    ]
  }, [seasons, allGws, today])

  const [tabIdx, setTabIdx] = useState(0)
  const [customStart, setCustomStart] = useState('2026-06-01')
  const [customEnd, setCustomEnd] = useState(today)
  const tab = tabs[Math.min(tabIdx, tabs.length - 1)] ?? { kind: 'all' as const }

  // provisional live overlay - only meaningful while a live gameweek is closed
  const { me, players } = usePlayer()
  const [liveOn, setLiveOn] = useState<boolean | null>(null)
  const { data: currentGw } = useQuery({ queryKey: ['currentGw'], queryFn: fetchCurrentGameweek })
  const liveGw = currentGw?.status === 'closed' && currentGw.live_enabled ? currentGw : null
  const { data: liveStatuses } = useQuery({
    queryKey: ['live', liveGw?.id],
    queryFn: () => fetchLiveStatuses(liveGw!.id),
    enabled: !!liveGw,
    refetchInterval: 60_000,
  })
  const { data: livePicks } = useQuery({
    queryKey: ['pickScores', liveGw?.id],
    queryFn: () => fetchPickScores(liveGw!.id),
    enabled: !!liveGw,
  })
  const showLiveToggle = !!liveGw && (liveStatuses ?? []).some((l) => !['NO_LIVE', 'NOT_STARTED'].includes(l.live_state))
  const liveActive = (liveOn ?? me?.live_table_default ?? false) && showLiveToggle
  const provisionalFor = (playerId: string) => {
    if (!liveActive) return 0
    return (livePicks ?? [])
      .filter((p) => p.player_id === playerId && p.result == null)
      .filter((p) => ['WINNING', 'LANDED'].includes(liveStatuses?.find((l) => l.pick_id === p.id)?.live_state ?? ''))
      .reduce((s, p) => s + Number(p.odds), 0)
  }
  const darkLegs = (livePicks ?? []).filter(
    (p) => p.result == null && (liveStatuses?.find((l) => l.pick_id === p.id)?.live_state ?? 'NO_LIVE') === 'NO_LIVE',
  ).length

  const range: [string, string] =
    tab.kind === 'all'
      ? ALL_TIME
      : tab.kind === 'custom'
        ? [customStart, customEnd]
        : [tab.season.start_date, tab.season.end_date]

  const { data: rows } = useQuery({
    queryKey: ['leaderboard', range[0], range[1]],
    queryFn: () => fetchLeaderboard(range[0], range[1]),
    enabled: tab.kind !== 'test',
  })
  const { data: teamRows } = useQuery({
    queryKey: ['teamLeaderboard', range[0], range[1]],
    queryFn: () => fetchTeamLeaderboard(range[0], range[1]),
    enabled: tab.kind !== 'test',
  })
  const { data: testRows } = useQuery({
    queryKey: ['seasonLeaderboard', tab.kind === 'test' ? tab.season.id : ''],
    queryFn: () => fetchSeasonLeaderboard((tab as Extract<Tab, { kind: 'test' }>).season.id),
    enabled: tab.kind === 'test',
  })
  const { data: formCells } = useQuery({ queryKey: ['formGrid'], queryFn: () => fetchFormGrid(5) })
  const { data: allTws } = useQuery({ queryKey: ['allTeamWeekScores'], queryFn: fetchAllTeamWeekScores })

  // column sorting — default ranks All Time by score-per-match, else by score
  const [sort, setSort] = useState<{ key: SortKey | null; asc: boolean }>({ key: null, asc: false })
  const onSort = (k: SortKey) =>
    setSort((s) =>
      s.key !== k ? { key: k, asc: false } : s.asc ? { key: null, asc: false } : { key: k, asc: true },
    )
  const rankByScorePerMatch = tab.kind === 'all'
  const colValue = (r: LeaderboardRow, k: SortKey) =>
    k === 'entries' ? r.entries : k === 'wins' ? r.wins : k === 'score' ? Number(r.score) : Number(r.score_per_match ?? -1)
  const sorted = [...(rows ?? [])].sort((a, b) => {
    if (sort.key) {
      const d = colValue(b, sort.key) - colValue(a, sort.key)
      return sort.asc ? -d : d
    }
    return rankByScorePerMatch
      ? (b.score_per_match ?? 0) - (a.score_per_match ?? 0)
      : b.score - a.score
  })
  const vdl = teamRows?.find((t) => t.acca_team === 'VDL')?.score ?? 0
  const jhp = teamRows?.find((t) => t.acca_team === 'JHP')?.score ?? 0

  // GW history: per-week VDL v JHP margins within the selected range
  const gwHistory = useMemo(() => {
    if (!allTws || !allGws || !seasons) return []
    const testSeasons = new Set(seasons.filter((s) => s.kind === 'test').map((s) => s.id))
    return (allGws ?? [])
      .filter(
        (g) =>
          g.status === 'settled' &&
          !testSeasons.has(g.season_id) &&
          g.gw_date >= range[0] &&
          g.gw_date <= range[1],
      )
      .map((g) => {
        const week = allTws.filter((w) => w.gameweek_id === g.id)
        return {
          gameweek_id: g.id,
          gw_date: g.gw_date,
          vdl: Number(week.find((w) => w.team_name === 'VDL')?.week_score ?? 0),
          jhp: Number(week.find((w) => w.team_name === 'JHP')?.week_score ?? 0),
        }
      })
  }, [allTws, allGws, seasons, range[0], range[1]])

  const testSorted = [...(testRows ?? [])].sort((a, b) => b.score - a.score)
  const testTeams = new Map<string, number>()
  for (const r of testRows ?? []) testTeams.set(r.team_name, (testTeams.get(r.team_name) ?? 0) + r.score)

  return (
    <div className="px-4 pb-6">
      <PageTitle right={tab.kind === 'test' ? <SandboxChip /> : undefined}>STANDINGS</PageTitle>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
        {tabs.map((t, i) => (
          <button
            key={tabLabel(t)}
            onClick={() => setTabIdx(i)}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
            style={
              i === tabIdx
                ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' }
                : { border: '1px solid var(--color-line-strong)', color: 'var(--color-muted)' }
            }
          >
            {tabLabel(t)}
          </button>
        ))}
      </div>

      {tab.kind === 'custom' && (
        <div className="mb-3 flex items-center gap-2">
          {[
            { v: customStart, set: setCustomStart },
            { v: customEnd, set: setCustomEnd },
          ].map((f, i) => (
            <input
              key={i}
              type="date"
              value={f.v}
              onChange={(e) => f.set(e.target.value)}
              className="flex-1 rounded-[10px] border bg-surface-2 px-3 py-2 text-[13px]"
              style={{ borderColor: 'var(--color-line-strong)', colorScheme: 'dark' }}
            />
          ))}
        </div>
      )}

      {tab.kind !== 'test' && (
        <div className="mb-4 rounded-[14px] bg-surface p-3.5">
          <TugBar vdl={vdl} jhp={jhp} />
        </div>
      )}

      {showLiveToggle && tab.kind !== 'test' && (
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="overline">PROVISIONAL LIVE TABLE</span>
          <button
            onClick={() => setLiveOn(!liveActive)}
            className="rounded-full border px-3 py-1 font-mono text-[10px] font-bold"
            style={
              liveActive
                ? { background: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: 'var(--color-on-accent)' }
                : { borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }
            }
          >
            {liveActive ? 'LIVE ON' : 'LIVE OFF'}
          </button>
        </div>
      )}

      {tab.kind === 'test' ? (
        <div className="rounded-[14px] bg-surface">
          <div className="grid grid-cols-[24px_1fr_44px_56px_48px] gap-2 border-b px-3.5 py-2 font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted" style={{ borderColor: 'var(--color-line)' }}>
            <span>#</span><span>Player</span><span className="text-right">W</span><span className="text-right">Score</span><span className="text-right">S/M</span>
          </div>
          {testSorted.map((r, i) => (
            <div key={r.player_id} className="grid grid-cols-[24px_1fr_44px_56px_48px] items-center gap-2 border-b px-3.5 py-2.5" style={{ borderColor: 'var(--color-line)' }}>
              <span className="font-mono text-[11px] text-muted">{i + 1}</span>
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                <span style={{ color: teamColor(players.find((p) => p.id === r.player_id)?.acca_team ?? '') }}>
                  {r.name}
                </span>
                <span className="text-[10px] text-muted">{r.team_name}</span>
              </span>
              <span className="text-right font-mono text-[12px]">{r.wins}</span>
              <span className="text-right font-mono text-[13px] font-bold">{score2(r.score)}</span>
              <span className="text-right font-mono text-[11px] text-muted">{odds2(r.score_per_match)}</span>
            </div>
          ))}
          {testSorted.length === 0 && (
            <div className="p-6 text-center text-sm text-muted">Nothing settled in the sandbox yet.</div>
          )}
        </div>
      ) : (
        <div className="rounded-[14px] bg-surface">
          <div className="grid grid-cols-[24px_1fr_30px_44px_56px_48px] gap-2 border-b px-3.5 py-2 font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted" style={{ borderColor: 'var(--color-line)' }}>
            <span>#</span><span>Player</span>
            <SortHeader label="P" col="entries" sort={sort} onSort={onSort} />
            <SortHeader label="W" col="wins" sort={sort} onSort={onSort} />
            <SortHeader label="Score" col="score" sort={sort} onSort={onSort} />
            <SortHeader label="S/M" col="spm" sort={sort} onSort={onSort} />
          </div>
          {sorted.map((r, i) => {
            const leader = i === 0
            return (
              <Link
                to={`/players/${r.player_id}`}
                key={r.player_id}
                className="grid grid-cols-[24px_1fr_30px_44px_56px_48px] items-center gap-2 border-b px-3.5 py-2.5"
                style={{
                  borderColor: 'var(--color-line)',
                  background: leader ? 'rgba(180,227,61,0.05)' : undefined,
                }}
              >
                <span className="font-mono text-[11px]" style={{ color: leader ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                  {i + 1}
                </span>
                <span
                  className="truncate text-[12.5px] font-semibold"
                  style={{ color: teamColor(r.acca_team) }}
                >
                  {r.name}
                </span>
                <span className="text-right font-mono text-[11px] text-muted">{r.entries}</span>
                <span className="text-right font-mono text-[12px]">{r.wins}</span>
                <span className="text-right font-mono text-[13px] font-bold">
                  {score2(r.score)}
                  {liveActive && provisionalFor(r.player_id) > 0 && (
                    <span className="block text-[9px] font-semibold italic" style={{ color: 'var(--color-accent)' }}>
                      +{score2(provisionalFor(r.player_id))} LIVE
                    </span>
                  )}
                </span>
                <span
                  className="text-right font-mono text-[11px]"
                  style={{ color: rankByScorePerMatch ? 'var(--color-text)' : 'var(--color-muted)' }}
                >
                  {r.score_per_match == null ? '–' : Number(r.score_per_match).toFixed(4)}
                </span>
              </Link>
            )
          })}
          {sorted.length === 0 && (
            <div className="p-6 text-center text-sm text-muted">No settled picks in this range.</div>
          )}
          {liveActive && darkLegs > 0 && (
            <div className="border-t px-3.5 py-2 text-[10px] italic text-muted" style={{ borderColor: 'var(--color-line)' }}>
              Provisional — {darkLegs} pick{darkLegs > 1 ? 's have' : ' has'} no live data; sweep
              doubles are never shown provisionally.
            </div>
          )}
        </div>
      )}

      {tab.kind !== 'test' && (
        <div className="mt-5">
          <div className="overline mb-2 px-1">GW HISTORY — WEEKLY MARGIN</div>
          <div className="rounded-[14px] bg-surface p-3.5">
            <GwHistoryChart rows={gwHistory} />
          </div>
        </div>
      )}

      {tab.kind !== 'test' && formCells && formCells.length > 0 && (
        <div className="mt-5">
          <div className="overline mb-2 px-1">FORM — LAST 5 GAMEWEEKS</div>
          <div className="rounded-[14px] bg-surface p-3.5">
            <FormGrid cells={formCells} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function Leaderboards() {
  return (
    <RequireAuth>
      <LeaderboardsInner />
    </RequireAuth>
  )
}
