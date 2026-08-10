export type AccaTeam = 'VDL' | 'JHP'
export type Method = 'Win' | 'BTTS' | 'N/A'
export type GwStatus = 'scheduled' | 'open' | 'closed' | 'settled' | 'skipped'

export interface Player {
  id: string
  name: string
  acca_team: AccaTeam
  auth_user_id: string | null
  is_admin: boolean
  live_table_default: boolean
}

export interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  kind: 'league' | 'special' | 'test'
  double_rule: boolean
}

export interface Gameweek {
  id: string
  season_id: string
  gw_date: string
  window_opens: string
  window_closes: string
  status: GwStatus
  is_season_final: boolean
  live_enabled: boolean
}

export interface Pick {
  id: string
  gameweek_id: string
  player_id: string
  method: Method
  team: string
  second_team: string | null
  odds: number
  result: 0 | 1 | null
  submitted_at: string
  submitted_by: string | null
  locked: boolean
  fixture_id: number | null
  fixture_side: 'HOME' | 'AWAY' | null
  match_confidence: number | null
}

export interface PickScore extends Omit<Pick, 'match_confidence'> {
  name: string
  acca_team: AccaTeam
  team_name: string
  gw_date: string
  season_id: string
  season_kind: Season['kind']
  doubled: boolean
  effective_odds: number
  form_value: number | null
}

export interface LeaderboardRow {
  player_id: string
  name: string
  acca_team: AccaTeam
  entries: number
  wins: number
  win_pct: number | null
  avg_odds: number | null
  avg_win_odds: number | null
  avg_loss_odds: number | null
  last_win: string | null
  last_loss: string | null
  days_since_win: number | null
  win_streak: number
  form: number
  bonus: number
  minus: number
  score: number
  score_per_match: number | null
}

export interface TeamLeaderboardRow {
  acca_team: AccaTeam
  entries: number
  wins: number
  win_pct: number | null
  avg_odds: number | null
  sweeps: number
  score: number
  score_per_match: number | null
}

export interface SeasonLeaderboardRow {
  player_id: string
  name: string
  team_name: string
  entries: number
  wins: number
  score: number
  score_per_match: number | null
}

export interface FormCell {
  player_id: string
  name: string
  acca_team: AccaTeam
  gw_date: string
  form_value: number
  week_has_sweep: boolean
}

export interface TeamWeekScore {
  gameweek_id: string
  team_name: string
  week_score: number
  legs: number
  settled: number
  wins: number
  losses: number
  doubled: boolean
}

export interface Fixture {
  id: number
  gameweek_id: string
  competition: string
  home_team: string
  away_team: string
  kickoff: string
  status: string
  home_score: number | null
  away_score: number | null
  minute: string | null
  last_polled: string | null
}

export type LiveState =
  | 'NO_LIVE'
  | 'NOT_STARTED'
  | 'WINNING'
  | 'LEVEL'
  | 'LOSING'
  | 'WON'
  | 'LOST'
  | 'LANDED'
  | 'WAITING'

export interface LivePickStatus {
  pick_id: string
  gameweek_id: string
  player_id: string
  method: Method
  fixture_id: number | null
  fixture_status: string | null
  home_team: string | null
  away_team: string | null
  home_score: number | null
  away_score: number | null
  minute: string | null
  kickoff: string | null
  live_state: LiveState
}

export interface Dispute {
  id: string
  pick_id: string
  raised_by: string
  kind: 'pick' | 'odds' | 'result'
  reason: string
  status: 'open' | 'upheld' | 'rejected'
  resolution_note: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export interface SeasonTeamMember {
  season_id: string
  team_name: string
  player_id: string
}

export interface Feedback {
  id: string
  player_id: string
  message: string
  status: 'new' | 'planned' | 'done' | 'dismissed'
  created_at: string
}

export interface Adjustment {
  id: string
  gameweek_id: string | null
  player_id: string | null
  acca_team: string | null
  kind: 'Bonus' | 'Minus'
  reason: string
  score: number
  created_at: string
}

export interface AuditRow {
  id: number
  at: string
  action: string
  table_name: string
  row_id: string | null
  old_row: Record<string, unknown> | null
  new_row: Record<string, unknown> | null
  actor_auth: string | null
  actor_player: string | null
  ip: string | null
  user_agent: string | null
}

export interface LlmUsageRow {
  id: number
  at: string
  job: string
  model: string
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  cost_usd: number | null
  ok: boolean
  note: string | null
}
