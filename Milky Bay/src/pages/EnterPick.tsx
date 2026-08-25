import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCurrentGameweek, fetchPickScores, upsertPick } from '../lib/queries'
import { usePlayer } from '../hooks/usePlayer'
import { gwDate, isFractional, parseOdds } from '../lib/format'
import { Avatar, GwStatusChip, Overline, PageTitle } from '../components/ui'
import type { AccaKind } from '../lib/types'

const MIN_ODDS: Record<AccaKind, number> = { W: 1.5, random: 1.7 }

interface Draft {
  game: string
  selection: string
  odds: string
}

function AccaSection({
  kind,
  draft,
  setDraft,
  disabled,
}: {
  kind: AccaKind
  draft: Draft
  setDraft: (d: Draft) => void
  disabled: boolean
}) {
  const color = kind === 'W' ? 'var(--color-win)' : 'var(--color-gold)'
  const parsed = draft.odds ? parseOdds(draft.odds) : null
  const tooLow = parsed != null && parsed < MIN_ODDS[kind]
  const input = 'w-full rounded-[10px] border bg-surface-2 px-3.5 py-3 text-[15px] mb-3 disabled:opacity-40'
  const inputStyle = { borderColor: 'var(--color-line-strong)' }

  return (
    <div className="overflow-hidden rounded-[14px] bg-surface">
      <div
        className="h-[3px]"
        style={{ background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 30%, transparent))` }}
      />
      <div className="p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <div className="display text-[19px]" style={{ color }}>
            {kind === 'W' ? 'W Acca' : 'Random Acca'}
          </div>
          <span className="overline">MIN ODDS {MIN_ODDS[kind].toFixed(2)}</span>
        </div>

        {kind === 'random' && (
          <>
            <label className="overline mb-1.5 block">GAME</label>
            <input
              value={draft.game}
              onChange={(e) => setDraft({ ...draft, game: e.target.value })}
              placeholder="e.g. Norwich v West Brom"
              className={input}
              style={inputStyle}
              disabled={disabled}
            />
          </>
        )}

        <label className="overline mb-1.5 block">
          {kind === 'W' ? 'TEAM TO WIN' : 'SELECTION'}
        </label>
        <input
          value={draft.selection}
          onChange={(e) => setDraft({ ...draft, selection: e.target.value })}
          placeholder={kind === 'W' ? 'e.g. West Ham' : 'e.g. BTTS + over 2.5 goals'}
          className={input}
          style={inputStyle}
          disabled={disabled}
        />

        <label className="overline mb-1.5 block">ODDS (DECIMAL OR FRACTIONAL)</label>
        <input
          value={draft.odds}
          onChange={(e) => setDraft({ ...draft, odds: e.target.value })}
          inputMode="text"
          placeholder="e.g. 1.80 or 4/5"
          className={input}
          style={inputStyle}
          disabled={disabled}
        />
        {draft.odds && parsed == null && (
          <p className="-mt-1 mb-2 text-[11px]" style={{ color: 'var(--color-loss)' }}>
            Can't read those odds — use 1.80 or 4/5 format
          </p>
        )}
        {parsed != null && isFractional(draft.odds) && (
          <p className="-mt-1 mb-2 text-[11px] text-muted">= {parsed.toFixed(2)} decimal</p>
        )}
        {tooLow && (
          <p className="-mt-1 mb-2 text-[11px]" style={{ color: 'var(--color-gold)' }}>
            Below the {MIN_ODDS[kind].toFixed(2)} minimum (rules §2) — saving anyway is on you
          </p>
        )}
      </div>
    </div>
  )
}

export default function EnterPick() {
  const { me, players, isAdmin } = usePlayer()
  const qc = useQueryClient()
  const [forPlayer, setForPlayer] = useState<string | null>(null)
  const [w, setW] = useState<Draft>({ game: '', selection: '', odds: '' })
  const [r, setR] = useState<Draft>({ game: '', selection: '', odds: '' })
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: gw } = useQuery({ queryKey: ['currentGw'], queryFn: fetchCurrentGameweek })
  const { data: picks } = useQuery({
    queryKey: ['pickScores', gw?.id],
    queryFn: () => fetchPickScores(gw!.id),
    enabled: !!gw,
  })

  const target = forPlayer ?? me?.id ?? null
  // Derive from the actual timestamps, not just status: the cron flips status
  // only every 5 min, so for a few minutes after Wed noon a 'scheduled' GW is
  // really open (and the server upsert agrees). Admins can edit until settled.
  const now = Date.now()
  const withinWindow =
    !!gw && Date.parse(gw.window_opens) <= now && now < Date.parse(gw.window_closes)
  const windowOpen =
    gw?.status === 'open' || withinWindow || (isAdmin && gw?.status !== 'settled')

  // Prefill from existing picks for the target player
  useEffect(() => {
    if (!picks || !target) return
    const mine = picks.filter((p) => p.player_id === target && !p.is_no_pick)
    const wp = mine.find((p) => p.acca_kind === 'W')
    const rp = mine.find((p) => p.acca_kind === 'random')
    setW(wp ? { game: wp.game ?? '', selection: wp.selection, odds: wp.odds_display ?? String(wp.odds) } : { game: '', selection: '', odds: '' })
    setR(rp ? { game: rp.game ?? '', selection: rp.selection, odds: rp.odds_display ?? String(rp.odds) } : { game: '', selection: '', odds: '' })
  }, [picks, target])

  const save = useMutation({
    mutationFn: async () => {
      if (!gw || !target) throw new Error('No gameweek')
      const jobs: Promise<unknown>[] = []
      for (const [kind, d] of [['W', w], ['random', r]] as const) {
        if (!d.selection && !d.odds) continue
        const odds = parseOdds(d.odds)
        if (!d.selection || odds == null) throw new Error(`${kind === 'W' ? 'W' : 'Random'} acca: needs a selection and readable odds`)
        jobs.push(
          upsertPick({
            gameweek_id: gw.id,
            player_id: target,
            acca_kind: kind,
            game: d.game || null,
            selection: d.selection,
            odds,
            odds_display: isFractional(d.odds) ? d.odds.trim() : null,
          }),
        )
      }
      if (!jobs.length) throw new Error('Nothing to save')
      await Promise.all(jobs)
    },
    onSuccess: () => {
      setSaved('Saved — good luck')
      setError(null)
      qc.invalidateQueries({ queryKey: ['pickScores'] })
    },
    onError: (e) => {
      setError((e as Error).message)
      setSaved(null)
    },
  })

  return (
    <div className="px-4">
      <PageTitle right={gw && <GwStatusChip status={gw.status} />}>Enter Picks</PageTitle>

      <div className="mb-4 rounded-[12px] bg-surface px-3.5 py-2.5 text-[12px] text-muted">
        {gw ? (
          <>
            <span className="font-semibold text-text">{gwDate(gw.gw_date)}</span> — picks go in
            the group chat by <span className="font-semibold text-text">Thursday 8pm</span>;
            transcribe them here by Saturday 23:59.
          </>
        ) : (
          'No gameweek is set up yet.'
        )}
      </div>

      {/* Anyone can transcribe anyone's picks from the chat (mb_0011) —
          submitted_by records who actually entered it. */}
      <div className="mb-4">
        <Overline className="px-1 pb-1.5">ENTERING FOR</Overline>
          <div className="flex flex-wrap gap-2">
            {players
              .filter((p) => p.plays)
              .map((p) => {
                const active = target === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setForPlayer(p.id)}
                    className="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3"
                    style={
                      active
                        ? { borderColor: 'var(--color-accent)', background: 'rgba(116,192,232,0.1)' }
                        : { borderColor: 'var(--color-line-strong)' }
                    }
                  >
                    <Avatar name={p.name} size={22} />
                    <span className="text-[12px] font-semibold">{p.name}</span>
                  </button>
                )
              })}
        </div>
      </div>

      {!windowOpen && gw && (
        <div className="mb-4 rounded-[12px] px-3.5 py-2.5 text-[12px]"
          style={{ background: 'rgba(240,101,95,0.08)', color: 'var(--color-loss)' }}>
          The entry window is {gw.status === 'scheduled' ? 'not open yet' : 'closed'} — picks are locked.
        </div>
      )}

      <div className="flex flex-col gap-4">
        <AccaSection kind="W" draft={w} setDraft={setW} disabled={!windowOpen || !target} />
        <AccaSection kind="random" draft={r} setDraft={setR} disabled={!windowOpen || !target} />
      </div>

      {error && <p className="mt-3 text-[12px]" style={{ color: 'var(--color-loss)' }}>{error}</p>}
      {saved && <p className="mt-3 text-[12px]" style={{ color: 'var(--color-win)' }}>{saved}</p>}

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending || !windowOpen || !target}
        className="mt-4 w-full rounded-[12px] py-3.5 text-[15px] font-bold disabled:opacity-40"
        style={{
          background: 'var(--color-accent)',
          color: 'var(--color-on-accent)',
          boxShadow: '0 4px 24px rgba(116,192,232,0.25)',
        }}
      >
        {save.isPending ? 'Saving…' : 'Save picks'}
      </button>
      <p className="mt-3 pb-4 text-center text-[11px] text-muted">
        Miss an acca and it's −1 point. Miss both and it's −2 (rules §1).
      </p>
    </div>
  )
}
