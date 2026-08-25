import { useState } from 'react'
import type { PickScore } from '../lib/types'
import { odds2 } from '../lib/format'
import { Avatar, NoPickChip, playerColor, SoleLoserChip, StateIcon, TeamBadge, VoidChip } from './ui'
import { Honours, ShamedName } from './Honours'

/* Flagship component — one card per acca (W / Random), 5 legs, combined odds
   header, footer status line. Long selections (random bet-builders mostly)
   truncate to one line; tapping the leg expands it to the full text. */

interface Props {
  kind: 'W' | 'random'
  picks: PickScore[]
}

function combinedOdds(picks: PickScore[]) {
  const real = picks.filter((p) => !p.is_no_pick && !p.void_reason)
  if (!real.length) return null
  return real.reduce((acc, p) => acc * p.odds, 1)
}

function footer(picks: PickScore[]) {
  const real = picks.filter((p) => !p.is_no_pick)
  const settled = real.filter((p) => p.result != null)
  const wins = settled.filter((p) => p.result === 1).length
  const losses = settled.filter((p) => p.result === 0 && !p.void_reason).length
  const pending = real.length - settled.length
  const tally = `${wins}W · ${losses}L · ${pending} pending`

  if (losses > 0 && pending > 0)
    return { text: `Acca down — ${losses} leg${losses > 1 ? 's' : ''} lost`, color: 'var(--color-loss)', tally }
  if (losses === 1 && pending === 0)
    return { text: 'One leg let it down — penalty applies', color: 'var(--color-loss)', tally }
  if (losses > 0)
    return { text: `Acca down — finished ${wins}/${real.length}`, color: 'var(--color-loss)', tally }
  if (pending === 0 && real.length > 0)
    return { text: `All ${wins} landed — acca wins!`, color: 'var(--color-gold)', tally }
  if (wins > 0)
    return { text: `All ${real.length} alive — ${pending} to go`, color: 'var(--color-accent-bright)', tally }
  return { text: `${real.length} legs in — good luck`, color: 'var(--color-muted)', tally }
}

export default function AccaCard({ kind, picks }: Props) {
  const color = kind === 'W' ? 'var(--color-win)' : 'var(--color-gold)'
  const combined = combinedOdds(picks)
  const f = footer(picks)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="overflow-hidden rounded-[14px] bg-surface">
      <div
        className="h-[3px]"
        style={{ background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 30%, transparent))` }}
      />
      <div className="flex items-end justify-between px-3.5 pb-2 pt-3">
        <div>
          <div className="overline">{picks.filter((p) => !p.is_no_pick).length}-FOLD</div>
          <div className="display text-[22px] leading-tight" style={{ color }}>
            {kind === 'W' ? 'W Acca' : 'Random Acca'}
          </div>
        </div>
        <div className="text-right">
          <div className="overline">COMBINED</div>
          <div className="font-mono text-[19px] font-bold leading-tight">
            {combined ? odds2(combined) : '–'}
          </div>
        </div>
      </div>

      <div>
        {picks.map((p) => {
          const lost = p.result === 0 && !p.void_reason && !p.is_no_pick
          // Only legs that can actually overflow get the tap affordance —
          // random legs with a game line or anything long-winded.
          const expandable = !p.is_no_pick && (!!p.game || p.selection.length > 22)
          const isOpen = expandable && expanded.has(p.id)
          return (
            <div
              key={p.id}
              role={expandable ? 'button' : undefined}
              onClick={expandable ? () => toggle(p.id) : undefined}
              className={`flex gap-2.5 border-t px-3.5 py-[9px] ${isOpen ? 'items-start' : 'items-center'} ${expandable ? 'cursor-pointer' : ''}`}
              style={{
                borderColor: 'var(--color-line)',
                background: lost ? 'rgba(240,101,95,0.05)' : undefined,
              }}
            >
              <Avatar name={p.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <ShamedName playerId={p.player_id} name={p.name} className="truncate text-[13px] font-bold" style={{ color: playerColor(p.name) }} />
                  <Honours playerId={p.player_id} />
                  {p.is_no_pick && <NoPickChip />}
                  {p.void_reason && <VoidChip reason={p.void_reason} />}
                  {p.sole_loser && <SoleLoserChip />}
                </div>
                {isOpen ? (
                  <div className="text-[11.5px] text-muted">
                    {p.game && <div className="text-[10.5px] opacity-75">{p.game}</div>}
                    <div className="whitespace-normal break-words">{p.selection}</div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
                    {kind === 'W' && !p.is_no_pick && <TeamBadge name={p.selection} size={13} />}
                    <span className="truncate">
                      {p.is_no_pick
                        ? 'No pick submitted'
                        : p.game
                          ? `${p.game} — ${p.selection}`
                          : p.selection}
                    </span>
                    {expandable && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)"
                        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
              <div className="w-[44px] text-right">
                <span
                  className="font-mono text-[14px] font-semibold"
                  style={{
                    color: lost ? 'var(--color-loss)' : undefined,
                    textDecoration: lost ? 'line-through' : undefined,
                  }}
                >
                  {p.is_no_pick ? '–' : (p.odds_display ?? odds2(p.odds))}
                </span>
              </div>
              <StateIcon result={p.result} />
            </div>
          )
        })}
      </div>

      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ background: 'var(--color-surface-2)' }}
      >
        <span className="text-[12px] font-semibold" style={{ color: f.color }}>
          {f.text}
        </span>
        <span className="font-mono text-[10.5px] text-muted">{f.tally}</span>
      </div>
    </div>
  )
}
