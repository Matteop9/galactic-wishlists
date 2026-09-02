export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  tenpins: {
    Tables: {
      app_admins: {
        Row: {
          created_at: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_admins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string | null
          feed_event_id: string | null
          id: string
          profile_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          feed_event_id?: string | null
          id?: string
          profile_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          feed_event_id?: string | null
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_feed_event_id_fkey"
            columns: ["feed_event_id"]
            isOneToOne: false
            referencedRelation: "feed_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_events: {
        Row: {
          created_at: string | null
          game_id: string | null
          group_id: string | null
          highlights: Json | null
          id: string
          session_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          game_id?: string | null
          group_id?: string | null
          highlights?: Json | null
          id?: string
          session_id?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          game_id?: string | null
          group_id?: string | null
          highlights?: Json | null
          id?: string
          session_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          kind: string
          message: string
          profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          kind?: string
          message: string
          profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string
          profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frames: {
        Row: {
          cumulative: number | null
          frame_no: number
          game_player_id: string
          is_split: boolean | null
          rolls: Json
        }
        Insert: {
          cumulative?: number | null
          frame_no: number
          game_player_id: string
          is_split?: boolean | null
          rolls: Json
        }
        Update: {
          cumulative?: number | null
          frame_no?: number
          game_player_id?: string
          is_split?: boolean | null
          rolls?: Json
        }
        Relationships: [
          {
            foreignKeyName: "frames_game_player_id_fkey"
            columns: ["game_player_id"]
            isOneToOne: false
            referencedRelation: "game_players"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee: string
          created_at: string | null
          requester: string
          status: string
        }
        Insert: {
          addressee: string
          created_at?: string | null
          requester: string
          status?: string
        }
        Update: {
          addressee?: string
          created_at?: string | null
          requester?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_fkey"
            columns: ["addressee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_fkey"
            columns: ["requester"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          final_score: number | null
          game_id: string | null
          guest_name: string | null
          id: string
          opens: number | null
          profile_id: string | null
          seat_order: number
          spares: number | null
          strikes: number | null
        }
        Insert: {
          final_score?: number | null
          game_id?: string | null
          guest_name?: string | null
          id?: string
          opens?: number | null
          profile_id?: string | null
          seat_order: number
          spares?: number | null
          strikes?: number | null
        }
        Update: {
          final_score?: number | null
          game_id?: string | null
          guest_name?: string | null
          id?: string
          opens?: number | null
          profile_id?: string | null
          seat_order?: number
          spares?: number | null
          strikes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_by: string
          entry_type: string
          extraction: Json | null
          game_number: number
          id: string
          photo_path: string | null
          played_at: string
          session_id: string | null
          status: string
          verification_status: string
        }
        Insert: {
          created_by: string
          entry_type: string
          extraction?: Json | null
          game_number?: number
          id?: string
          photo_path?: string | null
          played_at?: string
          session_id?: string | null
          status?: string
          verification_status?: string
        }
        Update: {
          created_by?: string
          entry_type?: string
          extraction?: Json | null
          game_number?: number
          id?: string
          photo_path?: string | null
          played_at?: string
          session_id?: string | null
          status?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string | null
          profile_id: string
          role: string
        }
        Insert: {
          group_id: string
          joined_at?: string | null
          profile_id: string
          role?: string
        }
        Update: {
          group_id?: string
          joined_at?: string | null
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          created_by: string
          handicap_basis: number
          handicap_pct: number
          id: string
          invite_code: string | null
          name: string
          season_ends: string | null
          season_name: string | null
          season_starts: string | null
          verified_only_leaderboard: boolean
        }
        Insert: {
          created_at?: string | null
          created_by: string
          handicap_basis?: number
          handicap_pct?: number
          id?: string
          invite_code?: string | null
          name: string
          season_ends?: string | null
          season_name?: string | null
          season_starts?: string | null
          verified_only_leaderboard?: boolean
        }
        Update: {
          created_at?: string | null
          created_by?: string
          handicap_basis?: number
          handicap_pct?: number
          id?: string
          invite_code?: string | null
          name?: string
          season_ends?: string | null
          season_name?: string | null
          season_starts?: string | null
          verified_only_leaderboard?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_claims: {
        Row: {
          claim_code: string | null
          claimed_at: string | null
          claimed_by: string | null
          group_id: string
          guest_name: string
          id: string
        }
        Insert: {
          claim_code?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          group_id: string
          guest_name: string
          id?: string
        }
        Update: {
          claim_code?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          group_id?: string
          guest_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_claims_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_claims_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      match_days: {
        Row: {
          best_of: number
          created_at: string | null
          created_by: string
          group_id: string
          handicap_basis: number
          handicap_pct: number
          id: string
          scoring_mode: string
          session_id: string
          status: string
        }
        Insert: {
          best_of?: number
          created_at?: string | null
          created_by: string
          group_id: string
          handicap_basis: number
          handicap_pct: number
          id?: string
          scoring_mode?: string
          session_id: string
          status?: string
        }
        Update: {
          best_of?: number
          created_at?: string | null
          created_by?: string
          group_id?: string
          handicap_basis?: number
          handicap_pct?: number
          id?: string
          scoring_mode?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_days_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_days_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_days_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      match_day_players: {
        Row: {
          guest_name: string | null
          handicap: number
          id: string
          match_day_id: string
          pairing_order: number
          profile_id: string | null
          team_id: string
        }
        Insert: {
          guest_name?: string | null
          handicap?: number
          id?: string
          match_day_id: string
          pairing_order?: number
          profile_id?: string | null
          team_id: string
        }
        Update: {
          guest_name?: string | null
          handicap?: number
          id?: string
          match_day_id?: string
          pairing_order?: number
          profile_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_day_players_match_day_id_fkey"
            columns: ["match_day_id"]
            isOneToOne: false
            referencedRelation: "match_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_day_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_day_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "match_day_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_day_teams: {
        Row: {
          id: string
          match_day_id: string
          name: string
          team_order: number
        }
        Insert: {
          id?: string
          match_day_id: string
          name: string
          team_order?: number
        }
        Update: {
          id?: string
          match_day_id?: string
          name?: string
          team_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_day_teams_match_day_id_fkey"
            columns: ["match_day_id"]
            isOneToOne: false
            referencedRelation: "match_days"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string | null
          feed_event_id: string | null
          id: string
          match_day_id: string | null
          profile_id: string
          read_at: string | null
          session_id: string | null
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          feed_event_id?: string | null
          id?: string
          match_day_id?: string | null
          profile_id: string
          read_at?: string | null
          session_id?: string | null
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          feed_event_id?: string | null
          id?: string
          match_day_id?: string | null
          profile_id?: string
          read_at?: string | null
          session_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_feed_event_id_fkey"
            columns: ["feed_event_id"]
            isOneToOne: false
            referencedRelation: "feed_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_match_day_id_fkey"
            columns: ["match_day_id"]
            isOneToOne: false
            referencedRelation: "match_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_events: {
        Row: {
          id: number
          profile_id: string
          at: string
          ok: boolean
          model: string | null
          prompt_tokens: number | null
          completion_tokens: number | null
          cost_usd: number | null
          note: string | null
        }
        Insert: {
          profile_id: string
          at?: string
          ok?: boolean
          model?: string | null
          prompt_tokens?: number | null
          completion_tokens?: number | null
          cost_usd?: number | null
          note?: string | null
        }
        Update: {
          ok?: boolean
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_config: {
        Row: {
          job: string
          model: string
          max_tokens: number
          daily_cap: number
          enabled: boolean
        }
        Insert: {
          job: string
          model: string
          max_tokens?: number
          daily_cap?: number
          enabled?: boolean
        }
        Update: {
          model?: string
          max_tokens?: number
          daily_cap?: number
          enabled?: boolean
        }
        Relationships: []
      }
      name_mappings: {
        Row: {
          displayed_name: string
          group_id: string
          guest_name: string | null
          profile_id: string | null
        }
        Insert: {
          displayed_name: string
          group_id: string
          guest_name?: string | null
          profile_id?: string | null
        }
        Update: {
          displayed_name?: string
          group_id?: string
          guest_name?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "name_mappings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "name_mappings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string
          id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name: string
          id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          emoji: string
          feed_event_id: string
          profile_id: string
        }
        Insert: {
          emoji: string
          feed_event_id: string
          profile_id: string
        }
        Update: {
          emoji?: string
          feed_event_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_feed_event_id_fkey"
            columns: ["feed_event_id"]
            isOneToOne: false
            referencedRelation: "feed_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_viewers: {
        Row: {
          joined_at: string | null
          profile_id: string
          session_id: string
        }
        Insert: {
          joined_at?: string | null
          profile_id: string
          session_id: string
        }
        Update: {
          joined_at?: string | null
          profile_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_viewers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_viewers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_by: string
          group_id: string | null
          id: string
          join_code: string | null
          started_at: string | null
          status: string
          venue_id: string | null
        }
        Insert: {
          created_by: string
          group_id?: string | null
          id?: string
          join_code?: string | null
          started_at?: string | null
          status?: string
          venue_id?: string | null
        }
        Update: {
          created_by?: string
          group_id?: string | null
          id?: string
          join_code?: string | null
          started_at?: string | null
          status?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "player_venue_stats"
            referencedColumns: ["venue_id"]
          },
          {
            foreignKeyName: "sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          id: string
          lat: number | null
          lng: number | null
          name: string
          place_id: string | null
        }
        Insert: {
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          place_id?: string | null
        }
        Update: {
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          place_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      player_stats: {
        Row: {
          average: number | null
          frame_scored_games: number | null
          games: number | null
          high_game: number | null
          opens: number | null
          profile_id: string | null
          spares: number | null
          strikes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_venue_stats: {
        Row: {
          average: number | null
          games: number | null
          profile_id: string | null
          venue_id: string | null
          venue_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_see_feed_event: { Args: { eid: string }; Returns: boolean }
      can_see_game: { Args: { gid: string }; Returns: boolean }
      can_see_game_player: { Args: { gpid: string }; Returns: boolean }
      can_see_match_day: { Args: { mdid: string }; Returns: boolean }
      claim_guest_games: { Args: { code: string }; Returns: Json }
      group_invite_preview: { Args: { code: string }; Returns: Json }
      group_leaderboard: {
        Args: { gid: string; p_period?: string }
        Returns: {
          profile_id: string
          display_name: string
          avatar_url: string | null
          games: number
          average: number
          high_game: number
          rank: number
          prev_rank: number | null
          rank_high: number
          prev_rank_high: number | null
        }[]
      }
      head_to_head: { Args: { other: string }; Returns: Json }
      is_app_admin: { Args: never; Returns: boolean }
      is_group_admin: { Args: { gid: string }; Returns: boolean }
      is_group_member: { Args: { gid: string }; Returns: boolean }
      is_session_viewer: { Args: { sid: string }; Returns: boolean }
      join_demo: { Args: never; Returns: string }
      join_group: { Args: { code: string }; Returns: string }
      join_live_session: { Args: { code: string }; Returns: string }
      live_session_preview: { Args: { code: string }; Returns: Json }
      scans_today: { Args: { p_profile?: string }; Returns: number }
      owns_game: { Args: { gid: string }; Returns: boolean }
      owns_game_player: { Args: { gpid: string }; Returns: boolean }
      owns_match_day: { Args: { mdid: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "tenpins">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  tenpins: {
    Enums: {},
  },
} as const
