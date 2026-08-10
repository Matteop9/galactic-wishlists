import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createClaimToken,
  createGameweek,
  fetchAppConfig,
  fetchAudit,
  fetchClaimTokens,
  fetchDisputes,
  fetchGameweeks,
  fetchLlmUsage,
  resolveDispute,
  setAppConfig,
  setGameweekStatus,
  addAdjustment,
} from '../lib/queries'
import { usePlayer } from '../hooks/usePlayer'
import RequireAuth from '../components/RequireAuth'
import { GwStatusChip, PageTitle } from '../components/ui'
import { gwDate, longDate } from '../lib/format'

/* Admin: claim links, gameweek management, dispute queue, adjustments,
   the audit trail (who/what/when/IP/device) and LLM usage tracking. */

const CHECKLIST = [
  'Magic-link auth + claim for all six',
  'Pick entry in window, incl. one edit',
  'One dispute raised and resolved',
  'Fixture matching + one "no live option" pick',
  'Live chips + provisional table on Saturday',
  'FT settlement assist pre-fill',
  'Manual settle of unmatched picks',
  '2/2 pair sweep doubles correctly',
  'All-time table identical before/after',
  'Screenshot ingestion — DEFERRED',
  'Announcement graphic — DEFERRED',
]

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
  const [adj, setAdj] = useState({ player: '', gw: '', kind: 'Minus' as 'Bonus' | 'Minus', reason: '', score: '' })

  const { data: tokens } = useQuery({ queryKey: ['claimTokens'], queryFn: fetchClaimTokens, enabled: isAdmin })
  const { data: gws } = useQuery({ queryKey: ['gameweeks'], queryFn: fetchGameweeks })
  const { data: disputes } = useQuery({ queryKey: ['disputes'], queryFn: fetchDisputes })
  const { data: audit } = useQuery({ queryKey: ['audit'], queryFn: () => fetchAudit(50), enabled: isAdmin && showAudit })
  const { data: llm } = useQuery({ queryKey: ['llmUsage'], queryFn: fetchLlmUsage, enabled: isAdmin })
  const { data: checklist } = useQuery({
    queryKey: ['config', 'test_checklist'],
    queryFn: () => fetchAppConfig('test_checklist'),
    enabled: isAdmin,
  })

  const inv = (k: string) => qc.invalidateQueries({ queryKey: [k] })
  const genToken = useMutation({ mutationFn: createClaimToken, onSuccess: () => inv('claimTokens') })
  const gwStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setGameweekStatus(id, status),
    onSuccess: () => inv('gameweeks'),
  })
  const newGw = useMutation({ mutationFn: createGameweek, onSuccess: () => inv('gameweeks') })
  const resolve = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: 'upheld' | 'rejected'; note: string }) =>
      resolveDispute(id, status, note),
    onSuccess: () => inv('disputes'),
  })
  const saveChecklist = useMutation({
    mutationFn: (ticked: number[]) => setAppConfig('test_checklist', ticked),
    onSuccess: () => inv('config'),
  })
  const addAdj = useMutation({
    mutationFn: () =>
      addAdjustment({
        gameweek_id: adj.gw,
        player_id: adj.player || null,
        acca_team: adj.player ? null : 'VDL',
        kind: adj.kind,
        reason: adj.reason,
        score: (adj.kind === 'Minus' ? -1 : 1) * Math.abs(parseFloat(adj.score)),
      }),
    onSuccess: () => setAdj({ player: '', gw: '', kind: 'Minus', reason: '', score: '' }),
  })

  if (!isAdmin)
    return (
      <div className="px-4">
        <PageTitle>ADMIN</PageTitle>
        <div className="rounded-[14px] bg-surface p-6 text-center text-sm text-muted">Admins only.</div>
      </div>
    )

  const ticked = new Set<number>((checklist as number[] | null) ?? [])
  const openDisputes = (disputes ?? []).filter((d) => d.status === 'open')
  const today = new Date().toISOString().slice(0, 10)
  const nearGws = (gws ?? []).filter((g) => g.gw_date >= today).slice(0, 4)
  const totalTokens = (llm ?? []).reduce((s, u) => s + (u.total_tokens ?? 0), 0)
  const totalCost = (llm ?? []).reduce((s, u) => s + Number(u.cost_usd ?? 0), 0)

  const playerName = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'system'

  return (
    <div className="px-4 pb-6">
      <PageTitle>ADMIN</PageTitle>

      <Section title="CLAIM LINKS">
        {players.map((p) => {
          const token = tokens?.find((t) => t.player_id === p.id)
          const claimed = !!p.auth_user_id
          return (
            <div key={p.id} className="flex items-center justify-between border-b py-2 last:border-b-0" style={{ borderColor: 'var(--color-line)' }}>
              <span className="text-[13px] font-semibold">
                {p.name}
                {p.is_admin && <span className="ml-1.5 font-mono text-[9px] text-muted">ADMIN</span>}
              </span>
              {claimed ? (
                <span className="font-mono text-[10px]" style={{ color: 'var(--color-win)' }}>CLAIMED</span>
              ) : token ? (
                <button
                  className="font-mono text-[10px] underline"
                  style={{ color: 'var(--color-accent)' }}
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/claim/${token.token}`)}
                >
                  COPY LINK
                </button>
              ) : (
                <button
                  className="font-mono text-[10px] text-muted underline"
                  onClick={() => genToken.mutate(p.id)}
                >
                  GENERATE
                </button>
              )}
            </div>
          )
        })}
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

      <Section title="GAMEWEEKS">
        {nearGws.map((g) => (
          <div key={g.id} className="flex items-center justify-between border-b py-2 last:border-b-0" style={{ borderColor: 'var(--color-line)' }}>
            <span className="font-mono text-[12px]">{gwDate(g.gw_date)}</span>
            <div className="flex items-center gap-2">
              <GwStatusChip status={g.status} />
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
              <option value="">Team-level (VDL)</option>
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

      <Section title="TEST WEEKEND CHECKLIST">
        {CHECKLIST.map((item, i) => {
          const deferred = item.includes('DEFERRED')
          const on = ticked.has(i)
          return (
            <button
              key={i}
              disabled={deferred}
              onClick={() => {
                const next = new Set(ticked)
                if (on) next.delete(i)
                else next.add(i)
                saveChecklist.mutate([...next])
              }}
              className="flex w-full items-center gap-2.5 border-b py-2 text-left last:border-b-0 disabled:opacity-40"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <span
                className="flex h-4 w-4 items-center justify-center rounded-[4px] border font-mono text-[9px]"
                style={
                  on
                    ? { background: 'var(--color-win-solid)', borderColor: 'var(--color-win-solid)', color: '#EAF0E6' }
                    : { borderColor: 'var(--color-line-strong)' }
                }
              >
                {on ? '✓' : ''}
              </span>
              <span className="text-[12px]" style={{ color: deferred ? 'var(--color-muted)' : undefined }}>
                {item.replace(' — DEFERRED', '')}
                {deferred && <span className="ml-1.5 font-mono text-[9px] uppercase text-muted">deferred</span>}
              </span>
            </button>
          )
        })}
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
