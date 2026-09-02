import { score, type FrameInput } from '../engine';
import { frameCounts, serializeRolls } from './frames';
import { computeHighlights } from './highlights';
import { supabase } from './supabase';

// --- Pure scoring ------------------------------------------------------------
// Everything about who's winning is derived from the raw games; nothing cached.

export type ScoringMode = 'total_pins' | 'points';

export interface MdTeam {
  id: string;
  name: string;
  team_order: number;
}

export interface MdPlayer {
  id: string;
  team_id: string;
  profile_id: string | null;
  guest_name: string | null;
  pairing_order: number;
  handicap: number;
  display_name: string;
}

/** One recorded leg: the game's number plus each participant's final score. */
export interface LegGame {
  gameNumber: number;
  gameId: string;
  players: { profile_id: string | null; guest_name: string | null; final_score: number | null }[];
}

export interface PlayerLegScore {
  player: MdPlayer;
  scratch: number | null;
  /** scratch + handicap; null while the score is missing */
  total: number | null;
}

export interface TeamLegScore {
  team: MdTeam;
  players: PlayerLegScore[];
  scratchTotal: number;
  handicapTotal: number;
  /** points mode only: points earned this leg across all pair-matches */
  points: number;
}

export interface PairingResult {
  teamA: string;
  teamB: string;
  pairingOrder: number;
  a: PlayerLegScore | null;
  b: PlayerLegScore | null;
  /** 1 = A wins, 0.5 = split, 0 = B wins; null = unpaired/missing */
  pointsToA: number | null;
}

export interface LegResult {
  gameNumber: number;
  gameId: string;
  teams: TeamLegScore[];
  /** every match-day player has a score */
  complete: boolean;
  /** sole winner's team id; null for an incomplete or drawn leg */
  winnerTeamId: string | null;
  /** points mode: the pair-match breakdown for the UI */
  pairings: PairingResult[];
}

function scoreFor(leg: LegGame, p: MdPlayer): number | null {
  const row = leg.players.find((gp) =>
    p.profile_id
      ? gp.profile_id === p.profile_id
      : gp.guest_name != null &&
        p.guest_name != null &&
        gp.guest_name.toLowerCase() === p.guest_name.toLowerCase(),
  );
  return row?.final_score ?? null;
}

export function legScores(
  mode: ScoringMode,
  teams: MdTeam[],
  players: MdPlayer[],
  leg: LegGame,
): LegResult {
  const orderedTeams = [...teams].sort((a, b) => a.team_order - b.team_order);
  const teamScores: TeamLegScore[] = orderedTeams.map((team) => {
    const teamPlayers = players
      .filter((p) => p.team_id === team.id)
      .sort((a, b) => a.pairing_order - b.pairing_order)
      .map((player) => {
        const scratch = scoreFor(leg, player);
        return { player, scratch, total: scratch === null ? null : scratch + player.handicap };
      });
    return {
      team,
      players: teamPlayers,
      scratchTotal: teamPlayers.reduce((sum, p) => sum + (p.scratch ?? 0), 0),
      handicapTotal: teamPlayers.reduce((sum, p) => sum + (p.total ?? 0), 0),
      points: 0,
    };
  });

  const complete = teamScores.every((t) => t.players.every((p) => p.total !== null));
  const pairings: PairingResult[] = [];

  if (mode === 'points') {
    // Round-robin: every unordered team pair is a mini-match — one point per
    // pairing (by pairing order) plus one for the pair's team-total comparison.
    for (let i = 0; i < teamScores.length; i++) {
      for (let j = i + 1; j < teamScores.length; j++) {
        const A = teamScores[i];
        const B = teamScores[j];
        const rounds = Math.min(A.players.length, B.players.length);
        for (let k = 0; k < rounds; k++) {
          const a = A.players[k];
          const b = B.players[k];
          let pointsToA: number | null = null;
          if (a.total !== null && b.total !== null) {
            pointsToA = a.total > b.total ? 1 : a.total < b.total ? 0 : 0.5;
            A.points += pointsToA;
            B.points += 1 - pointsToA;
          }
          pairings.push({
            teamA: A.team.id,
            teamB: B.team.id,
            pairingOrder: k,
            a,
            b,
            pointsToA,
          });
        }
        if (complete) {
          const totalToA =
            A.handicapTotal > B.handicapTotal ? 1 : A.handicapTotal < B.handicapTotal ? 0 : 0.5;
          A.points += totalToA;
          B.points += 1 - totalToA;
        }
      }
    }
  }

  let winnerTeamId: string | null = null;
  if (complete && teamScores.length >= 2) {
    const metric = (t: TeamLegScore) => (mode === 'points' ? t.points : t.handicapTotal);
    const best = Math.max(...teamScores.map(metric));
    const leaders = teamScores.filter((t) => metric(t) === best);
    winnerTeamId = leaders.length === 1 ? leaders[0].team.id : null; // drawn leg counts for nobody
  }

  return { gameNumber: leg.gameNumber, gameId: leg.gameId, teams: teamScores, complete, winnerTeamId, pairings };
}

export interface SeriesState {
  bestOf: number;
  legsCompleted: number;
  legsWon: Record<string, number>;
  /** clinched mathematically, or every leg played */
  decided: boolean;
  /** sole series winner; null while undecided or when the series is shared */
  winnerTeamId: string | null;
  /** every leg played and no sole winner */
  drawn: boolean;
}

export function seriesState(bestOf: number, teams: MdTeam[], legs: LegResult[]): SeriesState {
  const completed = legs.filter((l) => l.complete);
  const legsWon: Record<string, number> = Object.fromEntries(teams.map((t) => [t.id, 0]));
  for (const leg of completed) {
    if (leg.winnerTeamId) legsWon[leg.winnerTeamId] = (legsWon[leg.winnerTeamId] ?? 0) + 1;
  }
  const remaining = Math.max(0, bestOf - completed.length);
  const entries = Object.entries(legsWon).sort((a, b) => b[1] - a[1]);
  const [leaderId, leaderWins] = entries[0] ?? [null, 0];
  const secondWins = entries[1]?.[1] ?? 0;

  // Clinched when nobody can catch the leader even if they take every
  // remaining leg (drawn legs only ever help the leader here).
  const clinched = entries.length >= 2 && leaderWins > secondWins + remaining;
  const allPlayed = remaining === 0;
  const soleLeader = entries.length >= 2 && leaderWins > secondWins;

  return {
    bestOf,
    legsCompleted: completed.length,
    legsWon,
    decided: clinched || allPlayed,
    winnerTeamId: clinched || (allPlayed && soleLeader) ? leaderId : null,
    drawn: allPlayed && !soleLeader,
  };
}

// --- Data layer --------------------------------------------------------------

export interface NewMatchDayPlayer {
  profile_id: string | null;
  guest_name: string | null;
  handicap: number;
}

export async function createMatchDay(opts: {
  profileId: string;
  groupId: string;
  venueName?: string | null;
  bestOf: 1 | 3 | 5;
  scoringMode: ScoringMode;
  handicapBasis: number;
  handicapPct: number;
  teams: { name: string; players: NewMatchDayPlayer[] }[];
}): Promise<string> {
  let venueId: string | null = null;
  const trimmedVenue = opts.venueName?.trim();
  if (trimmedVenue) {
    const { data: existing } = await supabase
      .from('venues')
      .select('id')
      .ilike('name', trimmedVenue)
      .limit(1)
      .maybeSingle();
    if (existing) venueId = existing.id;
    else {
      const { data: venue, error } = await supabase
        .from('venues')
        .insert({ name: trimmedVenue })
        .select('id')
        .single();
      if (error) throw error;
      venueId = venue.id;
    }
  }

  const { data: session, error: sessionErr } = await supabase
    .from('sessions')
    .insert({ created_by: opts.profileId, group_id: opts.groupId, venue_id: venueId, status: 'active' })
    .select('id')
    .single();
  if (sessionErr) throw sessionErr;

  const { data: matchDay, error: mdErr } = await supabase
    .from('match_days')
    .insert({
      session_id: session.id,
      group_id: opts.groupId,
      created_by: opts.profileId,
      best_of: opts.bestOf,
      scoring_mode: opts.scoringMode,
      handicap_basis: opts.handicapBasis,
      handicap_pct: opts.handicapPct,
    })
    .select('id')
    .single();
  if (mdErr) {
    await supabase.from('sessions').delete().eq('id', session.id);
    throw mdErr;
  }

  try {
    const { data: teamRows, error: teamsErr } = await supabase
      .from('match_day_teams')
      .insert(opts.teams.map((t, i) => ({ match_day_id: matchDay.id, name: t.name.trim(), team_order: i })))
      .select('id');
    if (teamsErr) throw teamsErr;

    const playerRows = opts.teams.flatMap((t, i) =>
      t.players.map((p, j) => ({
        match_day_id: matchDay.id,
        team_id: teamRows[i].id,
        profile_id: p.profile_id,
        guest_name: p.guest_name,
        pairing_order: j,
        handicap: p.handicap,
      })),
    );
    const { error: playersErr } = await supabase.from('match_day_players').insert(playerRows);
    if (playersErr) throw playersErr;

    return matchDay.id;
  } catch (err) {
    await supabase.from('match_days').delete().eq('id', matchDay.id);
    await supabase.from('sessions').delete().eq('id', session.id);
    throw err;
  }
}

export async function fetchMatchDay(id: string) {
  const { data, error } = await supabase
    .from('match_days')
    .select(
      `id, session_id, group_id, created_by, best_of, scoring_mode, handicap_basis, handicap_pct, status, created_at,
       groups ( name ),
       sessions ( id, venues ( name ) ),
       match_day_teams ( id, name, team_order ),
       match_day_players ( id, team_id, profile_id, guest_name, pairing_order, handicap,
         profiles ( display_name ) )`,
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/** The legs: session games with per-player final scores, ordered by leg. */
export async function fetchMatchDayGames(sessionId: string): Promise<LegGame[]> {
  const { data, error } = await supabase
    .from('games')
    .select('id, game_number, game_players ( profile_id, guest_name, final_score )')
    .eq('session_id', sessionId)
    .eq('status', 'complete')
    .order('game_number', { ascending: true });
  if (error) throw error;
  return data.map((g) => ({ gameNumber: g.game_number, gameId: g.id, players: g.game_players }));
}

export async function fetchGroupMatchDays(groupId: string) {
  const { data, error } = await supabase
    .from('match_days')
    .select('id, best_of, scoring_mode, status, created_at, match_day_teams ( name )')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data;
}

export async function setMatchDayStatus(id: string, status: 'active' | 'finished' | 'abandoned') {
  const { error } = await supabase.from('match_days').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updatePlayerHandicap(playerId: string, handicap: number) {
  const { error } = await supabase.from('match_day_players').update({ handicap }).eq('id', playerId);
  if (error) throw error;
}

/** Averages for handicap defaults at setup time. */
export async function fetchAverages(profileIds: string[]): Promise<Record<string, number>> {
  if (profileIds.length === 0) return {};
  const { data, error } = await supabase
    .from('player_stats')
    .select('profile_id, average')
    .in('profile_id', profileIds);
  if (error) throw error;
  return Object.fromEntries(
    (data ?? [])
      .filter((r) => r.profile_id && r.average != null)
      .map((r) => [r.profile_id as string, Number(r.average)]),
  );
}

async function previousBests(profileIds: string[]): Promise<Record<string, number>> {
  if (profileIds.length === 0) return {};
  const { data, error } = await supabase
    .from('player_stats')
    .select('profile_id, high_game')
    .in('profile_id', profileIds);
  if (error) throw error;
  return Object.fromEntries(
    (data ?? [])
      .filter((r) => r.profile_id && r.high_game != null)
      .map((r) => [r.profile_id as string, r.high_game as number]),
  );
}

interface LegEntryPlayer {
  mdPlayer: MdPlayer;
  /** full game when frame-scored; omitted for totals-only entry */
  frames?: FrameInput[];
  total: number;
}

/**
 * Save one leg: a single game holding every match-day player's line — frames
 * when frame-scored, totals otherwise. Seat order encodes team + pairing.
 */
export async function saveLeg(opts: {
  profileId: string;
  matchDayId: string;
  sessionId: string;
  groupId: string;
  gameNumber: number;
  entryType: 'manual' | 'total';
  players: LegEntryPlayer[];
  teams: MdTeam[];
}): Promise<string> {
  const profileIds = opts.players.map((p) => p.mdPlayer.profile_id).filter((x): x is string => !!x);
  const bests = await previousBests(profileIds);

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .insert({
      session_id: opts.sessionId,
      game_number: opts.gameNumber,
      entry_type: opts.entryType,
      verification_status: 'unverified',
      status: 'complete',
      played_at: new Date().toISOString(),
      created_by: opts.profileId,
    })
    .select('id')
    .single();
  if (gameErr) throw gameErr;

  try {
    const teamOrder = new Map(opts.teams.map((t) => [t.id, t.team_order]));
    const rows = opts.players.map((p) => {
      const scored = p.frames ? score(p.frames) : null;
      return {
        game_id: game.id,
        profile_id: p.mdPlayer.profile_id,
        guest_name: p.mdPlayer.guest_name,
        seat_order: (teamOrder.get(p.mdPlayer.team_id) ?? 0) * 10 + p.mdPlayer.pairing_order,
        final_score: p.total,
        ...(scored ? frameCounts(scored) : {}),
      };
    });
    const { data: inserted, error: playersErr } = await supabase
      .from('game_players')
      .insert(rows)
      .select('id, profile_id, guest_name');
    if (playersErr) throw playersErr;

    const frameRows = opts.players.flatMap((p) => {
      if (!p.frames) return [];
      const row = inserted.find((r) =>
        p.mdPlayer.profile_id
          ? r.profile_id === p.mdPlayer.profile_id
          : r.guest_name === p.mdPlayer.guest_name,
      );
      if (!row) return [];
      const scored = score(p.frames);
      return scored.frames.map((frame, i) => ({
        game_player_id: row.id,
        frame_no: i + 1,
        rolls: serializeRolls(frame.rolls),
        cumulative: frame.cumulative,
      }));
    });
    if (frameRows.length > 0) {
      const { error: framesErr } = await supabase.from('frames').insert(frameRows);
      if (framesErr) throw framesErr;
    }

    // Highlights: union across profile players (PB / clubs / turkey each)
    const highlights = new Set<string>();
    for (const p of opts.players) {
      if (!p.mdPlayer.profile_id) continue;
      const scored = p.frames ? score(p.frames) : undefined;
      for (const h of computeHighlights({
        score: p.total,
        previousBest: bests[p.mdPlayer.profile_id] ?? null,
        game: scored,
      })) {
        highlights.add(h);
      }
    }

    const { error: feedErr } = await supabase.from('feed_events').insert({
      type: 'game',
      game_id: game.id,
      session_id: opts.sessionId,
      group_id: opts.groupId,
      highlights: [...highlights],
    });
    if (feedErr) throw feedErr;

    return game.id;
  } catch (err) {
    await supabase.from('games').delete().eq('id', game.id);
    throw err;
  }
}
