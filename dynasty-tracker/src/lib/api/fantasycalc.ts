import type { FcValue } from '../types'
import { fetchJson, type HttpOptions } from './http'

interface FcRawEntry {
  player: {
    name: string
    position: string
    sleeperId: string | number | null
    maybeAge: number | null
  }
  value: number
  overallRank: number
  positionRank: number
  trend30Day: number | null
  redraftValue: number | null
  redraftDynastyValueDifference: number | null
  maybeTier: number | null
}

export async function fetchFcValues(
  numTeams: 10 | 12,
  o: HttpOptions,
): Promise<{ values: Record<string, FcValue>; droppedNoSleeperId: number }> {
  const url = `https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&numTeams=${numTeams}&ppr=1`
  const raw = await fetchJson<FcRawEntry[]>(url, o)
  const values: Record<string, FcValue> = {}
  let droppedNoSleeperId = 0
  for (const entry of raw) {
    const sleeperId = entry.player.sleeperId
    if (sleeperId === null || sleeperId === undefined || sleeperId === '') {
      droppedNoSleeperId++
      continue
    }
    values[String(sleeperId)] = {
      value: entry.value,
      overallRank: entry.overallRank,
      positionRank: entry.positionRank,
      trend30Day: entry.trend30Day ?? null,
      tier: entry.maybeTier ?? null,
      redraftValue: entry.redraftValue ?? null,
      redraftDynastyValueDifference: entry.redraftDynastyValueDifference ?? null,
      age: entry.player.maybeAge ?? null,
      name: entry.player.name,
      position: entry.player.position,
    }
  }
  return { values, droppedNoSleeperId }
}
