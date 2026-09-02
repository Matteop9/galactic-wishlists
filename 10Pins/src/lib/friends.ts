import { supabase } from './supabase';

export interface ProfileLite {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

const FRIENDSHIP_SELECT = `
  requester, addressee, status, created_at,
  requester_profile:profiles!friendships_requester_fkey ( id, username, display_name, avatar_url ),
  addressee_profile:profiles!friendships_addressee_fkey ( id, username, display_name, avatar_url )
`;

export async function fetchFriendships(profileId: string) {
  const { data, error } = await supabase
    .from('friendships')
    .select(FRIENDSHIP_SELECT)
    .or(`requester.eq.${profileId},addressee.eq.${profileId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export type Friendship = Awaited<ReturnType<typeof fetchFriendships>>[number];

/** The other person on a friendship row, from my point of view. */
export function otherProfile(f: Friendship, myId: string): ProfileLite | null {
  return (f.requester === myId ? f.addressee_profile : f.requester_profile) as ProfileLite | null;
}

export async function searchProfiles(query: string, excludeId: string): Promise<ProfileLite[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .neq('id', excludeId)
    .limit(10);
  if (error) throw error;
  return data;
}

export async function sendFriendRequest(requester: string, addressee: string) {
  const { error } = await supabase.from('friendships').insert({ requester, addressee });
  if (error) throw error;
}

export async function acceptFriendRequest(requester: string, addressee: string) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('requester', requester)
    .eq('addressee', addressee);
  if (error) throw error;
}

/** Decline a request or unfriend — both are just deleting the row. */
export async function removeFriendship(a: string, b: string) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(requester.eq.${a},addressee.eq.${b}),and(requester.eq.${b},addressee.eq.${a})`);
  if (error) throw error;
}

// --- Guest claims ----------------------------------------------------------

/** Distinct guest names with games inside this group, for creating claim links. */
export async function fetchGroupGuests(groupId: string): Promise<{ name: string; games: number }[]> {
  const { data, error } = await supabase
    .from('game_players')
    .select('guest_name, games!inner( sessions!inner( group_id ) )')
    .is('profile_id', null)
    .eq('games.sessions.group_id', groupId);
  if (error) throw error;
  const counts = new Map<string, { name: string; games: number }>();
  for (const row of data) {
    if (!row.guest_name) continue;
    const key = row.guest_name.toLowerCase();
    const entry = counts.get(key) ?? { name: row.guest_name, games: 0 };
    entry.games += 1;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.games - a.games);
}

export async function fetchGroupClaims(groupId: string) {
  const { data, error } = await supabase
    .from('guest_claims')
    .select('id, guest_name, claim_code, claimed_by, claimed_at')
    .eq('group_id', groupId);
  if (error) throw error;
  return data;
}

export async function createGuestClaim(groupId: string, guestName: string): Promise<string> {
  const { data, error } = await supabase
    .from('guest_claims')
    .insert({ group_id: groupId, guest_name: guestName })
    .select('claim_code')
    .single();
  if (error) throw error;
  return data.claim_code!;
}

export interface ClaimResult {
  group_id: string;
  group_name: string;
  guest_name: string;
  games: { game_id: string; played_at: string; venue_name: string | null; final_score: number | null }[];
}

export async function claimGuestGames(code: string): Promise<ClaimResult> {
  const { data, error } = await supabase.rpc('claim_guest_games', { code });
  if (error) throw error;
  return data as unknown as ClaimResult;
}
