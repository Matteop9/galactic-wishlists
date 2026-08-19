import { useQuery } from '@tanstack/react-query'
import { fetchHonours } from '../lib/queries'
import type { HonoursRow } from '../lib/types'

/** One shared cache — honours only change when a season ends. */
export function useHonours() {
  return useQuery({
    queryKey: ['honours'],
    queryFn: fetchHonours,
    staleTime: Infinity,
  })
}

/* Emblem grammar (JHH Acca/docs/Emblem Grammar.dc.html). Repetition retired:
   one crown/spoon mark that EVOLVES with the honour count through the register
   sequence FLANK (laurel → wings) → BASE (chevrons) → CREST (rays / stink) →
   FRAME (ring) → PLINTH (banner). Tier 9+ = one more BASE chevron per tier.
   Halves are designed splits (left half solid + full outline at 55%), not
   gradient clips, and always sit immediately after their full mark. All marks
   render at the same height — silhouette, not size, carries rank. */

type Part =
  | { kind: 'fill'; d: string }
  | { kind: 'stroke'; d: string; w: number; o?: number }

const r = (n: number) => Math.round(n * 100) / 100

const CROWN_PTS: Array<[number, number]> = [[-5, 8.6], [-5.4, 2.6], [-2.2, 5], [0, 0.8], [2.2, 5], [5.4, 2.6], [5, 8.6]]
const crownD = (cx: number, dy: number) => 'M' + CROWN_PTS.map(([x, y]) => `${r(cx + x)} ${r(dy + y)}`).join('L') + 'Z'
const crownHalfD = (cx: number, dy: number) =>
  'M' + ([[-5, 8.6], [-5.4, 2.6], [-2.2, 5], [0, 0.8], [0, 8.6]] as const).map(([x, y]) => `${r(cx + x)} ${r(dy + y)}`).join('L') + 'Z'

const bowl = (cx: number, dy: number) => `M${r(cx - 2.9)} ${r(dy + 3.4)}a2.9 3.4 0 1 0 5.8 0a2.9 3.4 0 1 0 -5.8 0Z`
const handle = (cx: number, dy: number) => `M${r(cx - 0.9)} ${r(dy + 7.1)}a0.9 0.9 0 0 1 1.8 0l0 5.6a0.9 0.9 0 0 1 -1.8 0Z`
const spoonHalfD = (cx: number, dy: number) =>
  `M${r(cx)} ${r(dy)}A2.9 3.4 0 0 0 ${r(cx)} ${r(dy + 6.8)}ZM${r(cx)} ${r(dy + 6.2)}A0.9 0.9 0 0 0 ${r(cx - 0.9)} ${r(dy + 7.1)}L${r(cx - 0.9)} ${r(dy + 12.7)}A0.9 0.9 0 0 0 ${r(cx)} ${r(dy + 13.6)}Z`

function wreath(cx: number, dy: number, s: number): Part[] {
  return [-1, 1].map((g): Part => ({
    kind: 'stroke', w: 1.1,
    d: `M${r(cx + g * s)} ${r(dy + 9)}C${r(cx + g * (s + 0.9))} ${r(dy + 6.2)} ${r(cx + g * (s + 0.5))} ${r(dy + 3.2)} ${r(cx + g * (s - 1.5))} ${r(dy + 1.3)}`,
  }))
}

function wreathIn(cx: number, dy: number, s: number): Part[] {
  return [-1, 1].map((g): Part => ({
    kind: 'stroke', w: 1,
    d: `M${r(cx + g * s)} ${r(dy + 9.6)}C${r(cx + g * (s + 0.8))} ${r(dy + 8.2)} ${r(cx + g * (s + 1))} ${r(dy + 6.6)} ${r(cx + g * (s + 0.6))} ${r(dy + 5.2)}`,
  }))
}

function wings(cx: number, dy: number, wo: number): Part[] {
  const rel = [
    [4.4, 4.0, 6.1, 3.6, 7.5, 2.8, 8.1, 1.6],
    [4.6, 5.6, 6.3, 5.4, 7.7, 4.7, 8.4, 3.6],
    [4.7, 7.1, 6.2, 7.1, 7.5, 6.6, 8.2, 5.7],
  ]
  const out: Part[] = []
  for (const g of [-1, 1])
    for (const q of rel)
      out.push({
        kind: 'stroke', w: 1,
        d: `M${r(cx + g * (q[0] + wo))} ${r(dy + q[1])}C${r(cx + g * (q[2] + wo))} ${r(dy + q[3])} ${r(cx + g * (q[4] + wo))} ${r(dy + q[5])} ${r(cx + g * (q[6] + wo))} ${r(dy + q[7])}`,
      })
  return out
}

function droop(cx: number, dy: number): Part[] {
  const rel = [
    [3.1, 3.6, 4.8, 3.9, 6.1, 4.8, 6.7, 6.2],
    [3.0, 5.1, 4.6, 5.7, 5.7, 6.7, 6.1, 8.0],
    [2.8, 6.5, 4.0, 7.2, 4.8, 8.2, 5.1, 9.4],
  ]
  const out: Part[] = []
  for (const g of [-1, 1])
    for (const q of rel)
      out.push({
        kind: 'stroke', w: 1,
        d: `M${r(cx + g * q[0])} ${r(dy + q[1])}C${r(cx + g * q[2])} ${r(dy + q[3])} ${r(cx + g * q[4])} ${r(dy + q[5])} ${r(cx + g * q[6])} ${r(dy + q[7])}`,
      })
  return out
}

/** dir 1 = points up (promotion), -1 = points down (demotion). */
function chev(cx: number, by: number, dir: 1 | -1): Part {
  return { kind: 'stroke', w: 1.1, d: `M${r(cx - 2.4)} ${r(by)}L${r(cx)} ${r(by - 1.2 * dir)}L${r(cx + 2.4)} ${r(by)}` }
}

function rays(cx: number, ty: number): Part[] {
  return [
    { kind: 'stroke', w: 1.1, d: `M${r(cx)} ${r(ty)}L${r(cx)} ${r(ty + 2)}` },
    { kind: 'stroke', w: 1.1, d: `M${r(cx - 3.1)} ${r(ty + 0.6)}L${r(cx - 1.9)} ${r(ty + 2.2)}` },
    { kind: 'stroke', w: 1.1, d: `M${r(cx + 3.1)} ${r(ty + 0.6)}L${r(cx + 1.9)} ${r(ty + 2.2)}` },
  ]
}

function stink(cx: number, ty: number, len = 2.7): Part[] {
  return [cx - 2.7, cx, cx + 2.7].map((x, i): Part => {
    const L = i === 1 ? len : len - 0.7
    const t = i === 1 ? ty : ty + 0.5
    return {
      kind: 'stroke', w: 0.9,
      d: `M${r(x)} ${r(t + L)}C${r(x - 0.9)} ${r(t + L * 0.66)} ${r(x + 0.9)} ${r(t + L * 0.33)} ${r(x)} ${r(t)}`,
    }
  })
}

function ring(cx: number, cy: number, rr: number, open: 'top' | 'bottom'): Part {
  const k = 0.47, q = 0.883
  return open === 'top'
    ? { kind: 'stroke', w: 1.1, d: `M${r(cx - k * rr)} ${r(cy - q * rr)}A${rr} ${rr} 0 1 0 ${r(cx + k * rr)} ${r(cy - q * rr)}` }
    : { kind: 'stroke', w: 1.1, d: `M${r(cx - k * rr)} ${r(cy + q * rr)}A${rr} ${rr} 0 1 1 ${r(cx + k * rr)} ${r(cy + q * rr)}` }
}

function banner(cx: number, y: number): Part {
  return { kind: 'fill', d: `M${r(cx - 4.8)} ${r(y)}L${r(cx + 4.8)} ${r(y)}L${r(cx + 4)} ${r(y + 1.7)}L${r(cx - 4)} ${r(y + 1.7)}Z` }
}

function bannerTorn(cx: number, y: number): Part {
  return {
    kind: 'fill',
    d: `M${r(cx - 4.8)} ${r(y)}L${r(cx + 4.8)} ${r(y)}L${r(cx + 4.2)} ${r(y + 1.8)}L${r(cx + 1.6)} ${r(y + 1.1)}L${r(cx)} ${r(y + 1.9)}L${r(cx - 1.6)} ${r(y + 1.1)}L${r(cx - 4.2)} ${r(y + 1.8)}Z`,
  }
}

function drip(x: number, y: number): Part {
  return {
    kind: 'fill',
    d: `M${r(x)} ${r(y)}C${r(x + 0.95)} ${r(y + 1.2)} ${r(x + 0.8)} ${r(y + 2.3)} ${r(x)} ${r(y + 2.5)}C${r(x - 0.8)} ${r(y + 2.3)} ${r(x - 0.95)} ${r(y + 1.2)} ${r(x)} ${r(y)}Z`,
  }
}

interface TierSpec { w: number; h: number; parts: Part[] }

/** Crown fill + wings + inner laurel — the tier-4+ core. */
function crownBase(cx: number, dy: number): Part[] {
  return [{ kind: 'fill', d: crownD(cx, dy) }, ...wings(cx, dy, 1.0), ...wreathIn(cx, dy, 6)]
}

export function crownTier(t: number): TierSpec {
  if (t <= 1) return { w: 12, h: 10, parts: [{ kind: 'fill', d: crownD(6, 0) }] }
  if (t === 2) return { w: 16, h: 10, parts: [{ kind: 'fill', d: crownD(8, 0) }, ...wreath(8, 0, 7)] }
  if (t === 3) return { w: 20, h: 10, parts: [{ kind: 'fill', d: crownD(10, 0) }, ...wings(10, 0, 1.0)] }
  if (t === 4) return { w: 20, h: 12, parts: [...crownBase(10, 0), chev(10, 11, 1)] }
  if (t === 5) return { w: 20, h: 14, parts: [...crownBase(10, 0), chev(10, 11, 1), chev(10, 13, 1)] }
  if (t === 6) return { w: 20, h: 17, parts: [...crownBase(10, 3), chev(10, 14, 1), chev(10, 16, 1), ...rays(10, 0.6)] }
  const extra = Math.max(t - 8, 0)
  const chevs = Array.from({ length: 2 + extra }, (_, i) => chev(12, 14.4 + i * 2, 1))
  const parts = [...crownBase(12, 3.4), ...chevs, ...rays(12, 0.6), ring(12, 9.3, 8.6, 'top')]
  if (t >= 8) parts.push(banner(12, 18.2 + extra * 2))
  return { w: 24, h: t === 7 ? 18.5 : 20 + extra * 2, parts }
}

export const HALF_CROWN: TierSpec = {
  w: 12, h: 10,
  parts: [{ kind: 'fill', d: crownHalfD(6, 0) }, { kind: 'stroke', d: crownD(6, 0), w: 0.7, o: 0.55 }],
}

/** Bowl + handle fills — the bare spoon. */
function spoonGlyph(cx: number, dy: number): Part[] {
  return [{ kind: 'fill', d: bowl(cx, dy) }, { kind: 'fill', d: handle(cx, dy) }]
}

/** Spoon + drooped wings + drips — the tier-4+ core. */
function spoonBase(cx: number, dy: number): Part[] {
  return [...spoonGlyph(cx, dy), ...droop(cx, dy), drip(cx - 4.6, dy + 9.4), drip(cx + 4.6, dy + 9.4)]
}

export function spoonTier(t: number): TierSpec {
  if (t <= 1) return { w: 10, h: 14, parts: spoonGlyph(5, 0) }
  if (t === 2) return { w: 14, h: 14, parts: [...spoonGlyph(7, 0), drip(2.6, 5.4), drip(11.4, 5.4)] }
  if (t === 3) return { w: 16, h: 14, parts: [...spoonGlyph(8, 0), ...droop(8, 0)] }
  if (t === 4) return { w: 16, h: 17, parts: [...spoonBase(8, 0), chev(8, 14.8, -1)] }
  if (t === 5) return { w: 16, h: 19, parts: [...spoonBase(8, 0), chev(8, 14.8, -1), chev(8, 16.8, -1)] }
  if (t === 6) return { w: 16, h: 22, parts: [...spoonBase(8, 3), chev(8, 17.8, -1), chev(8, 19.8, -1), ...stink(8, 0.65)] }
  const extra = Math.max(t - 8, 0)
  const chevs = Array.from({ length: 2 + extra }, (_, i) => chev(10.5, 19.2 + i * 2, -1))
  const parts = [...spoonBase(10.5, 4.6), ...chevs, ...stink(10.5, 2.4, 2), ring(10.5, 11.4, 9.5, 'bottom')]
  if (t >= 8) parts.push(bannerTorn(10.5, 23.3 + extra * 2))
  return { w: 21, h: t === 7 ? 23 : 25.4 + extra * 2, parts }
}

export const HALF_SPOON: TierSpec = {
  w: 10, h: 14.4,
  parts: [
    { kind: 'fill', d: spoonHalfD(5, 0.4) },
    { kind: 'stroke', d: bowl(5, 0.4), w: 0.7, o: 0.55 },
    { kind: 'stroke', d: handle(5, 0.4), w: 0.7, o: 0.55 },
  ],
}

export function Mark({ spec, color, size }: { spec: TierSpec; color: string; size: number }) {
  return (
    <svg
      width={r((spec.w / spec.h) * size)}
      height={size}
      viewBox={`0 0 ${spec.w} ${spec.h}`}
      overflow="visible"
      className="shrink-0"
      aria-hidden="true"
    >
      {spec.parts.map((p, i) =>
        p.kind === 'fill' ? (
          <path key={i} d={p.d} fill={color} />
        ) : (
          <path key={i} d={p.d} stroke={color} strokeWidth={p.w} strokeOpacity={p.o ?? 1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ),
      )}
    </svg>
  )
}

/* The poo, drawn: one silhouette, eyes punched through the fill (evenodd) so
   the ground supplies the second tone. The half state is designed, not
   clipped — the pat: flattened, one eye. */
const POO_D =
  'M5.8 0.4C6.6 0.8 6.9 1.7 6.4 2.4C7.5 2.6 8.1 3.5 7.9 4.4C9.1 4.8 9.8 5.9 9.5 7C9.2 8 8.2 8.6 7 8.6L3 8.6C1.8 8.6 0.8 8 0.5 7C0.2 5.9 0.9 4.8 2.1 4.4C1.9 3.5 2.5 2.6 3.6 2.4C3.2 1.7 3.4 0.8 4.2 0.4C4.3 1.1 4.7 1.6 5.3 1.7C5.7 1.5 5.9 1 5.8 0.4Z'
const POO_EYES_D =
  'M2.65 6.35a0.85 0.85 0 1 0 1.7 0a0.85 0.85 0 1 0 -1.7 0ZM5.65 6.35a0.85 0.85 0 1 0 1.7 0a0.85 0.85 0 1 0 -1.7 0Z'
const PAT_D =
  'M6 3.2C6.7 3.5 6.9 4.2 6.6 4.8C7.9 5 8.9 5.7 8.9 6.7C8.9 7.9 7.5 8.6 5 8.6C2.5 8.6 1.1 7.9 1.1 6.7C1.1 5.8 1.9 5.1 3.1 4.9C3.3 4.1 4.1 3.6 5 3.7C5.3 3.4 5.6 3.2 6 3.2Z'
const PAT_EYE_D = 'M4.2 6.5a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0 -1.6 0Z'

export function PooMark({ half }: { half?: boolean }) {
  return (
    <svg width={r((10 / 9) * 7)} height={7} viewBox="0 0 10 9" aria-hidden="true">
      <path d={half ? PAT_D + PAT_EYE_D : POO_D + POO_EYES_D} fill="var(--color-poo)" fillRule="evenodd" />
    </svg>
  )
}

const label = (d: string) =>
  d
    .replace('half_season_winner', '— won the half season')
    .replace('half_wooden_spoon', '— wooden spoon (half season)')
    .replace('wooden_spoon', '— wooden spoon')
    .replace('winner', '— champion')

/**
 * Never won a season: the drawn Poo of Shame hovers over the first letter of
 * the name. Won only the half season (Luke): the Pat — a flattened half poo
 * with one eye. A full-season crown clears it. Absolutely positioned so it
 * never changes row height; renders the plain name until honours are loaded.
 */
export function ShamedName({
  playerId,
  name,
  className = '',
  style,
}: {
  playerId: string
  name: string
  className?: string
  style?: React.CSSProperties
}) {
  const { data } = useHonours()
  const row = (data ?? []).find((r) => r.player_id === playerId)
  const loaded = data != null
  const fullPoo = loaded && (!row || (row.crowns === 0 && row.half_crowns === 0))
  const halfPoo = loaded && !fullPoo && (row?.crowns ?? 0) === 0
  if (!fullPoo && !halfPoo)
    return (
      <span className={className} style={style}>
        {name}
      </span>
    )
  return (
    <span
      className={className}
      style={style}
      title={fullPoo ? 'Never won a season' : 'Only ever won a half season'}
    >
      {/* top-0 keeps the poo INSIDE the line box (names are `truncate` =
          overflow hidden, so anything above the box gets clipped) — it sits
          on the letter's head, overlapping the ascender slightly. */}
      <span className="relative inline-block">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 flex w-full justify-center"
        >
          <PooMark half={halfPoo} />
        </span>
        {name.charAt(0)}
      </span>
      {name.slice(1)}
    </span>
  )
}

/**
 * Honours emblems for a player: one crown that grows with seasons won, a half
 * crown for the 22/23 half season, one wooden spoon that grows with last-place
 * finishes, a half spoon for the half season. Nothing for the unhonoured (and
 * the unshamed).
 */
export function Honours({ playerId, size = 10 }: { playerId: string; size?: number }) {
  const { data } = useHonours()
  const mine: HonoursRow | undefined = (data ?? []).find((r) => r.player_id === playerId)
  if (!mine || (mine.crowns === 0 && mine.half_crowns === 0 && mine.spoons === 0 && mine.half_spoons === 0))
    return null
  const title = mine.detail.map(label).join(' · ')
  return (
    <span className="inline-flex shrink-0 items-end align-middle" style={{ gap: r(size * 0.3) }} title={title}>
      {mine.crowns > 0 && <Mark spec={crownTier(mine.crowns)} color="var(--color-gold)" size={size} />}
      {Array.from({ length: mine.half_crowns }, (_, i) => (
        <Mark key={`hc${i}`} spec={HALF_CROWN} color="var(--color-gold)" size={size} />
      ))}
      {mine.spoons > 0 && <Mark spec={spoonTier(mine.spoons)} color="var(--color-spoon)" size={size} />}
      {Array.from({ length: mine.half_spoons }, (_, i) => (
        <Mark key={`hs${i}`} spec={HALF_SPOON} color="var(--color-spoon)" size={size} />
      ))}
    </span>
  )
}
