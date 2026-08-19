import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addRulesSection,
  adminResetPassword,
  adminUnlinkPlayer,
  addAdjustment,
  createGameweek,
  createMiniLeague,
  deleteAdjustment,
  deleteMiniLeague,
  deleteRulesSection,
  fetchAdjustments,
  fetchAudit,
  fetchAppConfig,
  fetchGameweeks,
  fetchMiniLeagues,
  fetchFeedback,
  fetchPickScores,
  fetchPlayerAccounts,
  fetchRules,
  setFeedbackStatus,
  fetchSeasons,
  saveRulesSection,
  setAppConfig,
  setGameweekStatus,
  setGwMiniLeague,
  settlePick,
  lockPick,
} from '../lib/queries'
import { usePlayer } from '../hooks/usePlayer'
import { gwDate, odds2, ukTime } from '../lib/format'
import { GwStatusChip, Overline, PageTitle, playerColor, KindBadge } from '../components/ui'
import type { RulesSection } from '../lib/types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-3 overflow-hidden rounded-[14px] bg-surface">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3.5"
      >
        <span className="display text-[15px]">{title}</span>
        <span className="font-mono text-[12px] text-muted">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="border-t px-4 py-4" style={{ borderColor: 'var(--color-line)' }}>{children}</div>}
    </div>
  )
}

const inputCls = 'w-full rounded-[10px] border bg-surface-2 px-3 py-2.5 text-[14px]'
const inputStyle = { borderColor: 'var(--color-line-strong)' }
const btnCls = 'rounded-[8px] px-3 py-2 text-[12px] font-bold'

/** One editable rules section: title + one item per line. Saves via RPC-less
    table update — the audit trigger records old/new rows and the actor. */
function RuleEditor({
  section,
  onSave,
  onDelete,
}: {
  section: RulesSection
  onSave: (s: { id: string; sort: number; title: string; items: string[] }) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState(section.title)
  const [text, setText] = useState(section.items.join('\n'))
  const dirty = title !== section.title || text !== section.items.join('\n')
  return (
    <div className="rounded-[10px] border p-2.5" style={inputStyle}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputCls} mb-2`} style={inputStyle} />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.max(3, section.items.length + 1)}
        placeholder="One rule per line"
        className={`${inputCls} mb-2 resize-y`}
        style={inputStyle}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            onSave({
              id: section.id,
              sort: section.sort,
              title: title.trim(),
              items: text.split('\n').map((l) => l.trim()).filter(Boolean),
            })
          }
          disabled={!dirty || !title.trim()}
          className={`${btnCls} disabled:opacity-40`}
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
        >
          Save
        </button>
        {dirty && <span className="text-[11px]" style={{ color: 'var(--color-gold)' }}>unsaved</span>}
        <button
          onClick={() => confirm(`Delete section "${section.title}"?`) && onDelete(section.id)}
          className="ml-auto font-mono text-[10px] text-muted underline"
        >
          delete section
        </button>
      </div>
    </div>
  )
}

export default function Admin() {
  const { isAdmin, players, loading } = usePlayer()
  const qc = useQueryClient()

  const { data: gws } = useQuery({ queryKey: ['gameweeks'], queryFn: fetchGameweeks })
  const [settleGw, setSettleGw] = useState<string>('')
  const { data: picks } = useQuery({
    queryKey: ['pickScores', settleGw],
    queryFn: () => fetchPickScores(settleGw),
    enabled: !!settleGw,
  })
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: fetchPlayerAccounts, enabled: isAdmin })
  const { data: adjustments } = useQuery({ queryKey: ['adjustments'], queryFn: fetchAdjustments })
  const { data: audit } = useQuery({ queryKey: ['audit'], queryFn: () => fetchAudit(50), enabled: isAdmin })
  const { data: joinCode } = useQuery({
    queryKey: ['joinCode'],
    queryFn: () => fetchAppConfig('join_code'),
    enabled: isAdmin,
  })
  const { data: minis } = useQuery({ queryKey: ['miniLeagues'], queryFn: fetchMiniLeagues, enabled: isAdmin })
  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: fetchSeasons, enabled: isAdmin })
  const { data: rules } = useQuery({ queryKey: ['rules'], queryFn: fetchRules, enabled: isAdmin })
  const { data: feedback } = useQuery({ queryKey: ['feedback'], queryFn: fetchFeedback, enabled: isAdmin })
  const [newMiniName, setNewMiniName] = useState('')

  const [newGwDate, setNewGwDate] = useState('')
  const [resetFor, setResetFor] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newCode, setNewCode] = useState('')
  const [adj, setAdj] = useState({ gameweek_id: '', player_id: '', kind: 'Minus' as 'Bonus' | 'Minus', reason: '', score: '' })
  const [msg, setMsg] = useState<string | null>(null)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['miniLeagues'] })
    qc.invalidateQueries({ queryKey: ['miniLeaderboard'] })
    qc.invalidateQueries({ queryKey: ['rules'] })
    qc.invalidateQueries({ queryKey: ['feedback'] })
    qc.invalidateQueries({ queryKey: ['gameweeks'] })
    qc.invalidateQueries({ queryKey: ['pickScores'] })
    qc.invalidateQueries({ queryKey: ['playerWeeks'] })
    qc.invalidateQueries({ queryKey: ['leaderboard'] })
    qc.invalidateQueries({ queryKey: ['adjustments'] })
    qc.invalidateQueries({ queryKey: ['accounts'] })
    qc.invalidateQueries({ queryKey: ['currentGw'] })
    qc.invalidateQueries({ queryKey: ['audit'] })
  }

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      setMsg('Done')
      invalidate()
    },
    onError: (e) => setMsg((e as Error).message),
  })

  if (loading) return null
  if (!isAdmin)
    return (
      <div className="flex min-h-[60dvh] items-center justify-center px-8 text-center">
        <span className="text-[13px] text-muted">Admins only.</span>
      </div>
    )

  const settleBtn = (
    pickId: string,
    label: string,
    result: 0 | 1 | null,
    voidReason: 'invalid' | 'postponed' | null,
    color: string,
  ) => (
    <button
      key={label}
      onClick={() => run.mutate(() => settlePick(pickId, result, voidReason))}
      className="rounded-[6px] border px-2 py-1 font-mono text-[10px] font-bold"
      style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, color }}
    >
      {label}
    </button>
  )

  return (
    <div className="px-4 pb-6">
      <PageTitle>Admin</PageTitle>
      {msg && (
        <p className="mb-3 px-1 text-[12px]" style={{ color: msg === 'Done' ? 'var(--color-win)' : 'var(--color-loss)' }}>
          {msg}
        </p>
      )}

      <Section title="Gameweeks">
        <div className="mb-3 flex gap-2">
          <input type="date" value={newGwDate} onChange={(e) => setNewGwDate(e.target.value)} className={inputCls} style={inputStyle} />
          <button
            onClick={() => newGwDate && run.mutate(() => createGameweek(newGwDate))}
            className={btnCls}
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            Create
          </button>
        </div>
        <p className="mb-2 text-[11px] text-muted">
          The second dropdown puts a gameweek in (or takes it out of) a mini league.
        </p>
        <div className="flex flex-col gap-2">
          {[...(gws ?? [])].reverse().map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-semibold">{gwDate(g.gw_date)}</span>
              <div className="flex items-center gap-2">
                <GwStatusChip status={g.status} />
                <select
                  value={g.status}
                  onChange={(e) => {
                    // capture before mutate: the controlled select resets to its
                    // prop value on re-render, so a later e.target.value read is stale
                    const v = e.target.value
                    run.mutate(() => setGameweekStatus(g.id, v))
                  }}
                  className="rounded-[8px] border bg-surface-2 px-2 py-1 text-[11px]"
                  style={inputStyle}
                >
                  {['scheduled', 'open', 'closed', 'settled', 'skipped'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={g.mini_league_id ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    run.mutate(() => setGwMiniLeague(g.id, v || null))
                  }}
                  className="max-w-[110px] rounded-[8px] border bg-surface-2 px-2 py-1 text-[11px]"
                  style={{
                    ...inputStyle,
                    color: g.mini_league_id ? 'var(--color-gold)' : 'var(--color-muted)',
                  }}
                >
                  <option value="">no mini</option>
                  {(minis ?? []).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Mini leagues">
        <p className="mb-3 text-[11.5px] text-muted">
          Create a mini league here, then assign gameweeks to it from the Gameweeks section
          above. The Standings → Mini tab shows its table.
        </p>
        <div className="mb-3 flex gap-2">
          <input
            value={newMiniName}
            onChange={(e) => setNewMiniName(e.target.value)}
            placeholder="e.g. Christmas Mini League"
            className={inputCls}
            style={inputStyle}
          />
          <button
            onClick={() => {
              const season = (seasons ?? [])[(seasons ?? []).length - 1]
              if (!newMiniName.trim() || !season) return
              run.mutate(async () => {
                await createMiniLeague(season.id, newMiniName.trim())
                setNewMiniName('')
              })
            }}
            className={btnCls}
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            Create
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {(minis ?? []).map((m) => {
            const count = (gws ?? []).filter((g) => g.mini_league_id === m.id).length
            return (
              <div key={m.id} className="flex items-center justify-between text-[12.5px]">
                <span className="font-semibold">{m.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted">{count} GW{count === 1 ? '' : 's'}</span>
                  <button
                    onClick={() => {
                      if (count > 0) {
                        setMsg('Unassign its gameweeks first (Gameweeks section)')
                        return
                      }
                      if (confirm(`Delete "${m.name}"?`)) run.mutate(() => deleteMiniLeague(m.id))
                    }}
                    className="font-mono text-[10px] text-muted underline"
                  >
                    delete
                  </button>
                </div>
              </div>
            )
          })}
          {(minis ?? []).length === 0 && <p className="text-[12px] text-muted">None yet.</p>}
        </div>
      </Section>

      <Section title="Rules">
        <p className="mb-3 text-[11.5px] text-muted">
          Edits go live on the Rules page immediately and every change is recorded in the audit
          trail (who, when, old wording, new wording). One rule per line.
        </p>
        <div className="flex flex-col gap-3">
          {(rules ?? []).map((s) => (
            <RuleEditor
              key={s.id}
              section={s}
              onSave={(next) => run.mutate(() => saveRulesSection(next))}
              onDelete={(id) => run.mutate(() => deleteRulesSection(id))}
            />
          ))}
          <button
            onClick={() => {
              const maxSort = Math.max(0, ...(rules ?? []).map((s) => s.sort))
              run.mutate(() =>
                addRulesSection({ sort: maxSort + 1, title: 'New section', items: ['New rule'] }),
              )
            }}
            className="rounded-[10px] border py-2.5 text-[12.5px] font-semibold text-muted"
            style={inputStyle}
          >
            + Add section
          </button>
        </div>
      </Section>

      <Section title="Settle picks">
        <select
          value={settleGw}
          onChange={(e) => setSettleGw(e.target.value)}
          className={`${inputCls} mb-3`}
          style={inputStyle}
        >
          <option value="">Pick a gameweek…</option>
          {[...(gws ?? [])].reverse().map((g) => (
            <option key={g.id} value={g.id}>{gwDate(g.gw_date)} · {g.status}</option>
          ))}
        </select>
        <div className="flex flex-col gap-3">
          {(picks ?? []).map((p) => (
            <div key={p.id} className="rounded-[10px] border p-2.5" style={inputStyle}>
              <div className="mb-1.5 flex items-center gap-1.5">
                <KindBadge kind={p.acca_kind} />
                <span className="text-[12.5px] font-bold" style={{ color: playerColor(p.name) }}>{p.name}</span>
                <span className="ml-auto font-mono text-[11.5px] text-muted">{p.odds_display ?? odds2(p.odds)}</span>
              </div>
              <div className="mb-2 truncate text-[11.5px] text-muted">
                {p.is_no_pick ? 'No pick' : p.game ? `${p.game} — ${p.selection}` : p.selection}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {settleBtn(p.id, 'WIN', 1, null, 'var(--color-win)')}
                {settleBtn(p.id, 'LOSE', 0, null, 'var(--color-loss)')}
                {settleBtn(p.id, 'PP', 0, 'postponed', 'var(--color-muted)')}
                {settleBtn(p.id, 'INV', 0, 'invalid', 'var(--color-muted)')}
                {settleBtn(p.id, 'CLEAR', null, null, 'var(--color-muted)')}
                <button
                  onClick={() => run.mutate(() => lockPick(p.id, !p.locked))}
                  className="ml-auto rounded-[6px] border px-2 py-1 font-mono text-[10px] font-bold"
                  style={{ borderColor: 'var(--color-line-strong)', color: p.locked ? 'var(--color-gold)' : 'var(--color-muted)' }}
                >
                  {p.locked ? 'LOCKED' : 'LOCK'}
                </button>
                <span className="font-mono text-[11px]" style={{ color: p.result === 1 ? 'var(--color-win)' : p.result === 0 ? 'var(--color-loss)' : 'var(--color-muted)' }}>
                  {p.result === 1 ? '✓' : p.result === 0 ? (p.void_reason ? 'void' : '✗') : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Accounts">
        <p className="mb-3 text-[11.5px] text-muted">
          ⚠ Accounts are shared with The Acca — resetting a password here changes it in both
          apps. Unlinking only frees the Milky Bay name; the login survives if they play The Acca.
        </p>
        <div className="mb-4 flex flex-col gap-1.5">
          {players.map((p) => {
            const acc = (accounts ?? []).find((a) => a.player_id === p.id)
            return (
              <div key={p.id} className="flex items-center justify-between text-[12.5px]">
                <span className="font-semibold" style={{ color: playerColor(p.name) }}>{p.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted">{acc ? `@${acc.username}` : 'unclaimed'}</span>
                  {acc && (
                    <button
                      onClick={() => {
                        if (confirm(`Unlink ${p.name}'s Milky Bay name?`))
                          run.mutate(() => adminUnlinkPlayer(p.id))
                      }}
                      className="rounded-[6px] border px-2 py-0.5 font-mono text-[10px]"
                      style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-loss)' }}
                    >
                      UNLINK
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <Overline className="mb-1.5">RESET PASSWORD (BOTH APPS)</Overline>
        <div className="flex gap-2">
          <select value={resetFor} onChange={(e) => setResetFor(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">Player…</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password" className={inputCls} style={inputStyle} />
          <button
            onClick={() => resetFor && newPw && run.mutate(() => adminResetPassword(resetFor, newPw))}
            className={btnCls}
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            Set
          </button>
        </div>
      </Section>

      <Section title="Adjustments">
        <div className="mb-3 flex flex-col gap-2">
          <select value={adj.gameweek_id} onChange={(e) => setAdj({ ...adj, gameweek_id: e.target.value })} className={inputCls} style={inputStyle}>
            <option value="">Gameweek…</option>
            {[...(gws ?? [])].reverse().map((g) => <option key={g.id} value={g.id}>{gwDate(g.gw_date)}</option>)}
          </select>
          <select value={adj.player_id} onChange={(e) => setAdj({ ...adj, player_id: e.target.value })} className={inputCls} style={inputStyle}>
            <option value="">Player…</option>
            {players.filter((p) => p.plays).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex gap-2">
            <select value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value as 'Bonus' | 'Minus' })} className={inputCls} style={inputStyle}>
              <option value="Minus">Minus</option>
              <option value="Bonus">Bonus</option>
            </select>
            <input value={adj.score} onChange={(e) => setAdj({ ...adj, score: e.target.value })} placeholder="±score, e.g. -1" className={inputCls} style={inputStyle} />
          </div>
          <input value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} placeholder="Reason (e.g. no proof of bet — rules §5)" className={inputCls} style={inputStyle} />
          <button
            onClick={() => {
              const score = Number(adj.score)
              if (!adj.gameweek_id || !adj.player_id || !adj.reason || !Number.isFinite(score)) return
              run.mutate(() =>
                addAdjustment({ gameweek_id: adj.gameweek_id, player_id: adj.player_id, kind: adj.kind, reason: adj.reason, score }),
              )
            }}
            className={btnCls}
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            Add adjustment
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {(adjustments ?? []).map((a) => (
            <div key={a.id} className="flex items-center justify-between text-[12px]">
              <span className="truncate text-muted">{a.reason}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold" style={{ color: a.score >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                  {a.score >= 0 ? '+' : ''}{a.score}
                </span>
                <button
                  onClick={() => run.mutate(() => deleteAdjustment(a.id))}
                  className="font-mono text-[10px] text-muted underline"
                >
                  remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Feedback">
        <div className="flex flex-col gap-2.5">
          {(feedback ?? []).map((f) => (
            <div key={f.id} className="flex items-start justify-between gap-2 text-[12.5px]">
              <div className="min-w-0">
                <span className="font-semibold" style={{ color: playerColor(players.find((p) => p.id === f.player_id)?.name ?? '') }}>
                  {players.find((p) => p.id === f.player_id)?.name ?? '?'}
                </span>{' '}
                <span className="text-muted">{f.message}</span>
              </div>
              <select
                value={f.status}
                onChange={(e) => {
                  const v = e.target.value
                  run.mutate(() => setFeedbackStatus(f.id, v as never))
                }}
                className="shrink-0 rounded-[8px] border bg-surface-2 px-2 py-1 text-[11px]"
                style={inputStyle}
              >
                {['new', 'planned', 'done', 'dismissed'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          ))}
          {(feedback ?? []).length === 0 && <p className="text-[12px] text-muted">Queue's empty.</p>}
        </div>
      </Section>

      <Section title="Join code">
        <p className="mb-2 font-mono text-[13px]">Current: {String(joinCode ?? '…')}</p>
        <div className="flex gap-2">
          <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="New code" className={inputCls} style={inputStyle} />
          <button
            onClick={() => newCode && run.mutate(() => setAppConfig('join_code', newCode))}
            className={btnCls}
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            Set
          </button>
        </div>
      </Section>

      <Section title="Audit trail">
        <div className="flex flex-col gap-1.5">
          {(audit ?? []).map((a) => (
            <div key={a.id} className="text-[11px] text-muted">
              <span className="font-mono">{ukTime(a.at)}</span> · {a.action} {a.table_name}
              {a.actor_player && (
                <span> by {players.find((p) => p.id === a.actor_player)?.name ?? '?'}</span>
              )}
            </div>
          ))}
          {(audit ?? []).length === 0 && <p className="text-[12px] text-muted">Nothing yet.</p>}
        </div>
      </Section>
    </div>
  )
}
