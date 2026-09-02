import { score, type FrameInput } from '../engine';
import { frameCounts, serializeRolls } from './frames';
import { computeHighlights } from './highlights';
import { supabase } from './supabase';

export interface GuestScore {
  name: string;
  score: number;
}

async function ensureVenue(name: string | null | undefined): Promise<string | null> {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const { data: existing, error: findErr } = await supabase
    .from('venues')
    .select('id')
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing.id;
  const { data, error } = await supabase.from('venues').insert({ name: trimmed }).select('id').single();
  if (error) throw error;
  return data.id;
}

async function previousBest(profileId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('player_stats')
    .select('high_game')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return data?.high_game ?? null;
}

export interface GameTarget {
  /** Attach the game's session to a group so it counts on that group's leaderboard/feed. */
  groupId?: string | null;
  /** Write into an existing session (match-day leg) instead of creating one. */
  sessionId?: string;
  gameNumber?: number;
}

async function createSessionAndGame(opts: {
  profileId: string;
  venueName?: string | null;
  playedAt: string;
  entryType: 'total' | 'manual';
  target?: GameTarget;
}): Promise<{ gameId: string; sessionId: string; createdSession: boolean }> {
  let sessionId = opts.target?.sessionId;
  const createdSession = !sessionId;
  if (!sessionId) {
    const venueId = await ensureVenue(opts.venueName);
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .insert({
        created_by: opts.profileId,
        venue_id: venueId,
        group_id: opts.target?.groupId ?? null,
        status: 'finished',
      })
      .select('id')
      .single();
    if (sessionErr) throw sessionErr;
    sessionId = session.id;
  }

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .insert({
      session_id: sessionId,
      game_number: opts.target?.gameNumber ?? 1,
      entry_type: opts.entryType,
      verification_status: 'unverified',
      status: 'complete',
      played_at: opts.playedAt,
      created_by: opts.profileId,
    })
    .select('id')
    .single();
  if (gameErr) {
    if (createdSession) await supabase.from('sessions').delete().eq('id', sessionId);
    throw gameErr;
  }
  return { gameId: game.id, sessionId, createdSession };
}

/** Best-effort rollback so a failed save doesn't leave an orphan game behind. */
async function rollback(gameId: string, sessionId: string, createdSession: boolean) {
  await supabase.from('games').delete().eq('id', gameId);
  if (createdSession) await supabase.from('sessions').delete().eq('id', sessionId);
}

/** Quick add: totals only, labelled unverified at the point of entry. */
export async function saveQuickGame(opts: {
  profileId: string;
  score: number;
  playedAt: string;
  venueName?: string | null;
  guests: GuestScore[];
  target?: GameTarget;
}): Promise<string> {
  const best = await previousBest(opts.profileId);
  const { gameId, sessionId, createdSession } = await createSessionAndGame({
    profileId: opts.profileId,
    venueName: opts.venueName,
    playedAt: opts.playedAt,
    entryType: 'total',
    target: opts.target,
  });
  try {
    const { error: playersErr } = await supabase.from('game_players').insert([
      { game_id: gameId, profile_id: opts.profileId, seat_order: 0, final_score: opts.score },
      ...opts.guests.map((guest, i) => ({
        game_id: gameId,
        guest_name: guest.name,
        seat_order: i + 1,
        final_score: guest.score,
      })),
    ]);
    if (playersErr) throw playersErr;

    const highlights = computeHighlights({ score: opts.score, previousBest: best });
    const { error: feedErr } = await supabase.from('feed_events').insert({
      type: 'game',
      game_id: gameId,
      session_id: sessionId,
      group_id: opts.target?.groupId ?? null,
      highlights,
    });
    if (feedErr) throw feedErr;
    return gameId;
  } catch (err) {
    await rollback(gameId, sessionId, createdSession);
    throw err;
  }
}

/** Manual frame entry: full game for the signed-in player, frames stored roll by roll. */
export async function saveManualGame(opts: {
  profileId: string;
  frames: FrameInput[];
  playedAt: string;
  venueName?: string | null;
  target?: GameTarget;
}): Promise<string> {
  const scored = score(opts.frames);
  if (!scored.complete || scored.total === null) {
    throw new Error('Cannot save an incomplete game');
  }
  const best = await previousBest(opts.profileId);
  const { gameId, sessionId, createdSession } = await createSessionAndGame({
    profileId: opts.profileId,
    venueName: opts.venueName,
    playedAt: opts.playedAt,
    entryType: 'manual',
    target: opts.target,
  });
  try {
    const counts = frameCounts(scored);
    const { data: player, error: playerErr } = await supabase
      .from('game_players')
      .insert({
        game_id: gameId,
        profile_id: opts.profileId,
        seat_order: 0,
        final_score: scored.total,
        ...counts,
      })
      .select('id')
      .single();
    if (playerErr) throw playerErr;

    const { error: framesErr } = await supabase.from('frames').insert(
      scored.frames.map((frame, i) => ({
        game_player_id: player.id,
        frame_no: i + 1,
        rolls: serializeRolls(frame.rolls),
        cumulative: frame.cumulative,
      })),
    );
    if (framesErr) throw framesErr;

    const highlights = computeHighlights({ score: scored.total, previousBest: best, game: scored });
    const { error: feedErr } = await supabase.from('feed_events').insert({
      type: 'game',
      game_id: gameId,
      session_id: sessionId,
      group_id: opts.target?.groupId ?? null,
      highlights,
    });
    if (feedErr) throw feedErr;
    return gameId;
  } catch (err) {
    await rollback(gameId, sessionId, createdSession);
    throw err;
  }
}

export const GAME_DETAIL_SELECT = `
  id, entry_type, verification_status, status, played_at, created_by, photo_path,
  sessions ( id, venues ( id, name ) ),
  game_players (
    id, profile_id, guest_name, seat_order, final_score, strikes, spares, opens,
    profiles ( display_name, username ),
    frames ( frame_no, rolls, cumulative )
  )
`;

export async function fetchGame(id: string) {
  const { data, error } = await supabase.from('games').select(GAME_DETAIL_SELECT).eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function fetchMyGames(profileId: string) {
  const { data, error } = await supabase
    .from('games')
    .select(
      `id, played_at, entry_type, verification_status,
       sessions ( venues ( name ) ),
       game_players ( profile_id, guest_name, seat_order, final_score,
         profiles ( display_name ) )`,
    )
    .eq('created_by', profileId)
    .eq('status', 'complete')
    .order('played_at', { ascending: false })
    .limit(25);
  if (error) throw error;
  return data;
}

export async function fetchStats(profileId: string) {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchRecentScores(profileId: string) {
  const { data, error } = await supabase
    .from('games')
    .select('played_at, game_players!inner ( final_score, profile_id )')
    .eq('game_players.profile_id', profileId)
    .eq('status', 'complete')
    .order('played_at', { ascending: false })
    .limit(12);
  if (error) throw error;
  return data
    .map((row) => ({
      playedAt: row.played_at,
      score: row.game_players[0]?.final_score ?? null,
    }))
    .filter((row): row is { playedAt: string; score: number } => row.score !== null)
    .reverse();
}

export async function fetchVenueStats(profileId: string) {
  const { data, error } = await supabase
    .from('player_venue_stats')
    .select('*')
    .eq('profile_id', profileId)
    .order('games', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchVenueNames(): Promise<string[]> {
  const { data, error } = await supabase.from('venues').select('name').order('name').limit(50);
  if (error) throw error;
  return data.map((v) => v.name);
}

export async function deleteGame(id: string) {
  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) throw error;
}
