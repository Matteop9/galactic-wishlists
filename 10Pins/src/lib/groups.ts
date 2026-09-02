import { supabase } from './supabase';
import type { Tables } from './database.types';
import type { LeaderboardPeriod } from './leaderboard';

export type Group = Tables<'groups'>;

export interface GroupMember {
  profile_id: string;
  role: 'admin' | 'member';
  joined_at: string | null;
  profiles: { display_name: string; username: string; avatar_url: string | null } | null;
}

export interface InvitePreview {
  group_id: string;
  name: string;
  season_name: string | null;
  member_count: number;
  avatars: (string | null)[];
  top3: { display_name: string; average: number; games: number }[];
}

export interface LeaderboardRow {
  profile_id: string;
  display_name: string;
  avatar_url: string | null;
  games: number;
  average: number;
  high_game: number;
  rank: number;
  prev_rank: number | null;
  rank_high: number;
  prev_rank_high: number | null;
}

const MEMBER_SELECT = `
  profile_id, role, joined_at,
  profiles ( display_name, username, avatar_url )
`;

export async function fetchMyGroups(profileId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`group_id, role, groups ( id, name, season_name, invite_code, created_by )`)
    .eq('profile_id', profileId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createGroup(profileId: string, name: string): Promise<string> {
  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name: name.trim(), created_by: profileId })
    .select('id')
    .single();
  if (error) throw error;
  const { error: memberErr } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, profile_id: profileId, role: 'admin' });
  if (memberErr) {
    await supabase.from('groups').delete().eq('id', group.id);
    throw memberErr;
  }
  return group.id;
}

export async function fetchGroup(id: string) {
  const { data, error } = await supabase
    .from('groups')
    .select(`*, group_members ( ${MEMBER_SELECT} )`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchLeaderboard(
  groupId: string,
  period: LeaderboardPeriod = 'season',
): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc('group_leaderboard', { gid: groupId, p_period: period });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

export async function fetchInvitePreview(code: string): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc('group_invite_preview', { code });
  if (error) throw error;
  return data as unknown as InvitePreview;
}

export async function joinGroup(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_group', { code });
  if (error) throw error;
  return data as string;
}

export interface GroupSettingsPatch {
  name?: string;
  season_name?: string | null;
  season_starts?: string | null;
  season_ends?: string | null;
  verified_only_leaderboard?: boolean;
  handicap_basis?: number;
  handicap_pct?: number;
}

export async function updateGroupSettings(id: string, patch: GroupSettingsPatch) {
  const { error } = await supabase.from('groups').update(patch).eq('id', id);
  if (error) throw error;
}

export async function removeMember(groupId: string, profileId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('profile_id', profileId);
  if (error) throw error;
}
