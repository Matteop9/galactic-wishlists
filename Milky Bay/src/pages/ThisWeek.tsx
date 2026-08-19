import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchCurrentGameweek, fetchPickScores, fetchPlayerWeeks } from '../lib/queries'
import { gwDate, score2 } from '../lib/format'
import { useCountdown } from '../hooks/useCountdown'
import { GwStatusChip, Overline, playerColor } from '../components/ui'
import { Honours, ShamedName } from '../components/Honours'
import AccaCard from '../components/AccaCard'

export default function ThisWeek() {
  const { data: gw } = useQuery({ queryKey: ['currentGw'], queryFn: fetchCurrentGameweek })
  const { data: picks } = useQuery({
    queryKey: ['pickScores', gw?.id],
    queryFn: () => fetchPickScores(gw!.id),
    enabled: !!gw,
  })
  const { data: weeks } = useQuery({
    queryKey: ['playerWeeks', gw?.id],
    queryFn: () => fetchPlayerWeeks(gw!.id),
    enabled: !!gw,
  })
  const windowOpen = gw?.status === 'open'
  const closesIn = useCountdown(windowOpen ? gw?.window_closes : null)

  const wPicks = (picks ?? []).filter((p) => p.acca_kind === 'W')
  const rPicks = (picks ?? []).filter((p) => p.acca_kind === 'random')
  const board = [...(weeks ?? [])]
    .filter((w) => w.week_points != null)
    .sort((a, b) => Number(b.week_points) - Number(a.week_points))

  return (
    <div className="px-4">
      <div className="flex items-center justify-between pb-1 pt-6">
        <div>
          <div className="display text-3xl leading-none">MILKY BAY</div>
          <div className="mt-1 font-mono text-[11px] font-bold" style={{ color: 'var(--color-accent)' }}>
            {gw ? gwDate(gw.gw_date) : '· · ·'}
          </div>
        </div>
        {gw && <GwStatusChip status={gw.status} />}
      </div>

      {windowOpen && (
        <div className="mt-3 flex items-center justify-between rounded-[12px] bg-surface px-3.5 py-2.5">
          <span className="text-[12px] text-muted">
            App entry closes <span className="font-semibold text-text">Sat midnight</span>
            <span className="block text-[10.5px]">Real deadline: Thursday 8pm in the chat</span>
          </span>
          <span className="font-mono text-[15px] font-bold" style={{ color: 'var(--color-accent)' }}>
            {closesIn}
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {wPicks.length > 0 && <AccaCard kind="W" picks={wPicks} />}
        {rPicks.length > 0 && <AccaCard kind="random" picks={rPicks} />}
        {picks && picks.length === 0 && (
          <div className="rounded-[14px] bg-surface px-4 py-8 text-center text-[13px] text-muted">
            No picks in yet this week.{' '}
            <Link to="/pick" className="font-semibold" style={{ color: 'var(--color-accent)' }}>
              Enter yours →
            </Link>
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

      <div className="mb-2 mt-5 text-center">
        <Link to="/rules" className="text-[11.5px] text-muted underline">
          The rules · The Milky Bay agreement
        </Link>
      </div>
    </div>
  )
}
