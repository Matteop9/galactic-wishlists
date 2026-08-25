import { supabase } from './supabase'
import { addDays, londonToday } from './format'
import type {
  Adjustment,
  AuditRow,
  Dispute,
  Feedback,
  FormCell,
  Gameweek,
  LeaderboardRow,
  LivePickStatus,
  LlmUsageRow,
  PickScore,
  Player,
  Season,
  SeasonChampionRow,
  SeasonLeaderboardRow,
  SeasonTeamMember,
  TeamLeaderboardRow,
  TeamWeekScore,
} from './types'

async function unwrap<T>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data as T
}

export const ALL_TIME: [string, string] = ['2023-01-01', '2100-01-01']

export const fetchPlayers = () =>
  unwrap<Player[]>(supabase.from('players').select('*').order('name'))

export const fetchSeasons = () =>
  unwrap<Season[]>(supabase.from('seasons').select('*').order('start_date'))

export const fetchGameweeks = () =>
  unwrap<Gameweek[]>(supabase.from('gameweeks').select('*').order('gw_date'))

export const fetchGameweek = (id: string) =>
  unwrap<Gameweek>(supabase.from('gameweeks').select('*').eq('id', id).single())

/** `excludeBreaks` drops international-break gameweeks from the range (migration 0019). */
export const fetchLeaderboard = (start: string, end: string, excludeBreaks = false) =>
  unwrap<LeaderboardRow[]>(
    supabase.rpc('leaderboard', {
      range_start: start,
      range_end: end,
      p_exclude_breaks: excludeBreaks,
    }),
  )

export const fetchTeamLeaderboard = (start: string, end: string, excludeBreaks = false) =>
  unwrap<TeamLeaderboardRow[]>(
    supabase.rpc('team_leaderboard', {
      range_start: start,
      range_end: end,
      p_exclude_breaks: excludeBreaks,
    }),
  )

export const fetchSeasonLeaderboard = (seasonId: string) =>
  unwrap<SeasonLeaderboardRow[]>(supabase.rpc('season_leaderboard', { p_season: seasonId }))

/** Gold = individual season winner, silver = winning-team member (migration 0021). */
export const fetchSeasonChampions = () =>
  unwrap<SeasonChampionRow[]>(supabase.rpc('season_champions'))

export const fetchFormGrid = (lastN = 5) =>
  unwrap<FormCell[]>(supabase.rpc('form_grid', { last_n: lastN }))

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

export const fetchTeamWeekScores = (gameweekId: string) =>
  unwrap<TeamWeekScore[]>(
    supabase.from('v_team_week_scores').select('*').eq('gameweek_id', gameweekId),
  )

export const fetchAllTeamWeekScores = () =>
  unwrap<TeamWeekScore[]>(supabase.from('v_team_week_scores').select('*'))

/** Every team name ever picked, with usage counts — feeds the pick combobox.
    Paged reads because PostgREST caps a single response at 1,000 rows. */
export interface TeamUsage {
  name: string
  uses: number
}

export async function fetchTeamDictionary(): Promise<TeamUsage[]> {
  const counts = new Map<string, number>()
  const page = 1000
  for (let from = 0; ; from += page) {
    const rows = await unwrap<{ team: string; second_team: string | null; method: string }[]>(
      supabase.from('picks').select('team,second_team,method').range(from, from + page - 1),
    )
    for (const r of rows) {
      if (r.method !== 'N/A' && r.team && r.team !== 'N/A')
        counts.set(r.team, (counts.get(r.team) ?? 0) + 1)
      if (r.second_team) counts.set(r.second_team, (counts.get(r.second_team) ?? 0) + 1)
    }
    if (rows.length < page) break
  }
  return [...counts.entries()]
    .map(([name, uses]) => ({ name, uses }))
    .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name))
}

export const fetchLiveStatuses = (gameweekId: string) =>
  unwrap<LivePickStatus[]>(
    supabase.from('v_live_pick_status').select('*').eq('gameweek_id', gameweekId),
  )

export const fetchSeasonTeamMembers = (seasonId: string) =>
  unwrap<SeasonTeamMember[]>(
    supabase.from('season_team_members').select('*').eq('season_id', seasonId),
  )

export const fetchDisputes = () =>
  unwrap<Dispute[]>(supabase.from('disputes').select('*').order('created_at', { ascending: false }))

export const fetchAudit = (limit = 100) =>
  unwrap<AuditRow[]>(
    supabase.from('audit_log').select('*').order('at', { ascending: false }).limit(limit),
  )

export const fetchLlmUsage = () =>
  unwrap<LlmUsageRow[]>(
    supabase.from('llm_usage').select('*').order('at', { ascending: false }).limit(200),
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

/** Match-day check. The entry window stays open until Saturday midnight, so
    'open' alone no longer means pre-match — live scores are relevant from the
    Saturday itself (and while 'closed', i.e. post-window pre-settlement). */
export const isMatchday = (gw: Gameweek | null | undefined): boolean =>
  !!gw &&
  gw.live_enabled &&
  (gw.status === 'closed' ||
    (gw.status === 'open' && londonToday() >= gw.gw_date))

// --- mutations ---

export const upsertPick = (pick: {
  gameweek_id: string
  player_id: string
  method: string
  team: string
  second_team: string | null
  odds: number
}) =>
  unwrap(
    supabase
      .from('picks')
      .upsert(pick, { onConflict: 'gameweek_id,player_id' })
      .select()
      .single(),
  )

export const settlePick = (
  pickId: string,
  result: 0 | 1 | null,
  voidReason: 'invalid' | 'postponed' | null = null,
) =>
  unwrap(
    supabase.rpc('settle_pick', { p_pick: pickId, p_result: result, p_void_reason: voidReason }),
  )

export const matchPick = (
  pickId: string,
  fixtureId: number | null,
  side: 'HOME' | 'AWAY' | null,
  confidence = 1.0,
) =>
  unwrap(
    supabase.rpc('match_pick', {
      p_pick: pickId,
      p_fixture: fixtureId,
      p_side: side,
      p_confidence: confidence,
    }),
  )

export const raiseDispute = (d: { pick_id: string; raised_by: string; kind: string; reason: string }) =>
  unwrap(supabase.from('disputes').insert(d).select().single())

export const resolveDispute = (id: string, status: 'upheld' | 'rejected', note: string) =>
  unwrap(supabase.rpc('resolve_dispute', { p_dispute: id, p_status: status, p_note: note }))

export const setGameweekStatus = (id: string, status: string) =>
  unwrap(supabase.rpc('set_gameweek_status', { p_gw: id, p_status: status }))

export const createGameweek = (date: string) =>
  unwrap(supabase.rpc('create_gameweek', { p_date: date }))

/** Toggle a gameweek's international-break mode. Break weeks have no club
    football, so live polling goes off with it (and back on when undone). */
export const setIntlBreak = (id: string, on: boolean) =>
  unwrap(
    supabase
      .from('gameweeks')
      .update({ is_international_break: on, live_enabled: !on })
      .eq('id', id)
      .select()
      .single(),
  )

// --- username auth ---

export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@players.jhh-acca.app`

export const fetchUnclaimedPlayers = () =>
  unwrap<{ id: string; name: string; acca_team: string }[]>(supabase.rpc('unclaimed_players'))

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

// --- feedback ---

export const fetchFeedback = () =>
  unwrap<Feedback[]>(supabase.from('feedback').select('*').order('created_at', { ascending: false }))

export const submitFeedback = (playerId: string, message: string) =>
  unwrap(supabase.from('feedback').insert({ player_id: playerId, message }).select().single())

export const setFeedbackStatus = (id: string, status: Feedback['status']) =>
  unwrap(supabase.from('feedback').update({ status }).eq('id', id).select().single())

export const addAdjustment = (a: {
  gameweek_id: string
  player_id: string | null
  acca_team: string | null
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

export const fetchFixtures = (gameweekId: string) =>
  unwrap<import('./types').Fixture[]>(
    supabase.from('fixtures').select('*').eq('gameweek_id', gameweekId).order('kickoff'),
  )

export interface MatchSuggestion {
  pick_id: string
  fixture_id: number | null
  fixture_side: 'HOME' | 'AWAY' | null
  confidence: number | null
}

export const fetchMatchSuggestions = () =>
  unwrap<MatchSuggestion[]>(supabase.from('match_suggestions').select('*'))

export const deleteMatchSuggestion = (pickId: string) =>
  unwrap(supabase.from('match_suggestions').delete().eq('pick_id', pickId))

export const fetchWeekendFixtures = (gw: string) =>
  unwrap(supabase.rpc('fetch_weekend_fixtures', { p_gw: gw }))

export const requestPickMatching = (gw: string) =>
  unwrap(supabase.rpc('request_pick_matching', { p_gw: gw }))

export const ingestResponses = () => unwrap(supabase.rpc('ingest_responses'))
