import { supabase } from './supabase';

const NOTIFICATION_SELECT = `
  id, type, read_at, created_at, feed_event_id, match_day_id, session_id,
  actor:profiles!notifications_actor_id_fkey ( display_name ),
  feed_events ( game_id )
`;

export async function fetchNotifications(profileId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export type Notification = Awaited<ReturnType<typeof fetchNotifications>>[number];

export async function fetchUnreadCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllRead(profileId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('profile_id', profileId)
    .is('read_at', null);
  if (error) throw error;
}

/** Copy lives here (British English), rendered from type + actor. */
export function notificationText(n: Notification): string {
  const who = n.actor?.display_name ?? 'Someone';
  switch (n.type) {
    case 'comment':
      return `${who} commented on a game you were in`;
    case 'reaction':
      return `${who} reacted to a game you were in`;
    case 'friend_request':
      return `${who} sent you a friend request`;
    case 'friend_accepted':
      return `${who} accepted your friend request`;
    case 'match_day_added':
      return `${who} added you to a match day`;
    case 'match_day_result':
      return `${who} finished your match day — see how it ended`;
    case 'live_started':
      return `${who} is bowling live — watch it`;
    default:
      return `${who} did something`;
  }
}

/** Where tapping the notification should take you. */
export function notificationLink(n: Notification): string {
  if (n.session_id) return `/live/${n.session_id}/watch`;
  if (n.match_day_id) return `/matchday/${n.match_day_id}`;
  if (n.feed_events?.game_id) return `/games/${n.feed_events.game_id}`;
  if (n.type === 'friend_request' || n.type === 'friend_accepted') return '/friends';
  return '/';
}
