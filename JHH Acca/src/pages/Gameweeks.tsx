import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchAllTeamWeekScores, fetchGameweeks, fetchSeasons } from '../lib/queries'
import RequireAuth from '../components/RequireAuth'
import { GwStatusChip, IntlBreakChip, LoadFailed, PageTitle, teamColor } from '../components/ui'
import { SkeletonPanel } from '../components/Skeleton'
import { gwDate, londonToday, score2 } from '../lib/format'
import type { TeamWeekScore } from '../lib/types'

/** "9/12 · VDL +2.01" — legs landed for the week, then who took it and by how much.
    Team names come from the data (Test Weekend uses Team 1-6, not VDL/JHP). */
function weekSummary(rows: TeamWeekScore[]) {
  if (rows.length === 0) return null
  const wins = rows.reduce((s, r) => s + r.wins, 0)
  const legs = rows.reduce((s, r) => s + r.legs, 0)
  const ranked = [...rows].sort((a, b) => Number(b.week_score) - Number(a.week_score))
  const margin = Number(ranked[0].week_score) - Number(ranked[ranked.length - 1].week_score)
  return { wins, legs, leader: ranked[0].team_name, margin, drawn: margin === 0 }
}

function GameweeksInner() {
  const gwsQ = useQuery({ queryKey: ['gameweeks'], queryFn: fetchGameweeks, staleTime: 5 * 60_000 })
  const gws = gwsQ.data
  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: fetchSeasons,
    staleTime: 5 * 60_000,
  })
  const { data: allTws } = useQuery({
    queryKey: ['allTeamWeekScores'],
    queryFn: fetchAllTeamWeekScores,
  })
  const seasonName = (id: string) => seasons?.find((s) => s.id === id)?.name ?? ''
  const summaryFor = (gwId: string) => weekSummary((allTws ?? []).filter((w) => w.gameweek_id === gwId))

  const today = londonToday()
  const upcoming = (gws ?? []).filter((g) => g.gw_date >= today && g.status !== 'settled')
  const past = (gws ?? []).filter((g) => g.gw_date < today || g.status === 'settled').reverse()

  /* The week summaries (allTws) load separately on purpose — rows appear first
     and "9/12 · VDL +2.01" fills in after, rather than holding the whole list. */
  const Section = ({ title, list }: { title: string; list: typeof upcoming }) => (
    <>
      <div className="overline mb-2 mt-4 px-1">{title}</div>
      {gwsQ.isPending ? (
        <SkeletonPanel rows={4} rowHeight={48} avatar={false} />
      ) : (
      <div className="page-in rounded-[14px] bg-surface">
        {list.map((g) => {
          const s = g.status === 'settled' ? summaryFor(g.id) : null
          return (
            <Link
              key={g.id}
              to={`/gameweeks/${g.id}`}
              className="pressable flex items-center justify-between border-b px-3.5 py-3"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <div>
                <div className="font-mono text-[13px] font-semibold">{gwDate(g.gw_date)}</div>
                <div className="text-[10.5px] text-muted">
                  {seasonName(g.season_id)}
                  {s && (
                    <>
                      {' · '}
                      <span className="font-mono">
                        {s.wins}/{s.legs}
                      </span>
                      {' · '}
                      {s.drawn ? (
                        <span className="font-mono">level</span>
                      ) : (
                        <span className="font-mono font-semibold" style={{ color: teamColor(s.leader) }}>
                          {s.leader} +{score2(s.margin)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <span className="flex items-center gap-1.5">
                {g.is_international_break && <IntlBreakChip />}
                <GwStatusChip status={g.status} />
              </span>
            </Link>
          )
        })}
        {list.length === 0 && <div className="p-5 text-center text-sm text-muted">Nothing here.</div>}
      </div>
      )}
    </>
  )

  return (
    <div className="page-in px-4 pb-6">
      <PageTitle>GAMEWEEKS</PageTitle>
      {gwsQ.isError ? (
        <LoadFailed what="the gameweeks" />
      ) : (
        <>
          <Section title="UPCOMING" list={upcoming.slice(0, 6)} />
          <Section title="HISTORY" list={past} />
        </>
      )}
    </div>
  )
}

export default function Gameweeks() {
  return (
    <RequireAuth>
      <GameweeksInner />
    </RequireAuth>
  )
}
