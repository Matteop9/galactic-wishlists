import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { fetchFeedback, fetchHonoursList, fetchPlayerPickScores, submitFeedback } from '../lib/queries'
import { gwDate, score2 } from '../lib/format'
import { Avatar, KindBadge, NoPickChip, playerColor, SoleLoserChip, StateIcon, VoidChip } from '../components/ui'
import { odds2 } from '../lib/format'

const AWARD_LABEL: Record<string, string> = {
  winner: '👑 Champion',
  half_season_winner: '👑 Half-season champion',
  wooden_spoon: '🥄 Wooden spoon',
  half_wooden_spoon: '🥄 Half-season wooden spoon',
}

const STATUS_COLOR: Record<string, string> = {
  new: 'var(--color-accent)',
  planned: 'var(--color-gold)',
  done: 'var(--color-win)',
  dismissed: 'var(--color-muted)',
}

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>()
  const { me, players, isAdmin } = usePlayer()
  const qc = useQueryClient()
  const [shown, setShown] = useState(10)
  const [fbText, setFbText] = useState('')

  const playerId = id === 'me' ? me?.id : id
  const player = players.find((p) => p.id === playerId)
  const isMe = playerId === me?.id

  const { data: picks } = useQuery({
    queryKey: ['playerPicks', playerId],
    queryFn: () => fetchPlayerPickScores(playerId!),
    enabled: !!playerId,
  })
  const { data: honoursList } = useQuery({ queryKey: ['honoursList'], queryFn: fetchHonoursList })
  const { data: feedback } = useQuery({
    queryKey: ['feedback'],
    queryFn: fetchFeedback,
    enabled: isMe,
  })
  const sendFeedback = useMutation({
    mutationFn: () => submitFeedback(me!.id, fbText.trim()),
    onSuccess: () => {
      setFbText('')
      qc.invalidateQueries({ queryKey: ['feedback'] })
    },
  })
  const myFeedback = (feedback ?? []).filter((f) => f.player_id === me?.id)

  const myHonours = (honoursList ?? []).filter((h) => h.player_id === playerId)

  // Group picks by gameweek date (already sorted desc)
  const byWeek = new Map<string, typeof picks>()
  for (const p of picks ?? []) {
    const arr = byWeek.get(p.gw_date) ?? []
    arr.push(p)
    byWeek.set(p.gw_date, arr as never)
  }
  const weeks = [...byWeek.entries()].slice(0, shown)

  if (!player)
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <span className="overline">Loading…</span>
      </div>
    )

  return (
    <div className="px-4">
      <div className="flex items-center gap-3 pb-4 pt-6">
        <Avatar name={player.name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="display text-2xl leading-none" style={{ color: playerColor(player.name) }}>
            {player.name}
          </div>
          {myHonours.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {myHonours.map((h) => (
                <span
                  key={h.id}
                  title={h.notes ?? undefined}
                  className="rounded-[4px] border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em]"
                  style={{
                    borderColor:
                      h.award === 'wooden_spoon'
                        ? 'color-mix(in srgb, var(--color-spoon) 40%, transparent)'
                        : 'color-mix(in srgb, var(--color-gold) 40%, transparent)',
                    color: h.award === 'wooden_spoon' ? 'var(--color-spoon)' : 'var(--color-gold)',
                  }}
                >
                  {h.season_label} {AWARD_LABEL[h.award]}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] bg-surface">
        {weeks.map(([date, weekPicks]) => {
          const pts = (weekPicks ?? []).reduce(
            (acc, p) => (p.points == null ? acc : acc + Number(p.points)),
            0,
          )
          const allSettled = (weekPicks ?? []).every((p) => p.points != null)
          return (
            <div key={date} className="border-t first:border-t-0" style={{ borderColor: 'var(--color-line)' }}>
              <div
                className="flex items-center justify-between px-3.5 py-2"
                style={{ background: 'var(--color-surface-2)' }}
              >
                <span className="font-mono text-[10.5px] font-semibold text-muted">{gwDate(date)}</span>
                <span
                  className="font-mono text-[12px] font-bold"
                  style={{
                    color: !allSettled
                      ? 'var(--color-muted)'
                      : pts > 0
                        ? 'var(--color-win)'
                        : pts < 0
                          ? 'var(--color-loss)'
                          : 'var(--color-muted)',
                  }}
                >
                  {allSettled ? `${pts > 0 ? '+' : ''}${score2(pts)}` : 'pending'}
                </span>
              </div>
              {(weekPicks ?? []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 border-t px-3.5 py-2"
                  style={{ borderColor: 'var(--color-line)' }}
                >
                  <KindBadge kind={p.acca_kind} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px]">
                        {p.is_no_pick ? 'No pick' : p.game ? `${p.game} — ${p.selection}` : p.selection}
                      </span>
                      {p.is_no_pick && <NoPickChip />}
                      {p.void_reason && <VoidChip reason={p.void_reason} />}
                      {p.sole_loser && <SoleLoserChip />}
                    </div>
                  </div>
                  <span className="font-mono text-[12.5px] text-muted">
                    {p.is_no_pick ? '–' : (p.odds_display ?? odds2(p.odds))}
                  </span>
                  <StateIcon result={p.result} />
                </div>
              ))}
            </div>
          )
        })}
        {weeks.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-muted">No picks yet.</div>
        )}
      </div>

      {byWeek.size > shown && (
        <button
          onClick={() => setShown((n) => n + 10)}
          className="mt-3 w-full rounded-[12px] border py-2.5 text-[12.5px] font-semibold text-muted"
          style={{ borderColor: 'var(--color-line-strong)' }}
        >
          Load more
        </button>
      )}

      {isMe && (
        <div className="mt-6">
          <div className="overline px-1 pb-1.5">FEEDBACK & IDEAS</div>
          <div className="rounded-[14px] bg-surface p-3.5">
            <textarea
              value={fbText}
              onChange={(e) => setFbText(e.target.value)}
              rows={2}
              placeholder="Rule quibble, feature idea, bug — it lands in the admin queue"
              className="w-full resize-y rounded-[10px] border bg-surface-2 px-3 py-2.5 text-[13px]"
              style={{ borderColor: 'var(--color-line-strong)' }}
            />
            <button
              onClick={() => fbText.trim() && sendFeedback.mutate()}
              disabled={sendFeedback.isPending || !fbText.trim()}
              className="mt-2 w-full rounded-[10px] py-2.5 text-[13px] font-bold disabled:opacity-40"
              style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
            >
              {sendFeedback.isPending ? 'Sending…' : 'Send feedback'}
            </button>
            {sendFeedback.isError && (
              <p className="mt-2 text-[11px]" style={{ color: 'var(--color-loss)' }}>
                Couldn't send — check your connection and try again.
              </p>
            )}
            {myFeedback.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                {myFeedback.map((f) => (
                  <div key={f.id} className="flex items-start justify-between gap-2 text-[12px]">
                    <span className="text-muted">{f.message}</span>
                    <span
                      className="shrink-0 rounded-[4px] border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em]"
                      style={{
                        borderColor: `color-mix(in srgb, ${STATUS_COLOR[f.status]} 40%, transparent)`,
                        color: STATUS_COLOR[f.status],
                      }}
                    >
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isMe && (
        <div className="mt-4 flex flex-col gap-2 pb-4">
          {isAdmin && (
            <Link
              to="/admin"
              className="w-full rounded-[12px] border py-3 text-center text-[13.5px] font-semibold"
              style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-accent)' }}
            >
              Admin
            </Link>
          )}
          <Link
            to="/rules"
            className="w-full rounded-[12px] border py-3 text-center text-[13.5px] font-semibold text-muted"
            style={{ borderColor: 'var(--color-line-strong)' }}
          >
            The rules
          </Link>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full rounded-[12px] border py-3 text-[13.5px] font-semibold"
            style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-loss)' }}
          >
            Sign out
          </button>
          <p className="mt-1 text-center text-[10.5px] text-muted">
            Same login works on The Acca if you play there too.
          </p>
        </div>
      )}
    </div>
  )
}
