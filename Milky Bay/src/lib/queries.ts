import { supabase } from './supabase'
import { addDays, londonToday } from './format'
import type {
  Adjustment,
  AuditRow,
  Feedback,
  Gameweek,
  Honour,
  HonoursRow,
  LeaderboardRow,
  MiniLeaderboardRow,
  MiniLeague,
  PickScore,
  Player,
  PlayerWeek,
  RulesSection,
  Season,
  SeasonHistoryRow,
} from './types'

async function unwrap<T>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data as T
}

export const ALL_TIME: [string, string] = ['2022-01-01', '2100-01-01']

export const fetchPlayers = () =>
  unwrap<Player[]>(supabase.from('players').select('*').order('name'))

export const fetchSeasons = () =>
  unwrap<Season[]>(supabase.from('seasons').select('*').order('start_date'))

export const fetchGameweeks = () =>
  unwrap<Gameweek[]>(supabase.from('gameweeks').select('*').order('gw_date'))

export const fetchGameweek = (id: string) =>
  unwrap<Gameweek>(supabase.from('gameweeks').select('*').eq('id', id).single())

export const fetchLeaderboard = (start: string, end: string) =>
  unwrap<LeaderboardRow[]>(
    supabase.rpc('leaderboard', { range_start: start, range_end: end }),
  )

export const fetchPickScores = (gameweekId: string) =>
  unwrap<PickScore[]>(
    supabase.from('v_pick_scores').select('*').eq('gameweek_id', gameweekId).order('name'),
  )

export const fetchPlayerPickScores = (playerId: string) =>
  unwrap<PickScore[]>(
    supabase
      .from('v_pick_scores')
      .select('*')
      .eq('player_id', playerId)
      .order('gw_date', { ascending: false }),
  )

export const fetchPlayerWeeks = (gameweekId?: string) => {
  let q = supabase.from('v_player_weeks').select('*')
  if (gameweekId) q = q.eq('gameweek_id', gameweekId)
  return unwrap<PlayerWeek[]>(q)
}

export const fetchHonours = () =>
  unwrap<HonoursRow[]>(supabase.from('v_honours').select('*'))

export const fetchHonoursList = () =>
  unwrap<Honour[]>(supabase.from('honours').select('*').order('season_label'))

/** Every team ever picked in a W acca, with usage counts — feeds the pick
    combobox. Reads the scores view (the client has no direct grant on picks)
    in pages because PostgREST caps a single response at 1,000 rows. */
export interface TeamUsage {
  name: string
  uses: number
}

export async function fetchTeamDictionary(): Promise<TeamUsage[]> {
  const counts = new Map<string, number>()
  const page = 1000
  for (let from = 0; ; from += page) {
    const rows = await unwrap<{ selection: string; is_no_pick: boolean }[]>(
      supabase
        .from('v_pick_scores')
        .select('selection,is_no_pick')
        .eq('acca_kind', 'W')
        .range(from, from + page - 1),
    )
    for (const r of rows) {
      const name = r.selection?.trim()
      if (!r.is_no_pick && name) counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    if (rows.length < page) break
  }
  return [...counts.entries()]
    .map(([name, uses]) => ({ name, uses }))
    .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name))
}

// --- mini leagues ---

export const fetchMiniLeagues = () =>
  unwrap<MiniLeague[]>(supabase.from('mini_leagues').select('*').order('created_at'))

export const createMiniLeague = (seasonId: string, name: string) =>
  unwrap<MiniLeague>(
    supabase.from('mini_leagues').insert({ season_id: seasonId, name }).select().single(),
  )

export const deleteMiniLeague = (id: string) =>
  unwrap(supabase.from('mini_leagues').delete().eq('id', id))

/** Assign (or clear, with null) a gameweek's mini league. */
export const setGwMiniLeague = (gwId: string, miniLeagueId: string | null) =>
  unwrap(
    supabase.from('gameweeks').update({ mini_league_id: miniLeagueId }).eq('id', gwId).select().single(),
  )

export const fetchMiniLeaderboard = (miniId: string) =>
  unwrap<MiniLeaderboardRow[]>(supabase.rpc('mini_leaderboard', { p_mini: miniId }))

// --- past seasons & rules ---

export const fetchSeasonHistory = () =>
  unwrap<SeasonHistoryRow[]>(
    supabase.from('season_history').select('*').order('season_label', { ascending: false }).order('position'),
  )

export const fetchRules = () =>
  unwrap<RulesSection[]>(supabase.from('rules_sections').select('*').order('sort'))

export const saveRulesSection = (s: { id: string; sort: number; title: string; items: string[] }) =>
  unwrap(
    supabase.from('rules_sections').update({ sort: s.sort, title: s.title, items: s.items }).eq('id', s.id).select().single(),
  )

export const addRulesSection = (s: { sort: number; title: string; items: string[] }) =>
  unwrap<RulesSection>(supabase.from('rules_sections').insert(s).select().single())

export const deleteRulesSection = (id: string) =>
  unwrap(supabase.from('rules_sections').delete().eq('id', id))

// --- feedback ---

export const fetchFeedback = () =>
  unwrap<Feedback[]>(supabase.from('feedback').select('*').order('created_at', { ascending: false }))

export const submitFeedback = (playerId: string, message: string) =>
  unwrap(supabase.from('feedback').insert({ player_id: playerId, message }).select().single())

export const setFeedbackStatus = (id: string, status: Feedback['status']) =>
  unwrap(supabase.from('feedback').update({ status }).eq('id', id).select().single())

export const fetchAudit = (limit = 100) =>
  unwrap<AuditRow[]>(
    supabase.from('audit_log').select('*').order('at', { ascending: false }).limit(limit),
  )

/** The gameweek the app should focus on. Prefers a live window, then the
    weekend that just happened (so Sun–Tue still shows last week's results
    instead of jumping to next week's empty card), then the next upcoming,
    then the latest settled ever. `today` is Europe/London, matching gw_date. */
export async function fetchCurrentGameweek(): Promise<Gameweek | null> {
  const gws = await fetchGameweeks()
  const today = londonToday()
  const active = gws.find(
    (g) => ['open', 'closed'].includes(g.status) && g.gw_date >= today,
  )
  if (active) return active
  // A weekend that finished in the last few days — keep showing it until the
  // next window opens (status flips to 'open' and the check above catches it).
  const recentlyPlayed = [...gws]
    .reverse()
    .find((g) => g.status !== 'scheduled' && g.gw_date >= addDays(today, -4))
  if (recentlyPlayed) return recentlyPlayed
  const upcoming = gws.find((g) => g.status === 'scheduled' && g.gw_date >= today)
  const settled = [...gws].reverse().find((g) => g.status === 'settled')
  return upcoming ?? settled ?? null
}

// --- mutations ---

/** Picks go through an RPC, not a table upsert: `picks` has column-level
    grants (result/locked/stamps are un-writable) and PostgREST's upsert puts
    the conflict-target columns in its DO UPDATE SET list, which trips the
    UPDATE privilege check on every insert. See mb_0016. */
export const upsertPick = (pick: {
  gameweek_id: string
  player_id: string
  acca_kind: 'W' | 'random'
  game: string | null
  selection: string
  odds: number
  odds_display: string | null
}) =>
  unwrap<string>(
    supabase.rpc('upsert_pick', {
      p_gameweek: pick.gameweek_id,
      p_player: pick.player_id,
      p_kind: pick.acca_kind,
      p_selection: pick.selection,
      p_odds: pick.odds,
      p_game: pick.game,
      p_odds_display: pick.odds_display,
    }),
  )

export const settlePick = (
  pickId: string,
  result: 0 | 1 | null,
  voidReason: 'invalid' | 'postponed' | null = null,
) =>
  unwrap(
    supabase.rpc('settle_pick', { p_pick: pickId, p_result: result, p_void_reason: voidReason }),
  )

export const lockPick = (pickId: string, locked: boolean) =>
  unwrap(supabase.rpc('lock_pick', { p_pick: pickId, p_locked: locked }))

export const setGameweekStatus = (id: string, status: string) =>
  unwrap(supabase.rpc('set_gameweek_status', { p_gw: id, p_status: status }))

export const createGameweek = (date: string) =>
  unwrap(supabase.rpc('create_gameweek', { p_date: date }))

// --- username auth (SHARED with The Acca — same domain, same accounts) ---

export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@players.jhh-acca.app`

export const fetchUnclaimedPlayers = () =>
  unwrap<{ id: string; name: string }[]>(supabase.rpc('unclaimed_players'))

/** Creates the auth user server-side and returns the email to sign in with. */
export const registerPlayer = (playerId: string, username: string, password: string, code: string) =>
  unwrap<string>(
    supabase.rpc('register_player', {
      p_player: playerId,
      p_username: username,
      p_password: password,
      p_code: code,
    }),
  )

/** Links the SIGNED-IN auth user (e.g. an existing Acca account) to a
    Milky Bay player row. */
export const linkPlayer = (playerId: string, code: string) =>
  unwrap<string>(supabase.rpc('link_player', { p_player: playerId, p_code: code }))

export const adminResetPassword = (playerId: string, password: string) =>
  unwrap(supabase.rpc('admin_reset_password', { p_player: playerId, p_password: password }))

export const adminUnlinkPlayer = (playerId: string) =>
  unwrap(supabase.rpc('admin_unlink_player', { p_player: playerId }))

export const fetchPlayerAccounts = () =>
  unwrap<{ player_id: string; username: string; created_at: string }[]>(
    supabase.rpc('admin_player_accounts'),
  )

// --- admin ---

export const fetchAdjustments = () =>
  unwrap<Adjustment[]>(
    supabase.from('adjustments').select('*').order('created_at', { ascending: false }),
  )

export const deleteAdjustment = (id: string) =>
  unwrap(supabase.from('adjustments').delete().eq('id', id))

export const addAdjustment = (a: {
  gameweek_id: string
  player_id: string | null
  kind: 'Bonus' | 'Minus'
  reason: string
  score: number
}) => unwrap(supabase.from('adjustments').insert(a).select().single())

export const fetchAppConfig = async (key: string) => {
  const { data, error } = await supabase.from('app_config').select('value').eq('key', key).maybeSingle()
  if (error) throw new Error(error.message)
  return (data?.value ?? null) as unknown
}

export const setAppConfig = (key: string, value: unknown) =>
  unwrap(supabase.from('app_config').upsert({ key, value }).select().single())

/* Team logos (mb_0019). Runtime overrides for the build-time crest maps in
   lib/teams.ts: a row wins over both, and badge_url null means "this name
   deliberately has no logo", which keeps it out of the admin's missing list.
   Admin-write, everyone-read. */
export interface TeamBadgeRow {
  team: string
  badge_url: string | null
  updated_at: string
  updated_by: string | null
}

export const fetchTeamBadges = () =>
  unwrap<TeamBadgeRow[]>(supabase.from('team_badges').select('*').order('team'))

export const saveTeamBadge = (team: string, badgeUrl: string | null) =>
  unwrap(supabase.from('team_badges').upsert({ team, badge_url: badgeUrl }).select().single())

export const deleteTeamBadge = (team: string) =>
  unwrap(supabase.from('team_badges').delete().eq('team', team))
