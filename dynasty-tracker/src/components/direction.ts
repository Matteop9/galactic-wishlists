import type { Direction } from '../lib/engine/direction'

export function directionClass(direction: Direction): string {
  return `direction direction-${direction.toLowerCase().replace(/\s+/g, '-')}`
}
