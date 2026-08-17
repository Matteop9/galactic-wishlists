// Weekly refresh: pulls all Sleeper + FantasyCalc data and writes a dated
// snapshot plus the cached player dump. Run with `npm run refresh`.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSnapshot, SeasonMismatchError, validateSnapshot } from '../src/lib/api/buildSnapshot'
import { sleeper } from '../src/lib/api/sleeper'
import { leaguesConfig, thresholds } from '../src/lib/config'
import { playersFileSchema, type PlayersFile, type Snapshot } from '../src/lib/types'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(root, 'data', leaguesConfig.season)
const playersPath = path.join(dataDir, 'players.json')

const KEEP_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF'])

function log(message: string) {
  console.log(message)
}

async function refreshPlayers(snapshot: Snapshot): Promise<PlayersFile> {
  if (fs.existsSync(playersPath)) {
    const existing = playersFileSchema.parse(JSON.parse(fs.readFileSync(playersPath, 'utf8')))
    const ageDays = (Date.now() - Date.parse(existing.meta.fetchedAt)) / 86_400_000
    if (ageDays <= thresholds.refresh.playersDumpMaxAgeDays) {
      log(`Players dump is ${ageDays.toFixed(1)} days old — reusing cache (${existing.meta.count} players).`)
      return existing
    }
    log(`Players dump is ${ageDays.toFixed(1)} days old — refreshing.`)
  } else {
    log('No players dump cached — fetching (~5MB, one-off).')
  }

  const rosteredIds = new Set(snapshot.leagues.flatMap((l) => l.rosters.flatMap((r) => r.players)))
  const raw = await sleeper.players({
    retries: thresholds.refresh.retries,
    retryBackoffMs: thresholds.refresh.retryBackoffMs,
    timeoutMs: 120_000, // the full dump is slow; don't use the normal per-request timeout
  })

  const players: PlayersFile['players'] = {}
  for (const [id, p] of Object.entries(raw)) {
    const position = p.position ?? ''
    if (!KEEP_POSITIONS.has(position) && !rosteredIds.has(id)) continue
    players[id] = {
      name: p.full_name ?? [p.first_name, p.last_name].filter(Boolean).join(' '),
      position,
      team: p.team ?? null,
      age: p.age ?? null,
      yearsExp: p.years_exp ?? null,
      injuryStatus: p.injury_status ?? null,
      status: p.status ?? null,
    }
  }

  const file: PlayersFile = {
    meta: { fetchedAt: new Date().toISOString(), source: 'sleeper', count: Object.keys(players).length },
    players,
  }
  fs.writeFileSync(playersPath, JSON.stringify(file))
  log(`Wrote ${playersPath} (${Object.keys(players).length} players).`)
  return file
}

async function main() {
  fs.mkdirSync(dataDir, { recursive: true })

  const snapshot = await buildSnapshot(leaguesConfig, thresholds, log)
  const players = await refreshPlayers(snapshot)

  const { errors, warnings, joinRates } = validateSnapshot(snapshot, leaguesConfig, thresholds, players)
  for (const warning of warnings) console.warn(`WARN  ${warning}`)
  if (errors.length > 0) {
    for (const error of errors) console.error(`ERROR ${error}`)
    console.error('Snapshot NOT written — fix the errors above and re-run.')
    process.exit(1)
  }

  const filename =
    snapshot.meta.kind === 'preseason'
      ? 'preseason.json'
      : `week-${String(snapshot.meta.week).padStart(2, '0')}.json`
  const outPath = path.join(dataDir, filename)
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2))

  log('')
  log('League              | My roster | Rosters | FC join | Future picks traded')
  for (const league of snapshot.leagues) {
    const mine = league.rosters.find((r) => r.ownerId === leaguesConfig.userId)
    const join = joinRates[league.label]
    log(
      `${league.label.padEnd(19)} | ${mine ? `#${mine.rosterId}`.padEnd(9) : 'MISSING  '} | ${String(league.rosters.length).padEnd(7)} | ${join !== undefined ? `${(join * 100).toFixed(1)}%`.padEnd(7) : 'n/a    '} | ${league.tradedPicks.length}`,
    )
  }
  log('')
  log(`Wrote ${outPath}`)
}

main().catch((error) => {
  if (error instanceof SeasonMismatchError) {
    console.error(`ERROR ${error.message}`)
  } else {
    console.error(error)
  }
  process.exit(1)
})
