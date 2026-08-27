/* BULK SWEEP ONLY. For a single new club, use Admin → Team logos in the app
   (team_badges, migration 0025) — it searches the same API from the browser and
   is live for everyone instantly, no rerun and no deploy. Reach for this script
   when you want to re-resolve the whole set into the build-time baseline.

   Resolves club badges for every team name that has no football-data.org
   crest (lower-league + obscure European sides) via TheSportsDB search API,
   and generates src/lib/badges.ts. Rerun with:  npx tsx scripts/fetch-badges.ts
   Add new names to NAMES (and QUERY_ALIASES if the app name is a nickname).

   Matching is conservative: Soccer results only, exact-name > alternate-name
   > substring, and every match is printed for eyeballing before you commit. */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT_PATH = join(import.meta.dirname, '..', 'src', 'lib', 'badges.ts')

// Resume support: names already in src/lib/badges.ts are skipped, so the
// free-tier rate limit (~30 req/min) can't cost us finished work.
function loadExisting(): Record<string, string> {
  if (!existsSync(OUT_PATH)) return {}
  const src = readFileSync(OUT_PATH, 'utf8')
  const out: Record<string, string> = {}
  for (const m of src.matchAll(/^\s+(?:'((?:[^'\\]|\\.)+)'|([A-Za-z0-9_]+)):\s+'(https[^']+)',$/gm)) {
    out[(m[1] ?? m[2]).replace(/\\'/g, "'")] = m[3]
  }
  return out
}

// App names that already have football-data crests in src/lib/teams.ts are
// NOT listed here. Non-club entries (Boxing, NFL, Draw…) are excluded too.
const NAMES = [
  'Aberdeen', 'Accrington Stanley', 'AD Ceuta', 'Adelaide', 'AIK', 'Almeria',
  'Antalyaspor', 'Apoel Nicosia', 'Aris Limassol', 'Austria Vienna', 'Avellino',
  'Banska Bystrica', 'Barrow', 'Basel', 'Besiktas', 'Blackpool', 'Boavista',
  'Boca Juniors', 'Bradford', 'Braga', 'Bristol Rovers', 'Bromley', 'Burgos',
  'Caen', 'Cambridge', 'Cambuur', 'Castellon', 'CD Alvares', 'Ceara', 'Cesena',
  'Cheltenham', 'Chesterfield', 'Colchester', 'Como', 'Crawley', 'Cremonese',
  'Crewe', 'CSKA Sofia', 'Darmstadt', 'Deportes Tolima', 'Deportivo la Coruna',
  'Doncaster', 'Dundee', 'Dundee United', 'Eibar', 'Elche', 'Elfsborg',
  'Estoril', 'Exeter', 'Famalicao', 'FC Aarau', 'FC Thun', 'FC Zurich',
  'Flamengo', 'Fleetwood', 'Fortuna Sittard', 'Frosinone', 'Galatasaray',
  'Gaziantep', 'Gil Vicente', 'Gillingham', 'Grenoble', 'Grimsby', 'Guimaraes',
  'Hammarby', 'Hannover', 'Hearts', 'Heidenheim', 'Hibernian', 'Holstein Kiel',
  'Huesca', 'Inter Miami', 'Istanbul Başakşehir', 'Juve Stabia', 'Le Havre',
  'Leganes', 'Levante', 'Levski Sofia', 'Leyton Orient', 'Lincoln',
  'Lokomotiv Plovdiv', 'Ludogorets Razgrad', 'Lugano', 'Malaga', 'Malmo',
  'Mansfield', 'Mirandes', 'Mjallby', 'MK Dons', 'Molde', 'Motherwell',
  'MSK Zilina', 'NEC', 'Newport County', 'Northampton', 'Notts County',
  'Nurnberg', 'Oldham', 'Oxford United', 'Paderborn', 'Palermo', 'Palmeiras',
  'Paris', 'Peterborough', 'Pisa', 'Plymouth', 'Port Vale', 'Racing club',
  'Racing Santander', 'Rapid Vienna', 'RB Salzburg', 'Salford', 'Sirius',
  'Slovan Bratislava', 'St Gallen', 'St Mirren', 'Stevenage', 'Stockport',
  'Sturm Graz', 'Swindon', 'Tranmere', 'Trabzonspor', 'Valerenga',
  'Valladolid', 'Vallecano', 'Viking FK', 'Walsall', 'Wimbledon', 'Wolfsberger',
  'Wrexham', 'Wycombe', 'Young Boys',
]

// App name → search term(s) tried in order. First hit wins.
const QUERY_ALIASES: Record<string, string[]> = {
  'AD Ceuta': ['Ceuta'],
  Adelaide: ['Adelaide United'],
  'Apoel Nicosia': ['APOEL'], // no TheSportsDB entry as of 2026-08 — stays initials
  'Banska Bystrica': ['Dukla Banska Bystrica'],
  Barrow: ['Barrow AFC', 'Barrow'],
  Blackpool: ['Blackpool FC', 'Blackpool'],
  Bradford: ['Bradford City'],
  Braga: ['Sporting Braga', 'SC Braga', 'Braga'],
  Burgos: ['Burgos CF'],
  Cambridge: ['Cambridge United'],
  Cambuur: ['SC Cambuur', 'Cambuur'],
  Castellon: ['CD Castellon', 'Castellon'],
  'CD Alvares': ['CD Alverca', 'Alverca'],
  Cheltenham: ['Cheltenham Town'],
  Colchester: ['Colchester United'],
  Crawley: ['Crawley Town'],
  Crewe: ['Crewe Alexandra'],
  'Deportivo la Coruna': ['Deportivo La Coruna'],
  Doncaster: ['Doncaster Rovers'],
  Exeter: ['Exeter City'],
  'FC Aarau': ['Aarau'],
  'FC Thun': ['Thun'],
  Fleetwood: ['Fleetwood Town'],
  Gaziantep: ['Gaziantep FK', 'Gaziantep'],
  Grimsby: ['Grimsby Town'],
  Guimaraes: ['Vitoria Guimaraes', 'Guimaraes'],
  Hannover: ['Hannover 96'],
  Hearts: ['Heart of Midlothian'],
  Huesca: ['SD Huesca', 'Huesca'],
  'Istanbul Başakşehir': ['Istanbul Basaksehir'],
  'Le Havre': ['Le Havre AC', 'Le Havre'],
  Lincoln: ['Lincoln City'],
  'Ludogorets Razgrad': ['Ludogorets', 'Ludogorets Razgrad'],
  Malmo: ['Malmö FF', 'Malmo FF', 'Malmo'],
  Mansfield: ['Mansfield Town'],
  Mirandes: ['CD Mirandes', 'Mirandes'],
  Mjallby: ['Mjällby AIF', 'Mjallby AIF', 'Mjallby'],
  'MK Dons': ['Milton Keynes Dons', 'MK Dons'],
  'MSK Zilina': ['Zilina'],
  NEC: ['NEC Nijmegen'],
  Northampton: ['Northampton Town'],
  Nurnberg: ['Nurnberg', 'Nürnberg'],
  Oldham: ['Oldham Athletic'],
  Paris: ['Paris FC'],
  Peterborough: ['Peterborough United'],
  Plymouth: ['Plymouth Argyle'],
  'Racing club': ['Racing Club'],
  'RB Salzburg': ['Red Bull Salzburg', 'RB Salzburg'],
  Salford: ['Salford City'],
  Sirius: ['IK Sirius', 'Sirius'],
  'St Gallen': ['St. Gallen', 'St Gallen'],
  Stockport: ['Stockport County'],
  Swindon: ['Swindon Town'],
  Tranmere: ['Tranmere Rovers'],
  Valerenga: ['Vålerenga', 'Valerenga'],
  Valladolid: ['Real Valladolid', 'Valladolid'],
  Vallecano: ['Rayo Vallecano'],
  'Viking FK': ['Viking FK', 'Viking'],
  Wimbledon: ['AFC Wimbledon'],
  Wolfsberger: ['Wolfsberger AC', 'Wolfsberger'],
  Wycombe: ['Wycombe Wanderers'],
}

interface SdbTeam {
  strTeam: string
  strTeamAlternate: string | null
  strSport: string
  strBadge: string | null
  strCountry: string | null
  strLeague: string | null
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9 ]/g, '').trim()

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function search(q: string): Promise<SdbTeam[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(q)}`
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url)
    if (res.status === 429 && attempt < 3) {
      process.stdout.write('(429, waiting 65s)')
      await sleep(65_000)
      continue
    }
    if (!res.ok) throw new Error(`${res.status} for ${q}`)
    const body = (await res.json()) as { teams: SdbTeam[] | null }
    return (body.teams ?? []).filter((t) => t.strSport === 'Soccer' && t.strBadge)
  }
}

function score(t: SdbTeam, q: string): number {
  const nq = norm(q)
  if (norm(t.strTeam) === nq) return 3
  const alts = (t.strTeamAlternate ?? '').split(',').map(norm)
  if (alts.includes(nq)) return 2
  if (norm(t.strTeam).includes(nq)) return 1
  return 0
}

async function main() {
  const resolved: Record<string, string> = loadExisting()
  const review: string[] = []
  const misses: string[] = []
  console.log(`resuming with ${Object.keys(resolved).length} already resolved`)

  for (const name of NAMES) {
    if (resolved[name]) continue
    const queries = QUERY_ALIASES[name] ?? [name]
    let best: { t: SdbTeam; s: number } | null = null
    for (const q of queries) {
      try {
        const teams = await search(q)
        for (const t of teams) {
          const s = score(t, q)
          if (s > 0 && (!best || s > best.s)) best = { t, s }
        }
      } catch (e) {
        console.error(`  ! ${name} (“${q}”): ${(e as Error).message}`)
      }
      await sleep(2300)
      if (best && best.s >= 2) break
    }
    if (best) {
      resolved[name] = best.t.strBadge!
      review.push(
        `${name.padEnd(24)} → ${best.t.strTeam.padEnd(28)} ${(best.t.strCountry ?? '?').padEnd(14)} ${best.t.strLeague ?? ''} [score ${best.s}]`,
      )
    } else {
      misses.push(name)
    }
    process.stdout.write('.')
  }

  console.log('\n\n--- matches ---')
  console.log(review.join('\n'))
  console.log('\n--- unresolved (will keep initials fallback) ---')
  console.log(misses.join(', ') || '(none)')

  const out = `/* GENERATED by scripts/fetch-badges.ts — do not hand-edit URLs.
   TheSportsDB badge base URLs for clubs without football-data.org crests.
   The component appends /small (64px variant) at render time. */

export const SDB_BADGES: Record<string, string> = {
${Object.entries(resolved)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  ${/^[A-Za-z0-9_]+$/.test(k) ? k : `'${k.replace(/'/g, "\\'")}'`}: '${v}',`)
  .join('\n')}
}
`
  writeFileSync(OUT_PATH, out)
  console.log(`\nWrote src/lib/badges.ts with ${Object.keys(resolved).length} badges; ${misses.length} unresolved.`)
}

main()
