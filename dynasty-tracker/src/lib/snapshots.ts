import type { PlayersFile, Snapshot } from './types'

// Snapshots are bundled at build time: refresh writes a file, the next build
// publishes it. The glob doubles as the manifest for the Phase 2 picker.
const snapshotModules = {
  ...import.meta.glob<Snapshot>('/data/*/preseason.json', { import: 'default' }),
  ...import.meta.glob<Snapshot>('/data/*/week-*.json', { import: 'default' }),
}
const playersModules = import.meta.glob<PlayersFile>('/data/*/players.json', { import: 'default' })

export interface SnapshotRef {
  path: string
  season: string
  kind: 'preseason' | 'week'
  week: number
  load: () => Promise<Snapshot>
}

export function listSnapshots(): SnapshotRef[] {
  const refs: SnapshotRef[] = []
  for (const [path, load] of Object.entries(snapshotModules)) {
    const match = path.match(/^\/data\/(\d{4})\/(?:preseason|week-(\d{2}))\.json$/)
    if (!match) continue
    const week = match[2] === undefined ? 0 : Number(match[2])
    refs.push({
      path,
      season: match[1],
      kind: match[2] === undefined ? 'preseason' : 'week',
      week,
      load,
    })
  }
  return refs.sort((a, b) => a.season.localeCompare(b.season) || a.week - b.week)
}

export function latestSnapshot(): SnapshotRef | undefined {
  const all = listSnapshots()
  return all[all.length - 1]
}

export async function loadPlayers(season: string): Promise<PlayersFile> {
  const load = playersModules[`/data/${season}/players.json`]
  if (!load) throw new Error(`No players.json bundled for season ${season} — run npm run refresh.`)
  return load()
}
