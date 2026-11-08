import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  adminEditPick,
  deleteAdjustment,
  fetchAdjustments,
  fetchDisputes,
  fetchGameweek,
  fetchLiveStatuses,
  fetchPickScores,
  fetchSeasons,
  fetchTeamDictionary,
  fetchTeamWeekScores,
  isMatchday,
  raiseDispute,
  resolveDispute,
  settlePick,
} from '../lib/queries'
import { usePlayer } from '../hooks/usePlayer'
import RequireAuth from '../components/RequireAuth'
import {
  Avatar,
  DoubleChip,
  GwStatusChip,
  MethodBadge,
  IntlBreakChip,
  LoadFailed,
  SandboxChip,
  StateIcon,
  TeamBadge,
  teamColor,
  VoidChip,
} from '../components/ui'
import { Skeleton, SkeletonAccaCard } from '../components/Skeleton'
import LivePickChip from '../components/LivePickChip'
import MatchPanel from '../components/MatchPanel'
import TeamCombobox from '../components/TeamCombobox'
import { ChampStars } from '../components/ChampStars'
import { gwDate, odds2, score2, ukTime } from '../lib/format'
import { pickOptionsFor } from '../lib/teams'
import type { Dispute, Gameweek, LiveState, PickScore, VoidReason } from '../lib/types'

function suggestedResult(state: LiveState | undefined): 0 | 1 | null {
  if (state === 'WON' || state === 'LANDED') return 1
  if (state === 'LOST') return 0
  return null
}

/* Gameweek detail: per-team groups with week scores, sweep banner, settle
   toggles for admins, result chips for players, disputes on every pick.
   Once the entry window has closed, admins also get EDIT on every pick
   (any week, settled or not) — the fix for a pick that never made it in. */

/* W / L settle both ways; PP (postponed) and INV (invalid) settle 0 with the
   void reason recorded — rules §6: void picks score 0. Tap again to unsettle. */
const SETTLE_OPTIONS: {
  label: string
  result: 0 | 1
  reason: VoidReason | null
  title?: string
}[] = [
  { label: 'W', result: 1, reason: null },
  { label: 'L', result: 0, reason: null },
  { label: 'PP', result: 0, reason: 'postponed', title: 'Postponed/cancelled after the deadline — scores 0' },
  { label: 'INV', result: 0, reason: 'invalid', title: 'Invalid pick — scores 0' },
]

function SettleToggle({
  pick,
  suggested,
  onSettle,
}: {
  pick: PickScore
  suggested: 0 | 1 | null
  onSettle: (r: 0 | 1 | null, reason: VoidReason | null) => void
}) {
  return (
    <div className="flex gap-1">
      {SETTLE_OPTIONS.map((o) => {
        const active = pick.result === o.result && (pick.void_reason ?? null) === o.reason
        const hint = pick.result == null && o.reason === null && suggested === o.result
        const solid =
          o.reason !== null
            ? 'var(--color-line-strong)'
            : o.result === 1
              ? 'var(--color-win-solid)'
              : 'var(--color-loss-solid)'
        return (
          <button
            key={o.label}
            onClick={() => (active ? onSettle(null, null) : onSettle(o.result, o.reason))}
            className="h-[26px] min-w-[26px] rounded-[6px] border px-1 font-mono text-[10px] font-bold"
            title={o.title ?? (hint ? 'Suggested by full-time score — confirm against Bet365' : undefined)}
            style={
              active
                ? { background: solid, borderColor: solid, color: '#EAF0E6' }
                : hint
                  ? { borderColor: solid, borderStyle: 'dashed', color: solid }
                  : { borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function SweepBanner({ teamName, legs, color }: { teamName: string; legs: number; color: string }) {
  return (
    <div
      className="mb-3 flex items-center justify-between rounded-[14px] border px-4 py-3"
      style={{
        background: 'linear-gradient(135deg, rgba(242,201,76,0.12), rgba(242,201,76,0.04))',
        borderColor: 'color-mix(in srgb, var(--color-gold) 40%, transparent)',
      }}
    >
      <div>
        <div className="display text-lg leading-tight" style={{ color }}>
          {teamName} WENT {legs}/{legs}
        </div>
        <div className="text-[11px]" style={{ color: 'var(--color-gold)' }}>
          Winning odds doubled this gameweek
        </div>
      </div>
      <div className="font-mono text-3xl font-bold" style={{ color: 'var(--color-gold)' }}>
        ×2
      </div>
    </div>
  )
}

function DisputeSheet({
  pick,
  raisedBy,
  onClose,
}: {
  pick: PickScore
  raisedBy: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [kind, setKind] = useState<'pick' | 'odds' | 'result'>('odds')
  const [reason, setReason] = useState('')
  const mut = useMutation({
    mutationFn: () => raiseDispute({ pick_id: pick.id, raised_by: raisedBy, kind, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disputes'] })
      onClose()
    },
  })
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-t-[18px] bg-surface p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="display mb-1 text-lg">DISPUTE — {pick.name}</div>
        <p className="mb-3 text-[11.5px] text-muted">
          Picks can be challenged for an hour after submission; egregious issues any time. An admin
          reviews every dispute.
        </p>
        <div className="mb-3 flex gap-2">
          {(['pick', 'odds', 'result'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className="flex-1 rounded-[10px] border px-3 py-2 text-[12px] font-semibold capitalize"
              style={
                kind === k
                  ? { background: 'rgba(180,227,61,0.1)', borderColor: 'var(--color-accent)', color: 'var(--color-accent-bright)' }
                  : { borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }
              }
            >
              {k}
            </button>
          ))}
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What's wrong? Be specific — screenshots can go in the chat."
          rows={3}
          className="mb-3 w-full rounded-[10px] border bg-surface-2 p-3 text-[14px]"
          style={{ borderColor: 'var(--color-line-strong)' }}
        />
        {mut.isError && (
          <p className="mb-2 text-[11.5px]" style={{ color: 'var(--color-loss)' }}>
            {(mut.error as Error).message}
          </p>
        )}
        <button
          disabled={!reason.trim() || mut.isPending}
          onClick={() => mut.mutate()}
          className="w-full rounded-[12px] py-3.5 text-[15px] font-bold disabled:opacity-40"
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
        >
          Raise dispute
        </button>
      </div>
    </div>
  )
}

function GameweekDetailInner() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { me, isAdmin, players } = usePlayer()
  const [disputing, setDisputing] = useState<PickScore | null>(null)
  const [editing, setEditing] = useState<PickScore | null>(null)

  const gwQ = useQuery({ queryKey: ['gw', id], queryFn: () => fetchGameweek(id!), enabled: !!id })
  const gw = gwQ.data
  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: fetchSeasons,
    staleTime: 5 * 60_000,
  })
  const picksQ = useQuery({
    queryKey: ['pickScores', id],
    queryFn: () => fetchPickScores(id!),
    enabled: !!id,
  })
  const picks = picksQ.data
  const { data: weekScores } = useQuery({
    queryKey: ['teamWeekScores', id],
    queryFn: () => fetchTeamWeekScores(id!),
    enabled: !!id,
  })
  const { data: live } = useQuery({
    queryKey: ['live', id],
    queryFn: () => fetchLiveStatuses(id!),
    enabled: !!id && isMatchday(gw),
    refetchInterval: 60_000,
  })
  const { data: disputes } = useQuery({ queryKey: ['disputes'], queryFn: fetchDisputes })
  const { data: adjustments } = useQuery({ queryKey: ['adjustments'], queryFn: fetchAdjustments })

  const settle = useMutation({
    mutationFn: ({
      pickId,
      result,
      reason,
    }: {
      pickId: string
      result: 0 | 1 | null
      reason: VoidReason | null
    }) => settlePick(pickId, result, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pickScores', id] })
      qc.invalidateQueries({ queryKey: ['teamWeekScores', id] })
      qc.invalidateQueries({ queryKey: ['gw', id] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
    },
  })
  const resolve = useMutation({
    mutationFn: ({ did, status, note }: { did: string; status: 'upheld' | 'rejected'; note: string }) =>
      resolveDispute(did, status, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['disputes'] }),
  })
  const removeAdj = useMutation({
    mutationFn: deleteAdjustment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adjustments'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
    },
  })

  const season = seasons?.find((s) => s.id === gw?.season_id)
  const isTest = season?.kind === 'test'

  const teams = new Map<string, PickScore[]>()
  for (const p of picks ?? []) {
    if (!teams.has(p.team_name)) teams.set(p.team_name, [])
    teams.get(p.team_name)!.push(p)
  }
  const openDisputeFor = (pickId: string) =>
    disputes?.find((d) => d.pick_id === pickId && d.status === 'open')

  const loading = gwQ.isPending || picksQ.isPending

  // Players can change picks until the window closes; after that it's admin-only.
  const canEdit =
    isAdmin &&
    !!gw &&
    !['scheduled', 'skipped'].includes(gw.status) &&
    Date.now() >= new Date(gw.window_closes).getTime()

  const sweeps = (weekScores ?? []).filter((w) => w.doubled)
  const liveFor = (pid: string) => live?.find((l) => l.pick_id === pid)

  return (
    <div className="page-in px-4 pb-6">
      <div className="flex items-center justify-between pb-3 pt-5">
        <div className="flex items-center gap-2.5">
          <Link to="/gameweeks" className="pressable text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <span className="display text-xl leading-none">
            {gw ? gwDate(gw.gw_date) : <Skeleton w={118} h={20} />}
          </span>
          {isTest && <SandboxChip />}
          {gw?.is_international_break && <IntlBreakChip />}
        </div>
        {gw && <GwStatusChip status={gw.status} />}
      </div>

      {gw && gw.status !== 'settled' && (
        <p className="mb-3 px-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          Window {ukTime(gw.window_opens)} → {ukTime(gw.window_closes)}
        </p>
      )}

      {sweeps.map((w) => (
        <SweepBanner key={w.team_name} teamName={w.team_name} legs={w.legs} color={isTest ? 'var(--color-gold)' : teamColor(w.team_name)} />
      ))}

      {isAdmin && gw && ['open', 'closed'].includes(gw.status) && (picks?.length ?? 0) > 0 && (
        <MatchPanel gwId={gw.id} picks={picks!} />
      )}

      {loading && (
        <div className="flex flex-col gap-4">
          <SkeletonAccaCard rows={6} />
          <SkeletonAccaCard rows={6} />
        </div>
      )}

      {!loading && (gwQ.isError || picksQ.isError) && <LoadFailed what="this gameweek" />}

      {[...teams.keys()].sort().map((t) => {
        const ws = weekScores?.find((w) => w.team_name === t)
        return (
          <div key={t} className="mb-5">
            <div className="overline mb-1.5 px-1" style={{ color: isTest ? 'var(--color-accent)' : teamColor(t) }}>
              {t} — WEEK SCORE {score2(ws?.week_score ?? 0)}
            </div>
            <div className="rounded-[14px] bg-surface">
              {teams.get(t)!.map((p) => {
                const dispute = openDisputeFor(p.id)
                const l = liveFor(p.id)
                return (
                  <div key={p.id} className="border-b px-3.5 py-2.5 last:border-b-0" style={{ borderColor: 'var(--color-line)' }}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.name} team={p.acca_team} size={26} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-bold" style={{ color: teamColor(p.acca_team) }}>
                            {p.name}
                          </span>
                          <ChampStars playerId={p.player_id} />
                          <MethodBadge method={p.method} />
                          {p.void_reason && <VoidChip reason={p.void_reason} />}
                          {p.doubled && p.result === 1 && <DoubleChip />}
                          {dispute && (
                            <span className="rounded-[4px] border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em]"
                              style={{ borderColor: 'color-mix(in srgb, var(--color-gold) 40%, transparent)', color: 'var(--color-gold)' }}>
                              Under review
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
                          {p.method !== 'N/A' && <TeamBadge name={p.team} size={14} />}
                          <span className="truncate">
                            {p.method === 'N/A' ? 'No pick submitted' : p.method === 'BTTS' && p.second_team ? `${p.team} v ${p.second_team}` : p.team}
                          </span>
                          {p.method === 'BTTS' && p.second_team && <TeamBadge name={p.second_team} size={14} />}
                        </div>
                        {l && isMatchday(gw) && <div className="mt-0.5"><LivePickChip status={l} /></div>}
                      </div>
                      <span className="font-mono text-[14px] font-semibold" style={{ color: p.result === 0 ? 'var(--color-loss)' : undefined, textDecoration: p.result === 0 ? 'line-through' : undefined }}>
                        {p.method === 'N/A' ? '–' : odds2(p.odds)}
                      </span>
                      {/* settlement can now precede window close (Sat evening vs
                          Sat midnight), so 'open' no longer hides the toggles */}
                      {isAdmin && gw?.status !== 'scheduled' ? (
                        <SettleToggle
                          pick={p}
                          suggested={suggestedResult(l?.live_state)}
                          onSettle={(r, reason) => settle.mutate({ pickId: p.id, result: r, reason })}
                        />
                      ) : (
                        <StateIcon result={p.result} />
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-end gap-3">
                      {canEdit && (
                        <button
                          onClick={() => setEditing(p)}
                          className="text-[10px] font-semibold underline underline-offset-2"
                          style={{ color: 'var(--color-accent-bright)' }}
                        >
                          Edit
                        </button>
                      )}
                      {me && !dispute && (
                        <button onClick={() => setDisputing(p)} className="text-[10px] font-semibold text-muted underline underline-offset-2">
                          Dispute
                        </button>
                      )}
                      {isAdmin && dispute && (
                        <DisputeActions dispute={dispute} onResolve={(status, note) => resolve.mutate({ did: dispute.id, status, note })} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {!loading && picks?.length === 0 && (
        <div className="rounded-[14px] bg-surface p-6 text-center text-sm text-muted">No picks recorded for this gameweek.</div>
      )}

      {(() => {
        const gwAdjs = (adjustments ?? []).filter((a) => a.gameweek_id === id)
        if (gwAdjs.length === 0) return null
        return (
          <div className="mb-5">
            <div className="overline mb-1.5 px-1">ADJUSTMENTS</div>
            <div className="rounded-[14px] bg-surface">
              {gwAdjs.map((a) => {
                const who = a.player_id
                  ? players.find((p) => p.id === a.player_id)
                  : null
                return (
                  <div key={a.id} className="flex items-center gap-2.5 border-b px-3.5 py-2.5 last:border-b-0" style={{ borderColor: 'var(--color-line)' }}>
                    <div className="min-w-0 flex-1">
                      <span className="text-[12.5px] font-semibold" style={{ color: who ? teamColor(who.acca_team) : teamColor(a.acca_team ?? '') }}>
                        {who?.name ?? a.acca_team ?? '—'}
                      </span>
                      <span className="ml-1.5 text-[11px] text-muted">{a.reason}</span>
                    </div>
                    <span
                      className="font-mono text-[13px] font-bold"
                      style={{ color: Number(a.score) >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}
                    >
                      {Number(a.score) >= 0 ? '+' : ''}
                      {Number(a.score).toFixed(2)}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (confirm('Remove this adjustment?')) removeAdj.mutate(a.id)
                        }}
                        className="font-mono text-[10px] underline"
                        style={{ color: 'var(--color-loss)' }}
                      >
                        REMOVE
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {settle.isError && (
        <p className="mt-2 text-center text-[11.5px]" style={{ color: 'var(--color-loss)' }}>
          {(settle.error as Error).message}
        </p>
      )}

      {disputing && me && (
        <DisputeSheet pick={disputing} raisedBy={me.id} onClose={() => setDisputing(null)} />
      )}

      {editing && gw && canEdit && (
        <EditPickSheet key={editing.id} pick={editing} gw={gw} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

/* Admin correction sheet for a closed window: pick + result saved together
   via admin_edit_pick (migration 0028). A no-pick re-settles at the team's
   average odds, server-side. Odds kept as text for the same reason as on
   Enter Pick (a controlled number swallows the decimal point). */
function EditPickSheet({ pick, gw, onClose }: { pick: PickScore; gw: Gameweek; onClose: () => void }) {
  const qc = useQueryClient()
  const wasNoPick = pick.method === 'N/A'
  const [method, setMethod] = useState<'Win' | 'BTTS' | 'None'>(
    wasNoPick ? 'None' : pick.method === 'BTTS' ? 'BTTS' : 'Win',
  )
  const [team, setTeam] = useState(wasNoPick ? '' : pick.team)
  const [secondTeam, setSecondTeam] = useState(pick.second_team ?? '')
  const [oddsText, setOddsText] = useState(wasNoPick ? '' : Number(pick.odds).toFixed(2))
  // A no-pick's 0 is a miss, not a call on the new selection — start unsettled.
  const [result, setResult] = useState<0 | 1 | null>(wasNoPick ? null : pick.result)
  const [reason, setReason] = useState<VoidReason | null>(wasNoPick ? null : pick.void_reason)
  const oddsNum = parseFloat(oddsText)

  const { data: teamDict } = useQuery({
    queryKey: ['teamDictionary'],
    queryFn: fetchTeamDictionary,
    staleTime: 10 * 60_000,
  })
  const options = useMemo(
    () => pickOptionsFor(teamDict ?? [], gw.is_international_break),
    [teamDict, gw.is_international_break],
  )

  const valid =
    method === 'None' ||
    (team.trim().length > 0 &&
      oddsNum >= 1 &&
      (method === 'Win' || secondTeam.trim().length > 0))

  const save = useMutation({
    mutationFn: () =>
      adminEditPick({
        gameweek_id: gw.id,
        player_id: pick.player_id,
        method: method === 'None' ? 'N/A' : method,
        team: method === 'None' ? 'N/A' : team.trim(),
        second_team: method === 'BTTS' ? secondTeam.trim() : null,
        odds: method === 'None' ? 1.5 : Math.round(oddsNum * 100) / 100,
        result: method === 'None' ? 0 : result,
        void_reason: method === 'None' ? null : reason,
      }),
    onSuccess: () => {
      // One pick can move week scores, sweeps/doubles, every leaderboard,
      // form, profiles and season honours — refetch the lot rather than
      // chase every key. Rare admin action, so the cost doesn't matter.
      qc.invalidateQueries()
      onClose()
    },
  })

  const segStyle = (on: boolean) =>
    on
      ? { background: 'rgba(180,227,61,0.1)', border: '1.5px solid var(--color-accent)', color: 'var(--color-accent-bright)' }
      : { borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[18px] bg-surface p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="display mb-1 text-lg">EDIT PICK — {pick.name}</div>
        <p className="mb-4 text-[11.5px] text-muted">
          {gwDate(gw.gw_date)} · window closed {ukTime(gw.window_closes)}. Saves straight to the
          record, re-scores the week and the tables, and is logged in the audit trail.
        </p>

        <div className="mb-3 flex gap-2">
          {(['Win', 'BTTS', 'None'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className="flex-1 rounded-[10px] border px-2 py-2.5 text-[13px] font-semibold"
              style={segStyle(method === m)}
            >
              {m === 'None' ? 'No pick' : m}
            </button>
          ))}
        </div>

        {method === 'None' ? (
          <p className="mb-4 text-[11.5px] text-muted">
            Settles as a miss at the team's average odds that week (−2 on form).
          </p>
        ) : (
          <>
            <div className="mb-3">
              <div className="overline mb-1.5">
                {gw.is_international_break ? 'SPORT' : method === 'BTTS' ? 'FIRST TEAM' : 'SELECTION'}
              </div>
              <TeamCombobox value={team} onChange={setTeam} options={options} placeholder="e.g. Southampton" />
            </div>
            {method === 'BTTS' && (
              <div className="mb-3">
                <div className="overline mb-1.5">SECOND TEAM</div>
                <TeamCombobox value={secondTeam} onChange={setSecondTeam} options={options} placeholder="e.g. Stockport" />
              </div>
            )}
            <div className="mb-3">
              <div className="overline mb-1.5">DECIMAL ODDS</div>
              <input
                inputMode="decimal"
                value={oddsText}
                placeholder="1.50"
                onChange={(e) => {
                  const v = e.target.value.replace(',', '.')
                  if (/^\d*\.?\d*$/.test(v)) setOddsText(v)
                }}
                className="w-full rounded-[10px] border bg-surface-2 py-2 text-center font-mono text-2xl font-bold"
                style={{ borderColor: 'var(--color-line-strong)' }}
              />
              {oddsNum > 0 && oddsNum < 1.5 && reason !== 'invalid' && (
                <p className="mt-1.5 text-[11px]" style={{ color: 'var(--color-gold)' }}>
                  Under 1.50 is an invalid pick — mark it INV below.
                </p>
              )}
            </div>
            <div className="mb-4">
              <div className="overline mb-1.5">RESULT</div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setResult(null)
                    setReason(null)
                  }}
                  className="flex-1 rounded-[10px] border px-2 py-2 text-[12px] font-semibold"
                  style={segStyle(result === null)}
                >
                  Pending
                </button>
                {SETTLE_OPTIONS.map((o) => (
                  <button
                    key={o.label}
                    title={o.title}
                    onClick={() => {
                      setResult(o.result)
                      setReason(o.reason)
                    }}
                    className="flex-1 rounded-[10px] border px-2 py-2 font-mono text-[12px] font-bold"
                    style={segStyle(result === o.result && reason === o.reason)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {save.isError && (
          <p className="mb-2 text-[11.5px]" style={{ color: 'var(--color-loss)' }}>
            {(save.error as Error).message}
          </p>
        )}
        <button
          disabled={!valid || save.isPending}
          onClick={() => save.mutate()}
          className="cta w-full rounded-[12px] py-3.5 text-[15px] font-bold disabled:opacity-40"
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
        >
          {save.isPending ? 'Saving…' : 'Save correction'}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted">
          {method === 'None'
            ? 'No pick — settles as a miss'
            : `${odds2(Number.isNaN(oddsNum) ? null : oddsNum)} on ${team || '…'} ${method === 'BTTS' ? `v ${secondTeam || '…'} (BTTS)` : 'to win'} · ${
                result === null ? 'pending' : SETTLE_OPTIONS.find((o) => o.result === result && o.reason === reason)?.label
              }`}
        </p>
      </div>
    </div>
  )
}

function DisputeActions({
  dispute,
  onResolve,
}: {
  dispute: Dispute
  onResolve: (status: 'upheld' | 'rejected', note: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[160px] truncate text-[10px] italic text-muted">“{dispute.reason}”</span>
      <button
        onClick={() => onResolve('upheld', 'Upheld — fixing the pick now')}
        className="rounded-[6px] border px-2 py-1 text-[10px] font-bold"
        style={{ borderColor: 'var(--color-win-solid)', color: 'var(--color-win)' }}
      >
        Uphold
      </button>
      <button
        onClick={() => onResolve('rejected', 'Reviewed — pick stands')}
        className="rounded-[6px] border px-2 py-1 text-[10px] font-bold"
        style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }}
      >
        Reject
      </button>
    </div>
  )
}

export default function GameweekDetail() {
  return (
    <RequireAuth>
      <GameweekDetailInner />
    </RequireAuth>
  )
}
