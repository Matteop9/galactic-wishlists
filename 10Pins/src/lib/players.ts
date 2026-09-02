import { supabase } from './supabase';

export interface ProfileLite {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

/** A player's public profile, or null when RLS hides them (e.g. an anonymous
 * demo visitor looking at someone outside their shared group). */
export async function fetchProfileLite(id: string): Promise<ProfileLite | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface SharedGroup {
  group_id: string;
  groups: { id: string; name: string } | null;
}

/** Groups both the caller and `profileId` belong to (RLS: only groups the
 * caller is themselves a member of are visible, so this is inherently "shared"). */
export async function fetchSharedGroups(profileId: string): Promise<SharedGroup[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, groups ( id, name )')
    .eq('profile_id', profileId);
  if (error) throw error;
  return data;
}

export interface Meeting {
  game_id: string;
  played_at: string;
  verification_status: string;
  venue_name: string | null;
  my_score: number | null;
  their_score: number | null;
}

export interface HeadToHead {
  games: number;
  wins: number;
  losses: number;
  ties: number;
  my_avg: number | null;
  their_avg: number | null;
  meetings: Meeting[];
}

export async function fetchHeadToHead(other: string): Promise<HeadToHead> {
  const { data, error } = await supabase.rpc('head_to_head', { other });
  if (error) throw error;
  return data as unknown as HeadToHead;
}

// --- Pure helpers (tested) --------------------------------------------------

/** "7–3" (en dash), plus " · 1 tie" / " · N ties" when there are any. */
export function recordLine(h: Pick<HeadToHead, 'wins' | 'losses' | 'ties'>): string {
  const base = `${h.wins}–${h.losses}`;
  if (h.ties <= 0) return base;
  return `${base} · ${h.ties} ${h.ties === 1 ? 'tie' : 'ties'}`;
}

/** Result of one meeting from "my" point of view. */
export function meetingOutcome(my: number | null, their: number | null): 'won' | 'lost' | 'tied' {
  if (my === null || their === null) return 'tied';
  if (my > their) return 'won';
  if (my < their) return 'lost';
  return 'tied';
}

/**
 * A short, deterministic sentence describing recent form, e.g.
 * "You’ve won 3 of the last 4" or "You’ve won the last 3" or
 * "Dave has won the last 2". `meetings` must be ordered most-recent-first
 * (as `fetchHeadToHead` returns it) — only the leading portion is read.
 *
 * Branches:
 *  1. No meetings → ''.
 *  2. A leading streak of 2+ consecutive wins by the same side (from the
 *     most recent game backwards, stopping at the first loss/tie) →
 *     "{who} won the last {streak}". This is the headline case: an active
 *     run reads better than a diluted ratio.
 *  3. Otherwise (no streak, or a streak of 1) → a ratio over the last
 *     min(meetings.length, 5) games: "{who} won {n} of the last {window}".
 *     Whichever side has more wins in that window is named; a tied window
 *     has no side to name, so it falls back to ''.
 */
export function recentForm(meetings: Meeting[], firstName: string): string {
  if (meetings.length === 0) return '';

  const outcomes = meetings.map((m) => meetingOutcome(m.my_score, m.their_score));

  const leadOutcome = outcomes[0];
  let streak = 0;
  if (leadOutcome !== 'tied') {
    while (streak < outcomes.length && outcomes[streak] === leadOutcome) streak += 1;
  }

  if (streak >= 2) {
    const who = leadOutcome === 'won' ? 'You’ve' : `${firstName} has`;
    return `${who} won the last ${streak}`;
  }

  const window = outcomes.slice(0, Math.min(outcomes.length, 5));
  const myWins = window.filter((o) => o === 'won').length;
  const theirWins = window.filter((o) => o === 'lost').length;

  if (myWins > theirWins) return `You’ve won ${myWins} of the last ${window.length}`;
  if (theirWins > myWins) return `${firstName} has won ${theirWins} of the last ${window.length}`;
  return '';
}

/** Friendship row shape this helper needs — models `Friendship` in `friends.ts`. */
export interface FriendshipLike {
  requester: string;
  addressee: string;
  status: string;
}

export type FriendState = 'friend' | 'incoming' | 'outgoing' | 'none';

/** Where things stand between `myId` and `theirId`, from `myId`'s point of view. */
export function friendState(friendships: FriendshipLike[], myId: string, theirId: string): FriendState {
  const row = friendships.find(
    (f) => (f.requester === myId && f.addressee === theirId) || (f.requester === theirId && f.addressee === myId),
  );
  if (!row) return 'none';
  if (row.status === 'accepted') return 'friend';
  return row.requester === myId ? 'outgoing' : 'incoming';
}
