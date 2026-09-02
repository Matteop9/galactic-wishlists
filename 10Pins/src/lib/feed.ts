import { supabase } from './supabase';

export const REACTION_EMOJI = ['🔥', '👏', '💀', '🎳'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

const FEED_SELECT = `
  id, type, created_at, highlights, group_id,
  groups ( name ),
  games (
    id, played_at, verification_status, entry_type, created_by,
    sessions ( venues ( name ) ),
    game_players ( profile_id, guest_name, seat_order, final_score,
      profiles ( display_name ) )
  ),
  reactions ( profile_id, emoji ),
  comments ( count )
`;

/** The feed: everything RLS lets this user see (own + group + friends' games). */
export async function fetchFeed() {
  const { data, error } = await supabase
    .from('feed_events')
    .select(FEED_SELECT)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data;
}

export type FeedEvent = Awaited<ReturnType<typeof fetchFeed>>[number];

export async function addReaction(feedEventId: string, profileId: string, emoji: ReactionEmoji) {
  const { error } = await supabase
    .from('reactions')
    .insert({ feed_event_id: feedEventId, profile_id: profileId, emoji });
  if (error) throw error;
}

export async function removeReaction(feedEventId: string, profileId: string, emoji: ReactionEmoji) {
  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('feed_event_id', feedEventId)
    .eq('profile_id', profileId)
    .eq('emoji', emoji);
  if (error) throw error;
}

export async function fetchComments(feedEventId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('id, body, created_at, profile_id, profiles ( display_name, username )')
    .eq('feed_event_id', feedEventId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addComment(feedEventId: string, profileId: string, body: string) {
  const { error } = await supabase
    .from('comments')
    .insert({ feed_event_id: feedEventId, profile_id: profileId, body: body.trim() });
  if (error) throw error;
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}

/** The feed event for a game, so the detail screen can host reactions + comments. */
export async function fetchGameFeedEvent(gameId: string) {
  const { data, error } = await supabase
    .from('feed_events')
    .select('id, reactions ( profile_id, emoji )')
    .eq('game_id', gameId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

const HIGHLIGHT_LABELS: Record<string, string> = {
  FIRST_GAME: 'First game',
  PB: 'New PB',
  TURKEY: 'Turkey',
  '100_CLUB': '100 club',
  '150_CLUB': '150 club',
  '200_CLUB': '200 club',
  '250_CLUB': '250 club',
  '300_CLUB': 'PERFECT GAME',
};

export function highlightLabel(code: string): string {
  return HIGHLIGHT_LABELS[code] ?? code;
}
