import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminResetPassword,
  adminUnlinkPlayer,
  createGameweek,
  deleteAdjustment,
  fetchAdjustments,
  fetchAppConfig,
  fetchAudit,
  fetchDisputes,
  fetchFeedback,
  fetchGameweeks,
  fetchLlmUsage,
  fetchPlayerAccounts,
  resolveDispute,
  setAppConfig,
  setFeedbackStatus,
  setGameweekStatus,
  setIntlBreak,
  addAdjustment,
} from '../lib/queries'
import { usePlayer } from '../hooks/usePlayer'
import RequireAuth from '../components/RequireAuth'
import { GwStatusChip, PageTitle, teamColor } from '../components/ui'
import { ChampStars } from '../components/ChampStars'
import { gwDate, londonToday, longDate } from '../lib/format'
import type { Feedback } from '../lib/types'

/* Admin: account management, gameweeks, dispute queue, adjustments,
   the audit trail (who/what/when/IP/device) and LLM usage tracking. */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="overline mb-2 px-1">{title}</div>
      <div className="rounded-[14px] bg-surface p-3.5">{children}</div>
    </div>
  )
}

function AdminInner() {
  const qc = useQueryClient()
  const { players, isAdmin } = usePlayer()
  const [showAudit, setShowAudit] = useState(false)
  const [newGwDate, setNewGwDate] = useState('')
  const [resetting, setResetting] = useState<{ id: string; pw: string } | null>(null)
  const [adj, setAdj] = useState({ player: 'team:VDL', gw: '', kind: 'Minus' as 'Bonus' | 'Minus', reason: '', score: '' })

  const { data: accounts } = useQuery({ queryKey: ['playerAccounts'], queryFn: fetchPlayerAccounts, enabled: isAdmin })
  const { data: joinCode } = useQuery({
    queryKey: ['config', 'join_code'],
    queryFn: () => fetchAppConfig('join_code'),
    enabled: isAdmin,
  })
  const { data: gws } = useQuery({ queryKey: ['gameweeks'], queryFn: fetchGameweeks })
  const { data: disputes } = useQuery({ queryKey: ['disputes'], queryFn: fetchDisputes })
  const { data: audit } = useQuery({ queryKey: ['audit'], queryFn: () => fetchAudit(50), enabled: isAdmin && showAudit })
  const { data: llm } = useQuery({ queryKey: ['llmUsage'], queryFn: fetchLlmUsage, enabled: isAdmin })
  const { data: feedback } = useQuery({ queryKey: ['feedback'], queryFn: fetchFeedback, enabled: isAdmin })
  const { data: adjustments } = useQuery({ queryKey: ['adjustments'], queryFn: fetchAdjustments, enabled: isAdmin })

  const inv = (k: string) => qc.invalidateQueries({ queryKey: [k] })
  const resetPw = useMutation({
    mutationFn: ({ id, pw }: { id: string; pw: string }) => adminResetPassword(id, pw),
  })
  const unlink = useMutation({
    mutationFn: adminUnlinkPlayer,
    onSuccess: () => {
      inv('playerAccounts')
      inv('players')
    },
  })
  const saveCode = useMutation({
    mutationFn: (c: string) => setAppConfig('join_code', c),
    onSuccess: () => inv('config'),
  })
  const gwStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setGameweekStatus(id, status),
    onSuccess: () => inv('gameweeks'),
  })
  const newGw = useMutation({ mutationFn: createGameweek, onSuccess: () => inv('gameweeks') })
  const intlBreak = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => setIntlBreak(id, on),
    onSuccess: () => {
      inv('gameweeks')
      inv('currentGw')
    },
  })
  const resolve = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: 'upheld' | 'rejected'; note: string }) =>
      resolveDispute(id, status, note),
    onSuccess: () => inv('disputes'),
  })
  const feedbackStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Feedback['status'] }) => setFeedbackStatus(id, status),
    onSuccess: () => inv('feedback'),
  })
  const removeAdj = useMutation({
    mutationFn: deleteAdjustment,
    onSuccess: () => {
      inv('adjustments')
      inv('leaderboard')
    },
  })
  const addAdj = useMutation({
    mutationFn: () => {
      const isTeam = adj.player.startsWith('team:')
      return addAdjustment({
        gameweek_id: adj.gw,
        player_id: isTeam ? null : adj.player,
        acca_team: isTeam ? adj.player.slice(5) : null,
        kind: adj.kind,
        reason: adj.reason,
        score: (adj.kind === 'Minus' ? -1 : 1) * Math.abs(parseFloat(adj.score)),
      })
    },
    onSuccess: () => {
      setAdj({ player: 'team:VDL', gw: '', kind: 'Minus', reason: '', score: '' })
      inv('adjustments')
      inv('leaderboard')
    },
  })

  if (!isAdmin)
    return (
      <div className="px-4">
        <PageTitle>ADMIN</PageTitle>
        <div className="rounded-[14px] bg-surface p-6 text-center text-sm text-muted">Admins only.</div>
      </div>
    )

  const openDisputes = (disputes ?? []).filter((d) => d.status === 'open')
  const today = londonToday()
  const nearGws = (gws ?? []).filter((g) => g.gw_date >= today).slice(0, 4)
  const totalTokens = (llm ?? []).reduce((s, u) => s + (u.total_tokens ?? 0), 0)
  const totalCost = (llm ?? []).reduce((s, u) => s + Number(u.cost_usd ?? 0), 0)

  const playerName = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'system'

  return (
    <div className="px-4 pb-6">
      <PageTitle>ADMIN</PageTitle>

      <Section title="ACCOUNTS">
        <div className="mb-3 flex items-center gap-2">
          <span className="overline shrink-0">GROUP CODE</span>
          <input
            defaultValue={(joinCode as string) ?? ''}
            key={(joinCode as string) ?? ''}
            onBlur={(e) => e.target.value && e.target.value !== joinCode && saveCode.mutate(e.target.value)}
            className="w-32 rounded-[8px] border bg-surface-2 px-2 py-1 font-mono text-[12px] font-bold"
            style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-accent)' }}
          />
          <span className="text-[10px] text-muted">needed to register — share in the chat</span>
        </div>
        {players.map((p) => {
          const account = accounts?.find((a) => a.player_id === p.id)
          return (
            <div key={p.id} className="border-b py-2 last:border-b-0" style={{ borderColor: 'var(--color-line)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold" style={{ color: teamColor(p.acca_team) }}>
                  {p.name}
                  <ChampStars playerId={p.id} size={9} />
                  {p.is_admin && <span className="ml-1.5 font-mono text-[9px] text-muted">ADMIN</span>}
                  {account && <span className="ml-1.5 font-mono text-[10px] text-muted">@{account.username}</span>}
                </span>
                {account ? (
                  <span className="flex gap-2.5">
                    <button
                      className="font-mono text-[10px] text-muted underline"
                      onClick={() => setResetting(resetting?.id === p.id ? null : { id: p.id, pw: '' })}
                    >
                      RESET PW
                    </button>
                    <button
                      className="font-mono text-[10px] underline"
                      style={{ color: 'var(--color-loss)' }}
                      onClick={() => {
                        if (confirm(`Remove ${p.name}'s account so they can re-register?`)) unlink.mutate(p.id)
                      }}
                    >
                      UNLINK
                    </button>
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-muted">NOT REGISTERED</span>
                )}
              </div>
              {resetting?.id === p.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="password"
                    autoFocus
                    value={resetting.pw}
                    onChange={(e) => setResetting({ id: p.id, pw: e.target.value })}
                    placeholder={`New password for ${p.name} (min 8)`}
                    className="flex-1 rounded-[8px] border bg-surface-2 px-2 py-1 text-[12px]"
                    style={{ borderColor: 'var(--color-line-strong)' }}
                  />
                  <button
                    disabled={resetting.pw.length < 8 || resetPw.isPending}
                    onClick={() => {
                      resetPw.mutate({ id: p.id, pw: resetting.pw })
                      setResetting(null)
                    }}
                    className="rounded-[8px] px-3 text-[11px] font-bold disabled:opacity-40"
                    style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
                  >
                    Save
                  </button>
                  <button onClick={() => setResetting(null)} className="font-mono text-[10px] text-muted underline">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {(resetPw.isError || unlink.isError) && (
          <p className="mt-1 text-[11px]" style={{ color: 'var(--color-loss)' }}>
            {((resetPw.error ?? unlink.error) as Error).message}
          </p>
        )}
        {resetPw.isSuccess && <p className="mt-1 text-[11px]" style={{ color: 'var(--color-win)' }}>Password reset ✓</p>}
      </Section>

      <Section title="DISPUTES">
        {openDisputes.map((d) => (
          <div key={d.id} className="border-b py-2 last:border-b-0" style={{ borderColor: 'var(--color-line)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold capitalize">
                {d.kind} dispute · {playerName(d.raised_by)}
              </span>
              <span className="font-mono text-[9px] text-muted">{longDate(d.created_at.slice(0, 10))}</span>
            </div>
            <p className="my-1 text-[11.5px] italic text-muted">“{d.reason}”</p>
            <div className="flex gap-2">
              <button
                onClick={() => resolve.mutate({ id: d.id, status: 'upheld', note: 'Upheld' })}
                className="rounded-[6px] border px-2.5 py-1 text-[10px] font-bold"
                style={{ borderColor: 'var(--color-win-solid)', color: 'var(--color-win)' }}
              >
                Uphold
              </button>
              <button
                onClick={() => resolve.mutate({ id: d.id, status: 'rejected', note: 'Pick stands' })}
                className="rounded-[6px] border px-2.5 py-1 text-[10px] font-bold"
                style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
        {openDisputes.length === 0 && <p className="text-[12px] text-muted">No open disputes.</p>}
      </Section>

      <Section title="FEEDBACK QUEUE">
        {(feedback ?? []).map((f) => (
          <div key={f.id} className="border-b py-2 last:border-b-0" style={{ borderColor: 'var(--color-line)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold" style={{ color: teamColor(players.find((p) => p.id === f.player_id)?.acca_team ?? '') }}>
                {playerName(f.player_id)}
              </span>
              <span className="font-mono text-[9px] text-muted">{longDate(f.created_at.slice(0, 10))}</span>
            </div>
            <p className="my-1 text-[11.5px] text-muted">{f.message}</p>
            <div className="flex gap-1.5">
              {(['new', 'planned', 'done', 'dismissed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => feedbackStatus.mutate({ id: f.id, status: s })}
                  className="rounded-[6px] border px-2 py-0.5 font-mono text-[9px] font-bold uppercase"
                  style={
                    f.status === s
                      ? { background: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: 'var(--color-on-accent)' }
                      : { borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
        {(feedback ?? []).length === 0 && <p className="text-[12px] text-muted">No feedback yet.</p>}
      </Section>

      <Section title="GAMEWEEKS">
        {nearGws.map((g) => (
          <div key={g.id} className="flex items-center justify-between border-b py-2 last:border-b-0" style={{ borderColor: 'var(--color-line)' }}>
            <span className="font-mono text-[12px]">{gwDate(g.gw_date)}</span>
            <div className="flex items-center gap-2">
              <GwStatusChip status={g.status} />
              <button
                className="font-mono text-[10px] underline"
                title="International break: sport picks instead of clubs, live scores off"
                style={{ color: g.is_international_break ? 'var(--color-jhp)' : 'var(--color-muted)' }}
                onClick={() => intlBreak.mutate({ id: g.id, on: !g.is_international_break })}
              >
                {g.is_international_break ? '🌍 BREAK ON' : 'BREAK'}
              </button>
              <button
                className="font-mono text-[10px] text-muted underline"
                onClick={() => gwStatus.mutate({ id: g.id, status: g.status === 'skipped' ? 'scheduled' : 'skipped' })}
              >
                {g.status === 'skipped' ? 'RESTORE' : 'SKIP'}
              </button>
            </div>
          </div>
        ))}
        <div className="mt-2 flex gap-2">
          <input
            type="date"
            value={newGwDate}
            onChange={(e) => setNewGwDate(e.target.value)}
            className="flex-1 rounded-[10px] border bg-surface-2 px-3 py-2 text-[13px]"
            style={{ borderColor: 'var(--color-line-strong)', colorScheme: 'dark' }}
          />
          <button
            disabled={!newGwDate || newGw.isPending}
            onClick={() => newGw.mutate(newGwDate)}
            className="rounded-[10px] px-4 text-[12px] font-bold disabled:opacity-40"
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            Add GW
          </button>
        </div>
        {newGw.isError && <p className="mt-1 text-[11px]" style={{ color: 'var(--color-loss)' }}>{(newGw.error as Error).message}</p>}
      </Section>

      <Section title="ADJUSTMENT (BONUS / MINUS)">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <select value={adj.player} onChange={(e) => setAdj({ ...adj, player: e.target.value })} className="flex-1 rounded-[10px] border bg-surface-2 px-2 py-2 text-[12px]" style={{ borderColor: 'var(--color-line-strong)' }}>
              <option value="team:VDL">Team · VDL</option>
              <option value="team:JHP">Team · JHP</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={adj.gw} onChange={(e) => setAdj({ ...adj, gw: e.target.value })} className="flex-1 rounded-[10px] border bg-surface-2 px-2 py-2 text-[12px]" style={{ borderColor: 'var(--color-line-strong)' }}>
              <option value="">Gameweek…</option>
              {(gws ?? []).filter((g) => g.gw_date >= '2026-08-01').map((g) => <option key={g.id} value={g.id}>{g.gw_date}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <select value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value as 'Bonus' | 'Minus' })} className="w-24 rounded-[10px] border bg-surface-2 px-2 py-2 text-[12px]" style={{ borderColor: 'var(--color-line-strong)' }}>
              <option>Minus</option>
              <option>Bonus</option>
            </select>
            <input placeholder="Points" inputMode="decimal" value={adj.score} onChange={(e) => setAdj({ ...adj, score: e.target.value })} className="w-20 rounded-[10px] border bg-surface-2 px-2 py-2 font-mono text-[12px]" style={{ borderColor: 'var(--color-line-strong)' }} />
            <input placeholder="Reason (required)" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} className="flex-1 rounded-[10px] border bg-surface-2 px-2 py-2 text-[12px]" style={{ borderColor: 'var(--color-line-strong)' }} />
          </div>
          <button
            disabled={!adj.gw || !adj.reason || !adj.score || addAdj.isPending}
            onClick={() => addAdj.mutate()}
            className="rounded-[10px] py-2 text-[12px] font-bold disabled:opacity-40"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-line-strong)' }}
          >
            {addAdj.isSuccess ? 'Added ✓' : 'Apply adjustment'}
          </button>
        </div>
        {(adjustments ?? []).length > 0 && (
          <div className="mt-3 border-t pt-1" style={{ borderColor: 'var(--color-line)' }}>
            {(adjustments ?? []).map((a) => {
              const g = (gws ?? []).find((x) => x.id === a.gameweek_id)
              return (
                <div key={a.id} className="flex items-center gap-2 border-b py-2 last:border-b-0" style={{ borderColor: 'var(--color-line)' }}>
                  <span className="w-[52px] shrink-0 font-mono text-[10px] text-muted">{g ? g.gw_date.slice(5) : '—'}</span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px]">
                    <span className="font-semibold">{a.player_id ? playerName(a.player_id) : a.acca_team}</span>
                    <span className="text-muted"> · {a.reason}</span>
                  </span>
                  <span className="font-mono text-[12px] font-bold" style={{ color: Number(a.score) >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {Number(a.score) >= 0 ? '+' : ''}
                    {Number(a.score).toFixed(2)}
                  </span>
                  <button
                    onClick={() => {
                      if (confirm('Remove this adjustment?')) removeAdj.mutate(a.id)
                    }}
                    className="font-mono text-[10px] underline"
                    style={{ color: 'var(--color-loss)' }}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="LLM USAGE (OPENROUTER — LIMITED KEY)">
        <div className="mb-2 flex gap-4">
          <div>
            <div className="overline">CALLS</div>
            <div className="font-mono text-[18px] font-bold">{llm?.length ?? 0}</div>
          </div>
          <div>
            <div className="overline">TOKENS</div>
            <div className="font-mono text-[18px] font-bold">{totalTokens.toLocaleString('en-GB')}</div>
          </div>
          <div>
            <div className="overline">EST. COST</div>
            <div className="font-mono text-[18px] font-bold">${totalCost.toFixed(4)}</div>
          </div>
        </div>
        {(llm ?? []).slice(0, 5).map((u) => (
          <div key={u.id} className="flex justify-between border-t py-1.5 font-mono text-[10px] text-muted" style={{ borderColor: 'var(--color-line)' }}>
            <span>{u.job} · {u.model}{u.ok ? '' : ' · FAILED'}</span>
            <span>{u.total_tokens ?? '–'} tok</span>
          </div>
        ))}
        {(llm ?? []).length === 0 && <p className="text-[12px] text-muted">No LLM calls yet.</p>}
      </Section>

      <Section title="AUDIT TRAIL">
        {!showAudit ? (
          <button onClick={() => setShowAudit(true)} className="text-[12px] font-semibold underline" style={{ color: 'var(--color-accent)' }}>
            Load recent activity
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {(audit ?? []).map((a) => (
              <div key={a.id} className="border-b pb-2 last:border-b-0" style={{ borderColor: 'var(--color-line)' }}>
                <div className="flex justify-between font-mono text-[10px]">
                  <span>
                    <span style={{ color: 'var(--color-accent)' }}>{a.action}</span> {a.table_name} · {playerName(a.actor_player)}
                  </span>
                  <span className="text-muted">{new Date(a.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-muted">
                  {a.ip ?? 'no ip'} · {a.user_agent ? a.user_agent.slice(0, 60) : 'system'}
                </div>
              </div>
            ))}
            {(audit ?? []).length === 0 && <p className="text-[12px] text-muted">Nothing logged yet.</p>}
          </div>
        )}
      </Section>
    </div>
  )
}

export default function Admin() {
  return (
    <RequireAuth>
      <AdminInner />
    </RequireAuth>
  )
}
