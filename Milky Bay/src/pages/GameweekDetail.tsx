import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchAdjustments, fetchGameweek, fetchPickScores, fetchPlayerWeeks } from '../lib/queries'
import { gwDate, score2 } from '../lib/format'
import { GwStatusChip, Overline, PageTitle, playerColor } from '../components/ui'
import { Honours, ShamedName } from '../components/Honours'
import AccaCard from '../components/AccaCard'

export default function GameweekDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: gw } = useQuery({
    queryKey: ['gameweek', id],
    queryFn: () => fetchGameweek(id!),
    enabled: !!id,
  })
  const { data: picks } = useQuery({
    queryKey: ['pickScores', id],
    queryFn: () => fetchPickScores(id!),
    enabled: !!id,
  })
  const { data: weeks } = useQuery({
    queryKey: ['playerWeeks', id],
    queryFn: () => fetchPlayerWeeks(id!),
    enabled: !!id,
  })
  const { data: adjustments } = useQuery({ queryKey: ['adjustments'], queryFn: fetchAdjustments })

  const wPicks = (picks ?? []).filter((p) => p.acca_kind === 'W')
  const rPicks = (picks ?? []).filter((p) => p.acca_kind === 'random')
  const board = [...(weeks ?? [])]
    .filter((w) => w.week_points != null)
    .sort((a, b) => Number(b.week_points) - Number(a.week_points))
  const gwAdj = (adjustments ?? []).filter((a) => a.gameweek_id === id)

  return (
    <div className="px-4">
      <PageTitle right={gw && <GwStatusChip status={gw.status} />}>
        {gw ? gwDate(gw.gw_date) : '…'}
      </PageTitle>

      <div className="flex flex-col gap-4">
        {wPicks.length > 0 && <AccaCard kind="W" picks={wPicks} />}
        {rPicks.length > 0 && <AccaCard kind="random" picks={rPicks} />}
        {picks && picks.length === 0 && (
          <div className="rounded-[14px] bg-surface px-4 py-8 text-center text-[13px] text-muted">
            No picks recorded for this week.
          </div>
        )}
      </div>

      {board.length > 0 && (
        <div className="mt-5">
          <Overline className="px-1 pb-1.5">WEEK POINTS</Overline>
          <div className="overflow-hidden rounded-[14px] bg-surface">
            {board.map((w, i) => (
              <Link
                key={w.player_id}
                to={`/players/${w.player_id}`}
                className="flex items-center gap-2.5 border-t px-3.5 py-2.5 first:border-t-0"
                style={{ borderColor: 'var(--color-line)' }}
              >
                <span className="w-4 font-mono text-[11px] text-muted">{i + 1}</span>
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <ShamedName playerId={w.player_id} name={w.name} className="truncate text-[13px] font-bold" style={{ color: playerColor(w.name) }} />
                  <Honours playerId={w.player_id} />
                </span>
                <span
                  className="font-mono text-[14px] font-semibold"
                  style={{
                    color:
                      Number(w.week_points) > 0
                        ? 'var(--color-win)'
                        : Number(w.week_points) < 0
                          ? 'var(--color-loss)'
                          : 'var(--color-muted)',
                  }}
                >
                  {Number(w.week_points) > 0 ? '+' : ''}
                  {score2(Number(w.week_points))}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {gwAdj.length > 0 && (
        <div className="mt-5">
          <Overline className="px-1 pb-1.5">ADJUSTMENTS</Overline>
          <div className="overflow-hidden rounded-[14px] bg-surface">
            {gwAdj.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between border-t px-3.5 py-2.5 first:border-t-0"
                style={{ borderColor: 'var(--color-line)' }}
              >
                <span className="text-[12.5px] text-muted">{a.reason}</span>
                <span
                  className="font-mono text-[13px] font-semibold"
                  style={{ color: a.score >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}
                >
                  {a.score >= 0 ? '+' : ''}
                  {score2(a.score)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
