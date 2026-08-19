export const odds2 = (n: number | null | undefined) =>
  n == null ? '–' : Number(n).toFixed(2)

export const score2 = odds2

/** e.g. 15/8 (grid headers) */
export const dayMonth = (iso: string) => {
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}`
}

/** e.g. SAT 15 AUG */
export const gwDate = (iso: string) =>
  new Date(iso + 'T12:00:00')
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase()
    .replace(/,/g, '')

/** e.g. 15 Aug 2026 */
export const longDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

export const initials = (name: string) => name.slice(0, 2).toUpperCase()

export function countdown(toIso: string, from = new Date()): string {
  let s = Math.max(0, Math.floor((new Date(toIso).getTime() - from.getTime()) / 1000))
  const d = Math.floor(s / 86400)
  s -= d * 86400
  const h = Math.floor(s / 3600)
  s -= h * 3600
  const m = Math.floor(s / 60)
  s -= m * 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`
}

/** Parse odds as typed in the chat: decimal ("1.8") or fractional ("4/5" ->
    1.80). Returns null when unparseable. */
export function parseOdds(input: string): number | null {
  const s = input.trim()
  const frac = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  if (frac) {
    const num = Number(frac[1])
    const den = Number(frac[2])
    if (den > 0) return 1 + num / den
    return null
  }
  const dec = Number(s)
  return Number.isFinite(dec) && dec >= 1 ? dec : null
}

/** True when the raw input was fractional — worth keeping as odds_display. */
export const isFractional = (input: string) => /\//.test(input)

/** UK-local display of a timestamptz */
export const ukTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
