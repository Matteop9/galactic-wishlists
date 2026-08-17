import { describe, expect, it } from 'vitest'
import { optimalLineup, type PoolPlayer } from '../src/lib/engine/lineup'

const player = (id: string, position: string, value: number): PoolPlayer => ({ id, position, value })

describe('optimalLineup', () => {
  it('puts a second QB in the SUPER_FLEX slot', () => {
    const pool = [
      player('qb1', 'QB', 9000),
      player('qb2', 'QB', 8000),
      player('rb1', 'RB', 5000),
      player('rb2', 'RB', 4000),
      player('wr1', 'WR', 6000),
      player('te1', 'TE', 3000),
      player('wr2', 'WR', 2000),
    ]
    const result = optimalLineup(pool, ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'SUPER_FLEX', 'BN', 'BN'])
    const superFlex = result.slots.find((s) => s.slot === 'SUPER_FLEX')
    expect(superFlex?.player?.id).toBe('qb2')
    expect(result.starterValue).toBe(9000 + 8000 + 5000 + 4000 + 6000 + 2000 + 3000)
  })

  it('fills FLEX with the best remaining RB/WR/TE', () => {
    const pool = [
      player('rb1', 'RB', 5000),
      player('rb2', 'RB', 4500),
      player('rb3', 'RB', 4000),
      player('wr1', 'WR', 3000),
      player('te1', 'TE', 1000),
    ]
    const result = optimalLineup(pool, ['RB', 'RB', 'WR', 'TE', 'FLEX'])
    const flex = result.slots.find((s) => s.slot === 'FLEX')
    expect(flex?.player?.id).toBe('rb3')
  })

  it('leaves a slot empty (value 0) when no eligible player exists', () => {
    const pool = [player('qb1', 'QB', 9000)]
    const result = optimalLineup(pool, ['QB', 'DEF'])
    const def = result.slots.find((s) => s.slot === 'DEF')
    expect(def?.player).toBeNull()
    expect(result.starterValue).toBe(9000)
  })

  it('never starts the same player twice', () => {
    const pool = [player('wr1', 'WR', 5000), player('wr2', 'WR', 100)]
    const result = optimalLineup(pool, ['WR', 'WR', 'FLEX'])
    const ids = result.slots.map((s) => s.player?.id).filter(Boolean)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
