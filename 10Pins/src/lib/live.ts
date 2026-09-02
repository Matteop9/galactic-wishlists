import { score, type FrameInput } from '../engine';
import { deserializeRolls, frameCounts, serializeRolls } from './frames';
import { computeHighlights } from './highlights';
import type { LivePlayer, PendingFrame } from './liveState';
import { supabase } from './supabase';

/**
 * Live session data layer (spec §8). One writer — the scorer’s device — owns
 * every write; spectators only ever read. Roll events go out over a Realtime
 * broadcast channel for latency; `frames` is the durable record everyone
 * refetches from on join or reconnect.
 */

export interface NewLivePlayer {
  profile_id: string | null;
  guest_name: string | null;
  display_name: string;
}

export interface LiveGameState {
  sessionId: string;
  joinCode: string | null;
  sessionStatus: string;
  groupId: string | null;
  groupName: string | null;
  venueName: string | null;
  hostId: string;
  hostName: string;
  gameId: string;
  gameNumber: number;
  gameStatus: string;
  players: LivePlayer[];
}

export const ROLL_EVENT = 'roll';
export const GAME_EVENT = 'game';

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

/** Insert the game + its player line-up. Shared by session start and next game. */
async function createLiveGame(opts: {
  profileId: string;
  sessionId: string;
  gameNumber: number;
  players: NewLivePlayer[];
}): Promise<{ gameId: string; players: LivePlayer[] }> {
  const { data: game, error: gameErr } = await supabase
    .from('games')
    .insert({
      session_id: opts.sessionId,
      game_number: opts.gameNumber,
      entry_type: 'live',
      verification_status: 'live',
      status: 'in_progress',
      played_at: new Date().toISOString(),
      created_by: opts.profileId,
    })
    .select('id')
    .single();
  if (gameErr) throw gameErr;

  const { data: rows, error: playersErr } = await supabase
    .from('game_players')
    .insert(
      opts.players.map((p, i) => ({
        game_id: game.id,
        profile_id: p.profile_id,
        guest_name: p.guest_name,
        seat_order: i,
      })),
    )
    .select('id, profile_id, guest_name, seat_order');
  if (playersErr) {
    await supabase.from('games').delete().eq('id', game.id);
    throw playersErr;
  }

  const bySeat = [...rows].sort((a, b) => a.seat_order - b.seat_order);
  return {
    gameId: game.id,
    players: bySeat.map((row, i) => ({
      gamePlayerId: row.id,
      profileId: row.profile_id,
      guestName: row.guest_name,
      displayName: opts.players[i]?.display_name ?? row.guest_name ?? 'Player',
      seatOrder: row.seat_order,
      frames: [],
    })),
  };
}

/** Open a session and its first game. Returns the session to score. */
export async function createLiveSession(opts: {
  profileId: string;
  groupId: string | null;
  venueName?: string | null;
  players: NewLivePlayer[];
}): Promise<{ sessionId: string; gameId: string }> {
  const venueId = await ensureVenue(opts.venueName);
  const { data: session, error: sessionErr } = await supabase
    .from('sessions')
    .insert({
      created_by: opts.profileId,
      group_id: opts.groupId,
      venue_id: venueId,
      status: 'active',
    })
    .select('id')
    .single();
  if (sessionErr) throw sessionErr;

  try {
    const { gameId } = await createLiveGame({
      profileId: opts.profileId,
      sessionId: session.id,
      gameNumber: 1,
      players: opts.players,
    });
    return { sessionId: session.id, gameId };
  } catch (err) {
    await supabase.from('sessions').delete().eq('id', session.id);
    throw err;
  }
}

const LIVE_SELECT = `
  id, join_code, group_id, status, created_by,
  profiles!sessions_created_by_fkey ( display_name ),
  groups ( name ),
  venues ( name ),
  games (
    id, game_number, status, entry_type,
    game_players (
      id, profile_id, guest_name, seat_order,
      profiles ( display_name ),
      frames ( frame_no, rolls )
    )
  )
`;

/**
 * Full state for a session: the live game if one is running, otherwise the
 * most recent game (so the end-of-game screen survives a refresh).
 */
export async function fetchLiveSession(sessionId: string): Promise<LiveGameState | null> {
  const { data, error } = await supabase.from('sessions').select(LIVE_SELECT).eq('id', sessionId).single();
  if (error) throw error;

  const games = [...(data.games ?? [])].sort((a, b) => b.game_number - a.game_number);
  const game = games.find((g) => g.status === 'in_progress') ?? games[0];
  if (!game) return null;

  const players: LivePlayer[] = [...(game.game_players ?? [])]
    .sort((a, b) => a.seat_order - b.seat_order)
    .map((gp) => ({
      gamePlayerId: gp.id,
      profileId: gp.profile_id,
      guestName: gp.guest_name,
      displayName: gp.profiles?.display_name ?? gp.guest_name ?? 'Player',
      seatOrder: gp.seat_order,
      frames: framesOf(gp.frames ?? []),
    }));

  return {
    sessionId: data.id,
    joinCode: data.join_code,
    sessionStatus: data.status,
    groupId: data.group_id,
    groupName: data.groups?.name ?? null,
    venueName: data.venues?.name ?? null,
    hostId: data.created_by,
    hostName: data.profiles?.display_name ?? 'Someone',
    gameId: game.id,
    gameNumber: game.game_number,
    gameStatus: game.status,
    players,
  };
}

/** frames rows → dense engine input, tolerating gaps (an unbowled frame 3). */
function framesOf(rows: { frame_no: number; rolls: unknown }[]): FrameInput[] {
  if (rows.length === 0) return [];
  const byNo = new Map(rows.map((r) => [r.frame_no, deserializeRolls(r.rolls)]));
  const highest = Math.max(...rows.map((r) => r.frame_no));
  return Array.from({ length: highest }, (_, i) => ({ rolls: byNo.get(i + 1) ?? [] }));
}

/** The durable write behind every keypad tap. Upsert — a frame is edited in place. */
export async function upsertFrame(entry: PendingFrame): Promise<void> {
  const { error } = await supabase.from('frames').upsert(
    {
      game_player_id: entry.gamePlayerId,
      frame_no: entry.frameNo,
      rolls: entry.rolls,
      cumulative: entry.cumulative,
    },
    { onConflict: 'game_player_id,frame_no' },
  );
  if (error) throw error;
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

/**
 * End of game: cache the final scores and counters, mark the game complete and
 * post it to the feed. Frames are already written roll by roll, so this only
 * re-derives what the query layer caches.
 */
export async function finishLiveGame(opts: {
  profileId: string;
  sessionId: string;
  groupId: string | null;
  gameId: string;
  players: LivePlayer[];
}): Promise<{ highlights: string[]; byProfile: Record<string, string[]> }> {
  const scored = opts.players.map((player) => ({ player, game: score(player.frames) }));
  const bests = await previousBests(
    opts.players.map((p) => p.profileId).filter((id): id is string => !!id),
  );

  for (const { player, game } of scored) {
    if (!game.complete || game.total === null) continue;
    const { error } = await supabase
      .from('game_players')
      .update({ final_score: game.total, ...frameCounts(game) })
      .eq('id', player.gamePlayerId);
    if (error) throw error;
  }

  // Rewrite every frame’s cumulative in one go: bonus balls settle earlier
  // frames, and the roll-by-roll upserts only ever knew the total so far.
  const frameRows = scored.flatMap(({ player, game }) =>
    game.frames.map((frame, i) => ({
      game_player_id: player.gamePlayerId,
      frame_no: i + 1,
      rolls: serializeRolls(frame.rolls),
      cumulative: frame.cumulative,
    })),
  );
  if (frameRows.length > 0) {
    const { error } = await supabase
      .from('frames')
      .upsert(frameRows, { onConflict: 'game_player_id,frame_no' });
    if (error) throw error;
  }

  const { error: gameErr } = await supabase
    .from('games')
    .update({ status: 'complete', played_at: new Date().toISOString() })
    .eq('id', opts.gameId);
  if (gameErr) throw gameErr;

  // The feed event carries the union across everyone who bowled (unchanged),
  // but keep the per-player split too: the celebration on the scorer’s phone
  // should be attributable, not "someone here got a PB".
  const highlights = new Set<string>();
  const byProfile: Record<string, string[]> = {};
  for (const { player, game } of scored) {
    if (!player.profileId || !game.complete || game.total === null) continue;
    const mine = computeHighlights({
      score: game.total,
      previousBest: bests[player.profileId] ?? null,
      game,
    });
    byProfile[player.profileId] = mine;
    for (const h of mine) highlights.add(h);
  }

  const { error: feedErr } = await supabase.from('feed_events').insert({
    type: 'game',
    game_id: opts.gameId,
    session_id: opts.sessionId,
    group_id: opts.groupId,
    highlights: [...highlights],
  });
  if (feedErr) throw feedErr;

  return { highlights: [...highlights], byProfile };
}

/** "Next game — same players": clone the line-up at game_number + 1. */
export async function startNextGame(opts: {
  profileId: string;
  sessionId: string;
  gameNumber: number;
  players: LivePlayer[];
}): Promise<string> {
  const { gameId } = await createLiveGame({
    profileId: opts.profileId,
    sessionId: opts.sessionId,
    gameNumber: opts.gameNumber + 1,
    players: opts.players.map((p) => ({
      profile_id: p.profileId,
      guest_name: p.guestName,
      display_name: p.displayName,
    })),
  });
  return gameId;
}

/** Kept for the session, excluded from averages (games.status <> 'complete'). */
export async function abandonLiveGame(gameId: string): Promise<void> {
  const { error } = await supabase.from('games').update({ status: 'abandoned' }).eq('id', gameId);
  if (error) throw error;
}

export async function endLiveSession(opts: {
  sessionId: string;
  groupId: string | null;
}): Promise<void> {
  const { error } = await supabase.from('sessions').update({ status: 'finished' }).eq('id', opts.sessionId);
  if (error) throw error;
  // A night of games gets one session event alongside its per-game ones.
  await supabase.from('feed_events').insert({
    type: 'session',
    session_id: opts.sessionId,
    group_id: opts.groupId,
    highlights: [],
  });
}

// --- Spectating --------------------------------------------------------------

export interface LivePreview {
  session_id: string;
  status: string;
  host: string;
  group_name: string | null;
  venue: string | null;
  players: string[];
}

export async function fetchLivePreview(code: string): Promise<LivePreview | null> {
  const { data, error } = await supabase.rpc('live_session_preview', { code });
  if (error) throw error;
  return (data as unknown as LivePreview) ?? null;
}

export async function joinLiveSession(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_live_session', { code });
  if (error) throw error;
  return data as string;
}

/** Everyone who has joined to watch — the waiting-room list on the scorer. */
export async function fetchViewers(sessionId: string) {
  const { data, error } = await supabase
    .from('session_viewers')
    .select('profile_id, joined_at, profiles ( display_name )')
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data;
}

/** Live right now and visible to me: drives the Home banner and resume prompt. */
export async function fetchLiveNow() {
  const { data, error } = await supabase
    .from('sessions')
    .select(
      `id, created_by, status, join_code,
       profiles!sessions_created_by_fkey ( display_name ),
       groups ( name ),
       venues ( name ),
       games!inner ( id, status, entry_type )`,
    )
    .eq('status', 'active')
    .eq('games.status', 'in_progress')
    .eq('games.entry_type', 'live')
    .order('started_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return data;
}

export function shareLink(joinCode: string): string {
  const origin = typeof window === 'undefined' ? 'https://10pins.vercel.app' : window.location.origin;
  return `${origin}/live/join/${joinCode}`;
}
