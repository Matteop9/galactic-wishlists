import { useState, type ReactNode } from 'react'
import { initials } from '../lib/format'
import { crestUrl, SPORT_EMOJI } from '../lib/teams'

export const teamColor = (team: string) =>
  team === 'VDL' ? 'var(--color-vdl)' : team === 'JHP' ? 'var(--color-jhp)' : 'var(--color-accent)'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[14px] bg-surface ${className}`}>{children}</div>
}

export function Overline({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`overline ${className}`}>{children}</div>
}

/** Method badge: mono 9px uppercase, transparent bg, 1px border at 40% alpha. */
export function MethodBadge({ method }: { method: string }) {
  if (method === 'N/A')
    return (
      <span className="rounded-[4px] border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]"
        style={{ borderColor: 'rgba(147,160,143,0.4)', color: 'var(--color-muted)' }}>
        No pick
      </span>
    )
  const gold = method === 'BTTS'
  const c = gold ? 'var(--color-gold)' : 'var(--color-win)'
  return (
    <span
      className="rounded-[4px] border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]"
      style={{ borderColor: `color-mix(in srgb, ${c} 40%, transparent)`, color: c }}
    >
      {method === 'BTTS' ? 'BTTS' : 'WIN'}
    </span>
  )
}

/** Void chip: why a pick scored 0 without being a straight loss (rules §6). */
export function VoidChip({ reason }: { reason: string }) {
  return (
    <span
      title={
        reason === 'postponed'
          ? 'Match postponed/cancelled after the deadline — scores 0 (rules §6)'
          : 'Invalid pick — scores 0 (rules §6)'
      }
      className="rounded-[4px] border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em]"
      style={{ borderColor: 'rgba(147,160,143,0.4)', color: 'var(--color-muted)' }}
    >
      {reason === 'postponed' ? 'Postp' : 'Invalid'}
    </span>
  )
}

/** The x2 gold chip - shown NEXT TO market odds, never mutating them. */
export function DoubleChip() {
  return (
    <span
      className="rounded-[4px] border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em]"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-gold) 40%, transparent)',
        color: 'var(--color-gold)',
      }}
    >
      ×2
    </span>
  )
}

export function TeamChip({ team }: { team: string }) {
  const c = teamColor(team)
  return (
    <span
      className="rounded-[4px] border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]"
      style={{ borderColor: `color-mix(in srgb, ${c} 40%, transparent)`, color: c }}
    >
      {team}
    </span>
  )
}

export function IntlBreakChip() {
  return (
    <span
      className="rounded-[4px] border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em]"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-jhp) 40%, transparent)',
        color: 'var(--color-jhp)',
      }}
    >
      🌍 Int'l break
    </span>
  )
}

export function SandboxChip() {
  return (
    <span
      className="rounded-[4px] border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em]"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-vdl) 40%, transparent)',
        color: 'var(--color-vdl)',
      }}
    >
      Sandbox
    </span>
  )
}

export function Avatar({ name, team, size = 30 }: { name: string; team: string; size?: number }) {
  const c = teamColor(team)
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-mono font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        background: `color-mix(in srgb, ${c} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${c} 40%, transparent)`,
        color: c,
      }}
    >
      {initials(name)}
    </div>
  )
}

/** Club crest where we have one, otherwise a two-letter initials chip.
    Crests come from crests.football-data.org (see lib/teams.ts); a failed
    load silently falls back to the chip. */
export function TeamBadge({ name, size = 18 }: { name: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const emoji = SPORT_EMOJI[name]
  if (emoji)
    return (
      <span className="shrink-0 leading-none" style={{ fontSize: size * 0.85 }}>
        {emoji}
      </span>
    )
  const url = crestUrl(name)
  if (!url || failed)
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-[5px] font-mono font-semibold uppercase"
        style={{
          width: size,
          height: size,
          fontSize: Math.max(7, size * 0.4),
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-line-strong)',
          color: 'var(--color-muted)',
        }}
      >
        {initials(name)}
      </span>
    )
  return (
    <img
      src={url}
      width={size}
      height={size}
      loading="lazy"
      alt=""
      onError={() => setFailed(true)}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  )
}

/** Settle state icons: won check chip / lost cross chip / pending hollow circle. */
export function StateIcon({ result }: { result: 0 | 1 | null }) {
  if (result === 1)
    return (
      <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--color-win) 18%, transparent)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-win)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
    )
  if (result === 0)
    return (
      <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--color-loss) 18%, transparent)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-loss)" strokeWidth="3.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </div>
    )
  return (
    <div
      className="h-[18px] w-[18px] rounded-full border-2"
      style={{ borderColor: 'var(--color-line-strong)' }}
    />
  )
}

export function GwStatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    settled: { label: 'SETTLED', color: 'var(--color-win)' },
    open: { label: 'OPEN', color: 'var(--color-accent)' },
    closed: { label: 'CLOSED', color: 'var(--color-muted)' },
    scheduled: { label: 'UPCOMING', color: 'var(--color-muted)' },
    skipped: { label: 'SKIPPED', color: 'var(--color-muted)' },
  }
  const s = map[status] ?? map.scheduled
  return (
    <span
      className="rounded-[4px] border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]"
      style={{ borderColor: `color-mix(in srgb, ${s.color} 40%, transparent)`, color: s.color }}
    >
      {s.label}
    </span>
  )
}

export function PageTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pb-3 pt-5">
      <h1 className="display text-2xl leading-none">{children}</h1>
      {right}
    </div>
  )
}
