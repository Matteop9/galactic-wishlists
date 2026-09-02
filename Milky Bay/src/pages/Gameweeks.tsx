import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchGameweeks, fetchPlayerWeeks } from '../lib/queries'
import { gwDate, score2 } from '../lib/format'
import { GwStatusChip, LoadFailed, PageTitle } from '../components/ui'
import { SkeletonPanel } from '../components/Skeleton'

export default function Gameweeks() {
  const gwsQ = useQuery({ queryKey: ['gameweeks'], queryFn: fetchGameweeks, staleTime: 5 * 60_000 })
  const gws = gwsQ.data
  const { data: weeks } = useQuery({ queryKey: ['playerWeeks'], queryFn: () => fetchPlayerWeeks() })

  const summary = (gwId: string) => {
    const rows = (weeks ?? []).filter((w) => w.gameweek_id === gwId && w.week_points != null)
    if (!rows.length) return null
    const top = [...rows].sort((a, b) => Number(b.week_points) - Number(a.week_points))[0]
    if (Number(top.week_points) <= 0) return 'A week to forget'
    return `${top.name} top · +${score2(Number(top.week_points))}`
  }

  // Newest first, grouped: current + settled weeks on top, the future below.
  const list = [...(gws ?? [])].sort((a, b) => (a.gw_date < b.gw_date ? 1 : -1))
  const played = list.filter((g) => g.status !== 'scheduled')
  const upcoming = list.filter((g) => g.status === 'scheduled')

  const rows = (group: typeof list) =>
    group.map((g) => (
      <Link
        key={g.id}
        to={`/gameweeks/${g.id}`}
        className="pressable flex items-center justify-between border-t px-3.5 py-3 first:border-t-0"
        style={{ borderColor: 'var(--color-line)' }}
      >
        <div>
          <div className="text-[13.5px] font-bold">{gwDate(g.gw_date)}</div>
          {summary(g.id) && (
            <div className="mt-0.5 font-mono text-[10.5px] text-muted">{summary(g.id)}</div>
          )}
        </div>
        <GwStatusChip status={g.status} />
      </Link>
    ))

  return (
    <div className="page-in px-4 pb-4">
      <PageTitle>Gameweeks</PageTitle>
      {gwsQ.isPending && <SkeletonPanel rows={6} rowHeight={48} avatar={false} />}
      {!gwsQ.isPending && gwsQ.isError && <LoadFailed what="the gameweeks" />}
      {!gwsQ.isPending && !gwsQ.isError && (
        <>
      {played.length > 0 && (
        <>
          <div className="overline px-1 pb-1.5">THIS SEASON SO FAR</div>
          <div className="mb-4 overflow-hidden rounded-[14px] bg-surface">{rows(played)}</div>
        </>
      )}
      <div className="overline px-1 pb-1.5">UPCOMING</div>
      <div className="overflow-hidden rounded-[14px] bg-surface">
        {rows(upcoming)}
        {upcoming.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-muted">No upcoming gameweeks.</div>
        )}
      </div>
        </>
      )}
    </div>
  )
}
