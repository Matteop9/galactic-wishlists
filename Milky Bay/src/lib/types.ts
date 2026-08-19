export type AccaKind = 'W' | 'random'
export type GwStatus = 'scheduled' | 'open' | 'closed' | 'settled' | 'skipped'
/** Why a pick scored 0 without being a straight loss (rules §9). */
export type VoidReason = 'invalid' | 'postponed'
export type Award = 'winner' | 'half_season_winner' | 'wooden_spoon' | 'half_wooden_spoon'

export interface Player {
  id: string
  name: string
  auth_user_id: string | null
  is_admin: boolean
  plays: boolean
}

export interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  mini_league_gws: number
}

export interface Gameweek {
  id: string
  season_id: string
  gw_date: string
  window_opens: string
  window_closes: string
  status: GwStatus
  mini_league_id: string | null
}

export interface MiniLeague {
  id: string
  season_id: string
  name: string
  created_at: string
}

export interface MiniLeaderboardRow {
  player_id: string
  name: string
  entries: number
  wins: number
  score: number
}

export interface SeasonHistoryRow {
  id: string
  season_label: string
  player_id: string
  position: number
  score: number
}

export interface Feedback {
  id: string
  player_id: string
  message: string
  status: 'new' | 'planned' | 'done' | 'dismissed'
  created_at: string
}

export interface RulesSection {
  id: string
  sort: number
  title: string
  items: string[]
}

export interface Pick {
  id: string
  gameweek_id: string
  player_id: string
  acca_kind: AccaKind
  game: string | null
  selection: string
  odds: number
  odds_display: string | null
  result: 0 | 1 | null
  void_reason: VoidReason | null
  is_no_pick: boolean
  locked: boolean
  submitted_at: string
  submitted_by: string | null
}

export interface PickScore extends Pick {
  name: string
  gw_date: string
  season_id: string
  capped_odds: number
  sole_loser: boolean
  /** null while unsettled — a LOSS stays null until the whole acca settles
      (sole-loser is undecidable mid-settlement). */
  points: number | null
}

export interface PlayerWeek {
  player_id: string
  name: string
  gameweek_id: string
  gw_date: string
  season_id: string
  week_points: number | null
  wins: number
  had_sole_loss: boolean
  no_picks: number
}

export interface LeaderboardRow {
  player_id: string
  name: string
  entries: number
  wins: number
  win_pct: number | null
  avg_odds: number | null
  sole_losses: number
  no_picks: number
  bonus: number
  minus: number
  score: number
}

export interface HonoursRow {
  player_id: string
  crowns: number
  half_crowns: number
  spoons: number
  half_spoons: number
  detail: string[]
}

export interface Honour {
  id: string
  season_label: string
  player_id: string
  award: Award
  notes: string | null
}

export interface Adjustment {
  id: string
  gameweek_id: string | null
  player_id: string | null
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
