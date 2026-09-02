import { EngineError, normalizeFrames, reconciles, score, type FrameInput, type Roll } from '../engine';
import { frameCounts, serializeRolls } from './frames';
import { computeHighlights } from './highlights';
import { supabase } from './supabase';
import type { GameTarget } from './games';

/**
 * Photo capture (spec §6): compress → upload → extract → reconcile → review.
 *
 * The `extract-scorecard` Edge Function only reads the photo into JSON. Every
 * judgement about that JSON — which frames fail to add up, whether the game
 * can be called verified — happens here, through the same engine that scores
 * live and manual games. One engine, one verdict.
 */

/** What the function returns, per player row on the monitor. */
export interface ScanFrame {
  frame: number;
  rolls: string[];
  cumulative: number | null;
}

export interface ScanPlayerRow {
  displayed_name: string;
  frames: ScanFrame[];
  final_score: number | null;
}

export interface ScanResult {
  players: ScanPlayerRow[];
  partial: boolean;
  confidence_notes: string | null;
  model: string;
  scans_used: number;
  daily_cap: number;
}

export type ScanErrorCode =
  | 'unreadable'
  | 'daily_cap'
  | 'model_failed'
  | 'model_unreachable'
  | 'photo_missing'
  | 'not_configured'
  | 'scanning_paused'
  | 'offline'
  | 'unknown';

export class ScanError extends Error {
  readonly code: ScanErrorCode;

  constructor(code: ScanErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ScanError';
    this.code = code;
  }
}

/** One player as the review screen works with them. */
export interface ReviewPlayer {
  /** exactly what the monitor said, e.g. "MATT" */
  displayedName: string;
  /** engine input, one entry per frame read (index 0 = frame 1) */
  frames: FrameInput[];
  /** the totals printed on the monitor; null where a box was blank/unreadable */
  claimed: (number | null)[];
  /** the printed final score, if the monitor showed one */
  finalScore: number | null;
  /** 0-based frames whose rolls don’t recompute to the printed total */
  badFrames: number[];
}

const ROLL_TOKENS: Record<string, Roll> = { X: 'X', '/': '/', F: 'F' };

/** DB/monitor roll token → engine Roll. Unknown tokens become a miss. */
export function parseRoll(token: string): Roll {
  const t = token.trim().toUpperCase();
  if (t in ROLL_TOKENS) return ROLL_TOKENS[t];
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 && n <= 10 ? n : 0;
}

/**
 * The model can read a frame that cannot exist — "8" then "5" is 13 pins. The
 * engine rejects those, and every scorecard render calls `score()`, so an
 * impossible frame would take the review screen down with it. Clear the
 * offending frame instead: it loses its rolls, fails to reconcile, and turns
 * up amber for the one thing that can settle it — a human looking at the photo.
 */
export function sanitiseFrames(frames: FrameInput[]): FrameInput[] {
  let working = frames.map((frame) => ({ rolls: [...frame.rolls] }));
  for (let attempt = 0; attempt <= working.length; attempt++) {
    try {
      return normalizeFrames(working);
    } catch (err) {
      const index = err instanceof EngineError ? err.frameIndex : -1;
      if (index < 0 || index >= working.length || working[index].rolls.length === 0) return [];
      working = working.map((frame, i) => (i === index ? { rolls: [] } : frame));
    }
  }
  return working;
}

/**
 * Extraction → review rows. Frames the model didn’t mention become empty
 * frames rather than disappearing, so frame 7 stays frame 7 on the card even
 * when frame 6 was unreadable.
 */
export function toReviewPlayers(result: { players: ScanPlayerRow[] }): ReviewPlayer[] {
  return result.players.map((row) => {
    const highest = row.frames.reduce((max, f) => Math.max(max, f.frame), 0);
    const byFrame = new Map(row.frames.map((f) => [f.frame, f]));
    const raw: FrameInput[] = [];
    const claimed: (number | null)[] = [];
    for (let i = 1; i <= highest; i++) {
      const f = byFrame.get(i);
      raw.push({ rolls: (f?.rolls ?? []).map(parseRoll) });
      claimed.push(f?.cumulative ?? null);
    }
    const frames = sanitiseFrames(raw);
    return {
      displayedName: row.displayed_name,
      frames,
      claimed,
      finalScore: row.final_score,
      badFrames: badFramesFor(frames, claimed),
    };
  });
}

/** The amber set: frames whose rolls don’t produce the printed running total. */
export function badFramesFor(frames: FrameInput[], claimed: (number | null)[]): number[] {
  return reconciles(frames, claimed).badFrames;
}

/** A clean scan collapses the review screen to one tap (design §5.3c). */
export function isCleanScan(players: ReviewPlayer[]): boolean {
  return players.every((p) => p.badFrames.length === 0);
}

/**
 * Verification derivation (spec §7): a photo whose rolls recompute exactly to
 * the totals printed on the monitor is `verified`. Anything still amber — or a
 * game where nothing could be checked, because every printed total was
 * unreadable — is `unverified`.
 */
export function verificationFor(players: ReviewPlayer[]): 'verified' | 'unverified' {
  if (players.length === 0) return 'unverified';
  const anythingChecked = players.some((p) => p.claimed.some((c) => c !== null));
  if (!anythingChecked) return 'unverified';
  return isCleanScan(players) ? 'verified' : 'unverified';
}

/** True when every player’s game is a full ten frames the engine can total. */
export function isCompleteScan(players: ReviewPlayer[]): boolean {
  return players.every((p) => {
    try {
      return score(p.frames).complete;
    } catch {
      return false;
    }
  });
}

/** Someone the extracted name could be. */
export interface MatchCandidate {
  profileId: string;
  displayName: string;
}

export type Identity =
  | { kind: 'profile'; profileId: string; displayName: string }
  | { kind: 'guest'; guestName: string };

function firstToken(name: string): string {
  return name.trim().split(/\s+/)[0]?.toUpperCase() ?? '';
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Guess who "MATT" is (spec §6.5). A remembered mapping for this group always
 * wins; after that it’s exact name, first name, then initials. No fuzzy
 * distance — a wrong confident guess costs more than an unmatched chip, and
 * correcting one is a single tap that gets remembered.
 */
export function matchDisplayedName(
  displayed: string,
  candidates: MatchCandidate[],
  remembered: Map<string, Identity> = new Map(),
): Identity {
  const key = displayed.trim().toUpperCase();
  const memory = remembered.get(key);
  if (memory) return memory;

  const exact = candidates.find((c) => c.displayName.trim().toUpperCase() === key);
  if (exact) return { kind: 'profile', profileId: exact.profileId, displayName: exact.displayName };

  const byFirstName = candidates.filter((c) => firstToken(c.displayName) === key);
  if (byFirstName.length === 1) {
    return { kind: 'profile', profileId: byFirstName[0].profileId, displayName: byFirstName[0].displayName };
  }

  const byInitials = candidates.filter((c) => initials(c.displayName) === key);
  if (byInitials.length === 1) {
    return { kind: 'profile', profileId: byInitials[0].profileId, displayName: byInitials[0].displayName };
  }

  return { kind: 'guest', guestName: displayed.trim() || 'Guest' };
}

/** Cap the longest edge and re-encode as JPEG — a 12MP monitor photo is 4MB of nothing. */
export async function compressPhoto(file: Blob, maxEdge = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85),
  );
  return blob ?? file;
}

/** Upload into the caller’s own folder — the storage policy requires it. */
export async function uploadScan(profileId: string, blob: Blob): Promise<string> {
  const path = `${profileId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from('scorecards')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg' });
  if (error) throw error;
  return path;
}

export async function signedPhotoUrl(path: string, seconds = 900): Promise<string | null> {
  const { data } = await supabase.storage.from('scorecards').createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export async function deleteScanPhoto(path: string): Promise<void> {
  await supabase.storage.from('scorecards').remove([path]);
}

/** Invoke the reader. Errors come back typed so the UI can say something useful. */
export async function runExtraction(photoPath: string, playerCount?: number): Promise<ScanResult> {
  const { data, error } = await supabase.functions.invoke<ScanResult>('extract-scorecard', {
    body: { photoPath, playerCount },
  });
  if (error) {
    let code: ScanErrorCode = 'unknown';
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const body = await context.json();
        if (typeof body?.error === 'string') code = body.error as ScanErrorCode;
      } catch {
        /* keep 'unknown' */
      }
    }
    throw new ScanError(code, error.message);
  }
  if (!data) throw new ScanError('unknown');
  return data;
}

/** What the review screen hands back on confirm. */
export interface ConfirmedPlayer {
  identity: Identity;
  frames: FrameInput[];
}

/**
 * Write a scanned game. Mirrors `saveManualGame` but stamps the photo path,
 * the raw extraction (so verification can be re-derived later) and the
 * verification status derived above. A game where somebody’s card is still
 * mid-game is kept `in_progress`, which is what keeps a half-read scan out of
 * everyone’s averages.
 */
export async function saveScannedGame(opts: {
  profileId: string;
  photoPath: string;
  extraction: unknown;
  verification: 'verified' | 'unverified';
  complete: boolean;
  players: ConfirmedPlayer[];
  playedAt: string;
  venueName?: string | null;
  target?: GameTarget;
}): Promise<{ gameId: string; highlights: string[] }> {
  const venueId = await ensureVenueId(opts.venueName);
  const { data: session, error: sessionErr } = await supabase
    .from('sessions')
    .insert({
      created_by: opts.profileId,
      venue_id: venueId,
      group_id: opts.target?.groupId ?? null,
      status: opts.complete ? 'finished' : 'active',
    })
    .select('id')
    .single();
  if (sessionErr) throw sessionErr;

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .insert({
      session_id: session.id,
      game_number: opts.target?.gameNumber ?? 1,
      entry_type: 'photo',
      verification_status: opts.verification,
      status: opts.complete ? 'complete' : 'in_progress',
      photo_path: opts.photoPath,
      extraction: opts.extraction as never,
      played_at: opts.playedAt,
      created_by: opts.profileId,
    })
    .select('id')
    .single();
  if (gameErr) {
    await supabase.from('sessions').delete().eq('id', session.id);
    throw gameErr;
  }

  try {
    const ownRow = opts.players.find(
      (p) => p.identity.kind === 'profile' && p.identity.profileId === opts.profileId,
    );
    const best = ownRow ? await previousBestFor(opts.profileId) : null;

    for (let seat = 0; seat < opts.players.length; seat++) {
      const player = opts.players[seat];
      const scored = score(player.frames);
      const { data: row, error: rowErr } = await supabase
        .from('game_players')
        .insert({
          game_id: game.id,
          profile_id: player.identity.kind === 'profile' ? player.identity.profileId : null,
          guest_name: player.identity.kind === 'guest' ? player.identity.guestName : null,
          seat_order: seat,
          final_score: scored.complete ? scored.total : null,
          ...(scored.complete ? frameCounts(scored) : {}),
        })
        .select('id')
        .single();
      if (rowErr) throw rowErr;

      if (player.frames.length > 0) {
        const { error: framesErr } = await supabase.from('frames').insert(
          scored.frames.map((frame, i) => ({
            game_player_id: row.id,
            frame_no: i + 1,
            rolls: serializeRolls(frame.rolls),
            cumulative: frame.cumulative,
          })),
        );
        if (framesErr) throw framesErr;
      }
    }

    const ownScored = ownRow ? score(ownRow.frames) : null;
    const highlights =
      ownScored?.complete && ownScored.total !== null
        ? computeHighlights({ score: ownScored.total, previousBest: best, game: ownScored })
        : [];

    const { error: feedErr } = await supabase.from('feed_events').insert({
      type: 'game',
      game_id: game.id,
      session_id: session.id,
      group_id: opts.target?.groupId ?? null,
      highlights,
    });
    if (feedErr) throw feedErr;

    // Handed back so the success screen can celebrate what it just wrote —
    // these are already scoped to the signed-in player’s row.
    return { gameId: game.id, highlights };
  } catch (err) {
    await supabase.from('games').delete().eq('id', game.id);
    await supabase.from('sessions').delete().eq('id', session.id);
    throw err;
  }
}

/** Remember a correction so the next scan for this group is one tap (spec §6.5). */
export async function rememberNameMapping(groupId: string, displayedName: string, identity: Identity) {
  const { error } = await supabase.from('name_mappings').upsert(
    {
      group_id: groupId,
      displayed_name: displayedName.trim().toUpperCase(),
      profile_id: identity.kind === 'profile' ? identity.profileId : null,
      guest_name: identity.kind === 'guest' ? identity.guestName : null,
    },
    { onConflict: 'group_id,displayed_name' },
  );
  if (error) throw error;
}

export async function fetchNameMappings(groupId: string): Promise<Map<string, Identity>> {
  const { data, error } = await supabase
    .from('name_mappings')
    .select('displayed_name, profile_id, guest_name, profiles(display_name)')
    .eq('group_id', groupId);
  if (error) throw error;
  const out = new Map<string, Identity>();
  for (const row of data ?? []) {
    if (row.profile_id) {
      out.set(row.displayed_name.toUpperCase(), {
        kind: 'profile',
        profileId: row.profile_id,
        displayName: row.profiles?.display_name ?? 'Player',
      });
    } else if (row.guest_name) {
      out.set(row.displayed_name.toUpperCase(), { kind: 'guest', guestName: row.guest_name });
    }
  }
  return out;
}

export async function scansToday(): Promise<number> {
  const { data, error } = await supabase.rpc('scans_today', {});
  if (error) throw error;
  return data ?? 0;
}

// -- local copies of two helpers games.ts keeps private ----------------------

async function ensureVenueId(name: string | null | undefined): Promise<string | null> {
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

async function previousBestFor(profileId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('player_stats')
    .select('high_game')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return data?.high_game ?? null;
}
