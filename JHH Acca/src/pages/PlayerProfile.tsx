import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ALL_TIME, fetchLeaderboard, fetchPlayerPickScores } from '../lib/queries'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import RequireAuth from '../components/RequireAuth'
import { Avatar, DoubleChip, MethodBadge, TeamChip } from '../components/ui'
import { dayMonth, odds2, score2 } from '../lib/format'

function StatTile({ label, value, highlight = false, sub }: { label: string; value: string; highlight?: boolean; sub?: string }) {
  return (
    <div
      className="rounded-[12px] bg-surface p-3.5"
      style={highlight ? { border: '1px solid var(--color-accent)' } : undefined}
    >
      <div className="overline">{label}</div>
      <div
        className="mt-0.5 font-mono text-[22px] font-bold"
        style={highlight ? { color: 'var(--color-accent)' } : undefined}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
    </div>
  )
}

function PlayerProfileInner() {
  const { id } = useParams<{ id: string }>()
  const { me, players } = usePlayer()
  const playerId = id === 'me' ? me?.id : id
  const player = players.find((p) => p.id === playerId)

  const { data: board } = useQuery({
    queryKey: ['leaderboard', ...ALL_TIME],
    queryFn: () => fetchLeaderboard(...ALL_TIME),
  })
  const { data: history } = useQuery({
    queryKey: ['playerPicks', playerId],
    queryFn: () => fetchPlayerPickScores(playerId!),
    enabled: !!playerId,
  })

  if (!player) return <div className="p-6 text-center text-sm text-muted">Player not found.</div>

  const row = board?.find((r) => r.player_id === player.id)
  const rankedBySpm = [...(board ?? [])].sort((a, b) => (b.score_per_match ?? 0) - (a.score_per_match ?? 0))
  const rank = rankedBySpm.findIndex((r) => r.player_id === player.id) + 1

  const real = (history ?? []).filter((h) => h.season_kind !== 'test')
  const settled = real.filter((h) => h.result != null)
  const byMethod = (m: string) => {
    const rows = settled.filter((h) => h.method === m)
    const wins = rows.filter((h) => h.result === 1).length
    return { n: rows.length, wins, pct: rows.length ? (wins / rows.length) * 100 : 0 }
  }
  const winSplit = byMethod('Win')
  const bttsSplit = byMethod('BTTS')

  return (
    <div className="px-4 pb-6">
      <div className="flex items-center gap-3 pb-4 pt-5">
        <Avatar name={player.name} team={player.acca_team} size={48} />
        <div>
          <div className="display text-2xl leading-none">{player.name}</div>
          <div className="mt-1 flex items-center gap-2">
            <TeamChip team={player.acca_team} />
            <span className="font-mono text-[10px] text-muted">
              {row?.entries ?? 0} entries · all-time #{rank || '–'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <StatTile label="ALL-TIME SCORE" value={score2(row?.score ?? 0)} />
        <StatTile
          label="SCORE / MATCH"
          value={row?.score_per_match == null ? '–' : Number(row.score_per_match).toFixed(4)}
          highlight
          sub={`ranked #${rank || '–'} of 12`}
        />
        <StatTile label="WINS" value={`${row?.wins ?? 0}`} sub={`${row?.win_pct ?? 0}% strike rate`} />
        <StatTile
          label="WIN STREAK"
          value={`${row?.win_streak ?? 0}`}
          sub={row?.days_since_win != null ? `${row.days_since_win}d since last win` : undefined}
        />
      </div>

      <div className="mt-5">
        <div className="overline mb-2 px-1">METHOD SPLIT</div>
        <div className="rounded-[14px] bg-surface p-3.5">
          {[
            { label: 'WIN', color: 'var(--color-jhp)', s: winSplit },
            { label: 'BTTS', color: 'var(--color-gold)', s: bttsSplit },
          ].map((m) => (
            <div key={m.label} className="mb-2.5 last:mb-0">
              <div className="mb-1 flex justify-between font-mono text-[10px] text-muted">
                <span>{m.label} · {m.s.wins}/{m.s.n}</span>
                <span>{m.s.pct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--color-surface-2)' }}>
                <div className="h-full rounded-full" style={{ width: `${m.s.pct}%`, background: m.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="overline mb-2 px-1">RECENT PICKS</div>
        <div className="rounded-[14px] bg-surface">
          {real.slice(0, 15).map((h) => (
            <div key={h.id} className="flex items-center gap-2.5 border-b px-3.5 py-2.5 last:border-b-0" style={{ borderColor: 'var(--color-line)' }}>
              <span className="w-9 font-mono text-[10px] text-muted">{dayMonth(h.gw_date)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[12.5px] font-semibold">
                    {h.method === 'N/A' ? 'No pick' : h.method === 'BTTS' && h.second_team ? `${h.team} v ${h.second_team}` : h.team}
                  </span>
                  <MethodBadge method={h.method} />
                  {h.doubled && h.result === 1 && <DoubleChip />}
                </div>
              </div>
              <span
                className="font-mono text-[13px] font-semibold"
                style={{
                  color: h.result === 1 ? 'var(--color-win)' : h.result === 0 ? 'var(--color-loss)' : 'var(--color-muted)',
                }}
              >
                {h.method === 'N/A' ? '–' : odds2(h.odds)}
              </span>
            </div>
          ))}
          {real.length === 0 && <div className="p-5 text-center text-sm text-muted">No picks yet.</div>}
        </div>
      </div>

      {playerId === me?.id && (
        <div className="mt-6 flex items-center justify-center gap-5">
          <Link to="/rules" className="text-[12px] font-semibold text-muted underline underline-offset-2">
            Rules
          </Link>
          {me?.is_admin && (
            <Link to="/admin" className="text-[12px] font-semibold underline underline-offset-2" style={{ color: 'var(--color-accent)' }}>
              Admin
            </Link>
          )}
          <button
            onClick={() => supabase.auth.signOut().then(() => window.location.assign('/login'))}
            className="text-[12px] font-semibold text-muted underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function PlayerProfile() {
  return (
    <RequireAuth>
      <PlayerProfileInner />
    </RequireAuth>
  )
}
