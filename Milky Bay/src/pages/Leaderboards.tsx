import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  ALL_TIME,
  fetchLeaderboard,
  fetchMiniLeaderboard,
  fetchMiniLeagues,
  fetchSeasonHistory,
  fetchSeasons,
} from '../lib/queries'
import { odds2, score2 } from '../lib/format'
import { LoadFailed, Overline, PageTitle, playerColor } from '../components/ui'
import { SkeletonPanel } from '../components/Skeleton'
import { Honours, ShamedName } from '../components/Honours'
import { usePlayer } from '../hooks/usePlayer'

type Tab = 'season' | 'mini' | 'alltime' | 'history' | 'custom'

export default function Leaderboards() {
  const [tab, setTab] = useState<Tab>('season')
  const [miniId, setMiniId] = useState<string | null>(null)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const { players } = usePlayer()
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '…'
  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: fetchSeasons,
    staleTime: 5 * 60_000,
  })
  const { data: minis } = useQuery({ queryKey: ['miniLeagues'], queryFn: fetchMiniLeagues })

  const today = new Date().toISOString().slice(0, 10)
  const season =
    (seasons ?? []).find((s) => s.start_date <= today && today <= s.end_date) ??
    (seasons ?? [])[(seasons ?? []).length - 1]

  const range: [string, string] | null =
    tab === 'alltime'
      ? ALL_TIME
      : tab === 'custom'
        ? customStart && customEnd
          ? [customStart, customEnd]
          : null
        : season
          ? [season.start_date, season.end_date]
          : null

  /* These re-key when the user touches a tab or a date on this very screen, so
     they hold the old rows and dim rather than emptying the table. Never do this
     globally — a route-param query would then show the wrong player's data. */
  const rowsQ = useQuery({
    queryKey: ['leaderboard', range],
    queryFn: () => fetchLeaderboard(range![0], range![1]),
    enabled: !!range && (tab === 'season' || tab === 'alltime' || tab === 'custom'),
    placeholderData: keepPreviousData,
  })
  const rows = rowsQ.data

  const activeMini = miniId ?? (minis ?? [])[(minis ?? []).length - 1]?.id ?? null
  const miniQ = useQuery({
    queryKey: ['miniLeaderboard', activeMini],
    queryFn: () => fetchMiniLeaderboard(activeMini!),
    enabled: tab === 'mini' && !!activeMini,
    placeholderData: keepPreviousData,
  })
  const miniRows = miniQ.data

  const { data: history } = useQuery({
    queryKey: ['seasonHistory'],
    queryFn: fetchSeasonHistory,
    enabled: tab === 'history' || tab === 'alltime',
  })

  // All Time: imported past-season totals (24/25 + 25/26) fold into the
  // score; entries/win%/avg/miss remain picks-era (26/27 onwards) only.
  const histTotal = (playerId: string) =>
    (history ?? [])
      .filter((h) => h.player_id === playerId)
      .reduce((acc, h) => acc + Number(h.score), 0)
  const displayRows =
    tab === 'alltime'
      ? (rows ?? []).map((r) => ({ ...r, score: r.score + histTotal(r.player_id) }))
      : (rows ?? [])
  const sorted = [...displayRows].sort((a, b) => b.score - a.score)
  const miniSorted = [...(miniRows ?? [])].sort((a, b) => b.score - a.score)
  const historyLabels = [...new Set((history ?? []).map((h) => h.season_label))]

  const tabs: { key: Tab; label: string }[] = [
    { key: 'season', label: season?.name ?? 'Season' },
    { key: 'mini', label: 'Mini' },
    { key: 'alltime', label: 'All Time' },
    { key: 'history', label: 'History' },
    { key: 'custom', label: 'Custom' },
  ]

  const rowGrid = 'grid grid-cols-[24px_1fr_52px_44px_44px_40px] items-center gap-1'

  /* A disabled query stays isPending forever, so only wait on the one that is
     actually running for this tab — and a custom range with no dates yet is a
     real answer, not a loading state. */
  const boardLoading = !!range && rowsQ.isPending
  const boardStale = rowsQ.isPlaceholderData
  const miniLoading = !!activeMini && miniQ.isPending

  return (
    <div className="page-in px-4">
      <PageTitle>Standings</PageTitle>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="pressable rounded-[10px] border px-2.5 py-2 text-[12px] font-semibold"
            style={
              tab === t.key
                ? { background: 'rgba(116,192,232,0.1)', border: '1.5px solid var(--color-accent)', color: 'var(--color-accent-bright)' }
                : { borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'custom' && (
        <div className="mb-3 flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="w-full rounded-[10px] border bg-surface-2 px-3 py-2.5 text-[13px]"
            style={{ borderColor: 'var(--color-line-strong)' }}
          />
          <span className="text-[12px] text-muted">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="w-full rounded-[10px] border bg-surface-2 px-3 py-2.5 text-[13px]"
            style={{ borderColor: 'var(--color-line-strong)' }}
          />
        </div>
      )}

      {(tab === 'season' || tab === 'alltime' || tab === 'custom') && boardLoading && (
        <SkeletonPanel rows={5} rowHeight={44} header avatar={false} lines={1} />
      )}
      {(tab === 'season' || tab === 'alltime' || tab === 'custom') && !boardLoading && rowsQ.isError && (
        <LoadFailed what="the standings" />
      )}
      {(tab === 'season' || tab === 'alltime' || tab === 'custom') && !boardLoading && !rowsQ.isError && (
        <>
          <div
            className="overflow-hidden rounded-[14px] bg-surface transition-opacity duration-150"
            style={{ opacity: boardStale ? 0.5 : 1 }}
          >
            <div className={`${rowGrid} border-b px-3.5 py-2`} style={{ borderColor: 'var(--color-line)' }}>
              <Overline>#</Overline>
              <Overline>PLAYER</Overline>
              <Overline className="text-right">SCORE</Overline>
              <Overline className="text-right">WIN%</Overline>
              <Overline className="text-right">AVG</Overline>
              <Overline className="text-right">MISS</Overline>
            </div>
            {sorted.map((r, i) => {
              const last = i === sorted.length - 1 && sorted.length > 1
              return (
                <Link
                  key={r.player_id}
                  to={`/players/${r.player_id}`}
                  className={`pressable ${rowGrid} border-t px-3.5 py-3`}
                  style={{
                    borderColor: 'var(--color-line)',
                    background: i === 0 ? 'rgba(242,201,76,0.05)' : last ? 'rgba(240,101,95,0.04)' : undefined,
                  }}
                >
                  <span className="font-mono text-[11px] text-muted">{i + 1}</span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <ShamedName playerId={r.player_id} name={r.name} className="truncate text-[13.5px] font-bold" style={{ color: playerColor(r.name) }} />
                    <Honours playerId={r.player_id} />
                  </span>
                  <span className="text-right font-mono text-[14px] font-bold">{score2(r.score)}</span>
                  <span className="text-right font-mono text-[11.5px] text-muted">
                    {r.win_pct == null ? '–' : `${Math.round(Number(r.win_pct))}%`}
                  </span>
                  <span className="text-right font-mono text-[11.5px] text-muted">{odds2(r.avg_odds)}</span>
                  <span
                    className="text-right font-mono text-[11.5px]"
                    style={{ color: r.no_picks > 0 ? 'var(--color-loss)' : 'var(--color-muted)' }}
                  >
                    {r.no_picks}
                  </span>
                </Link>
              )
            })}
            {sorted.length === 0 && (
              <div className="px-4 py-8 text-center text-[13px] text-muted">
                {tab === 'custom' && !(customStart && customEnd)
                  ? 'Pick a start and end date.'
                  : 'Nothing settled in this range yet.'}
              </div>
            )}
          </div>
          {tab === 'alltime' && sorted.length > 0 && (
            <p className="mt-3 px-1 text-[11px] text-muted">
              Score includes the recorded 24/25 and 25/26 season totals. Win%, Avg and Miss count
              from 26/27 onwards — pick-by-pick data starts there.
            </p>
          )}
          {tab === 'custom' && sorted.length > 0 && (
            <p className="mt-3 px-1 text-[11px] text-muted">
              Custom ranges cover 26/27 onwards — pick-by-pick data starts there.
            </p>
          )}
          {tab === 'season' && sorted.length > 1 && (
            <p className="mt-3 px-1 text-[11px] text-muted">
              Bottom of the table gets first pick of the bets on Wednesday (rules §1) — and 45% of
              the meal bill in May (rules §7).
            </p>
          )}
        </>
      )}

      {tab === 'mini' && miniLoading && <SkeletonPanel rows={5} rowHeight={44} avatar={false} />}
      {tab === 'mini' && !miniLoading && (
        <>
          {(minis ?? []).length > 1 && (
            <select
              value={activeMini ?? ''}
              onChange={(e) => setMiniId(e.target.value)}
              className="mb-3 w-full rounded-[10px] border bg-surface-2 px-3 py-2.5 text-[13px]"
              style={{ borderColor: 'var(--color-line-strong)' }}
            >
              {(minis ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          {(minis ?? []).length === 1 && (
            <p className="mb-3 px-1 text-[11.5px] text-muted">{(minis ?? [])[0].name} — the loser takes a forfeit (rules §6).</p>
          )}
          <div className="overflow-hidden rounded-[14px] bg-surface">
            {miniSorted.map((r, i) => {
              const last = i === miniSorted.length - 1 && miniSorted.length > 1
              return (
                <Link
                  key={r.player_id}
                  to={`/players/${r.player_id}`}
                  className="pressable flex items-center gap-2.5 border-t px-3.5 py-3 first:border-t-0"
                  style={{
                    borderColor: 'var(--color-line)',
                    background: i === 0 ? 'rgba(242,201,76,0.05)' : last ? 'rgba(240,101,95,0.04)' : undefined,
                  }}
                >
                  <span className="w-4 font-mono text-[11px] text-muted">{i + 1}</span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <ShamedName playerId={r.player_id} name={r.name} className="truncate text-[13.5px] font-bold" style={{ color: playerColor(r.name) }} />
                    <Honours playerId={r.player_id} />
                  </span>
                  <span className="font-mono text-[11px] text-muted">{r.wins}/{r.entries}</span>
                  <span className="w-[52px] text-right font-mono text-[14px] font-bold">{score2(r.score)}</span>
                </Link>
              )
            })}
            {miniSorted.length === 0 && (
              <div className="px-4 py-8 text-center text-[13px] text-muted">
                {activeMini ? 'Nothing settled in this mini league yet.' : 'No mini league set up yet — admins can create one.'}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className="flex flex-col gap-4">
          {historyLabels.map((label) => {
            const table = (history ?? []).filter((h) => h.season_label === label)
            return (
              <div key={label} className="overflow-hidden rounded-[14px] bg-surface">
                <div
                  className="display px-3.5 py-2.5 text-[15px]"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-accent)' }}
                >
                  Season {label}
                </div>
                {table.map((h) => {
                  const p = h.position
                  const name = nameOf(h.player_id)
                  return (
                    <Link
                      key={h.id}
                      to={`/players/${h.player_id}`}
                      className="flex items-center gap-2.5 border-t px-3.5 py-2.5"
                      style={{
                        borderColor: 'var(--color-line)',
                        background: p === 1 ? 'rgba(242,201,76,0.05)' : p === table.length ? 'rgba(240,101,95,0.04)' : undefined,
                      }}
                    >
                      <span className="w-4 font-mono text-[11px] text-muted">{p}</span>
                      <span className="flex min-w-0 flex-1 items-center gap-1.5">
                        <ShamedName playerId={h.player_id} name={name} className="truncate text-[13.5px] font-bold" style={{ color: playerColor(name) }} />
                        <Honours playerId={h.player_id} />
                      </span>
                      <span className="font-mono text-[14px] font-bold">{score2(h.score)}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
          {historyLabels.length === 0 && (
            <div className="rounded-[14px] bg-surface px-4 py-8 text-center text-[13px] text-muted">
              No past seasons recorded.
            </div>
          )}
          <p className="px-1 pb-2 text-[11px] text-muted">
            Full tables recorded from 24/25. The 22/23 half season and 23/24 live on in the
            crowns and spoons.
          </p>
        </div>
      )}
    </div>
  )
}

