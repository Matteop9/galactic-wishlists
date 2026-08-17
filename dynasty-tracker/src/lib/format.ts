export function ordinal(n: number): string {
  const rem10 = n % 10
  const rem100 = n % 100
  if (rem10 === 1 && rem100 !== 11) return `${n}st`
  if (rem10 === 2 && rem100 !== 12) return `${n}nd`
  if (rem10 === 3 && rem100 !== 13) return `${n}rd`
  return `${n}th`
}

export function fmtValue(n: number): string {
  return Math.round(n).toLocaleString('en-GB')
}

export function fmtShare(x: number): string {
  return `${Math.round(x * 100)}%`
}

export function fmtTrend(trend: number | null): string {
  if (trend === null || trend === 0) return '–'
  return trend > 0 ? `+${fmtValue(trend)}` : `−${fmtValue(Math.abs(trend))}`
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
