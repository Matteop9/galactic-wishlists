import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  fetchCurrentGameweek,
  fetchLiveStatuses,
  fetchPickScores,
  fetchSeasons,
  isMatchday,
} from '../lib/queries'
import { useCountdown } from '../hooks/useCountdown'
import AccaCard from '../components/AccaCard'
import LiveBanner from '../components/LiveBanner'
import WhatsNew from '../components/WhatsNew'
import { GwStatusChip, IntlBreakChip, SandboxChip, teamColor } from '../components/ui'
import { gwDate, ukTime } from '../lib/format'
import RequireAuth from '../components/RequireAuth'

const PAIR_COLORS = ['var(--color-vdl)', 'var(--color-jhp)', 'var(--color-accent)']

function ThisWeekInner() {
  const { data: gw } = useQuery({ queryKey: ['currentGw'], queryFn: fetchCurrentGameweek })
  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: fetchSeasons })
  const { data: picks } = useQuery({
    queryKey: ['pickScores', gw?.id],
    queryFn: () => fetchPickScores(gw!.id),
    enabled: !!gw,
    refetchInterval: isMatchday(gw) ? 60_000 : false,
  })
  const { data: live } = useQuery({
    queryKey: ['live', gw?.id],
    queryFn: () => fetchLiveStatuses(gw!.id),
    enabled: isMatchday(gw),
    refetchInterval: 60_000,
  })
  const closesIn = useCountdown(gw?.status === 'open' ? gw.window_closes : null)
  const opensIn = useCountdown(gw?.status === 'scheduled' ? gw.window_opens : null)

  const season = seasons?.find((s) => s.id === gw?.season_id)
  const isTest = season?.kind === 'test'

  const teams = new Map<string, NonNullable<typeof picks>>()
  for (const p of picks ?? []) {
    if (!teams.has(p.team_name)) teams.set(p.team_name, [])
    teams.get(p.team_name)!.push(p)
  }
  const teamNames = [...teams.keys()].sort()

  const settledCount = (picks ?? []).filter((p) => p.result != null).length

  return (
    <div className="px-4">
      <div className="flex items-center justify-between pb-3 pt-5">
        <div className="flex items-baseline gap-2">
          <span className="display text-2xl leading-none">THE ACCA</span>
          <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--color-accent)' }}>
            26/27
          </span>
          {isTest && <SandboxChip />}
        </div>
        {gw && (
          <Link to={`/gameweeks/${gw.id}`} className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted">{gwDate(gw.gw_date)}</span>
            {gw.is_international_break && <IntlBreakChip />}
            <GwStatusChip status={gw.status} />
          </Link>
        )}
      </div>

      {gw?.status === 'open' && (
        <LiveBanner pulse right={closesIn}>
          Window open — closes {ukTime(gw.window_closes)}
        </LiveBanner>
      )}
      {gw?.status === 'scheduled' && (
        <LiveBanner pulse={false} right={opensIn}>
          Window opens {ukTime(gw.window_opens)}
        </LiveBanner>
      )}
      {(gw?.status === 'closed' || (gw && isMatchday(gw))) && (
        <LiveBanner pulse right={`${settledCount} of ${picks?.length ?? 0} settled`}>
          {live?.some((l) => !['NO_LIVE', 'NOT_STARTED'].includes(l.live_state))
            ? 'LIVE — scores updating'
            : gw.status === 'closed'
              ? 'Window closed — game on'
              : 'Matchday — live scores from kick-off'}
        </LiveBanner>
      )}

      <div className="mt-4 flex flex-col gap-4 pb-6">
        {teamNames.map((t, i) => (
          <AccaCard
            key={t}
            teamName={t}
            displayColor={isTest ? PAIR_COLORS[i % PAIR_COLORS.length] : teamColor(t)}
            picks={teams.get(t)!}
            live={live ?? undefined}
          />
        ))}
        {gw && teamNames.length === 0 && (
          <div className="rounded-[14px] bg-surface p-6 text-center text-sm text-muted">
            No picks in yet for {gwDate(gw.gw_date)}.
            <br />
            {gw.status === 'open' ? (
              <Link to="/pick" className="font-semibold" style={{ color: 'var(--color-accent)' }}>
                Get yours in →
              </Link>
            ) : (
              'The window opens Thursday 6 PM.'
            )}
          </div>
        )}
        {!gw && (
          <div className="rounded-[14px] bg-surface p-6 text-center text-sm text-muted">
            No gameweek scheduled.
          </div>
        )}
        <WhatsNew />
      </div>
    </div>
  )
}

export default function ThisWeek() {
  return (
    <RequireAuth>
      <ThisWeekInner />
    </RequireAuth>
  )
}
