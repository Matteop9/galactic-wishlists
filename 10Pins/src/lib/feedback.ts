import { supabase } from './supabase';
import type { Tables } from './database.types';

export type FeedbackKind = 'bug' | 'idea' | 'other';
export type FeedbackStatus = 'new' | 'planned' | 'done' | 'dismissed';

export const FEEDBACK_KINDS: { value: FeedbackKind; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'idea', label: 'Idea' },
  { value: 'other', label: 'Other' },
];

export const FEEDBACK_STATUSES: { value: FeedbackStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'planned', label: 'Planned' },
  { value: 'done', label: 'Done' },
  { value: 'dismissed', label: 'Parked' },
];

/** Amber is earned (spec §12): only the live states get it. */
export const STATUS_STYLE: Record<FeedbackStatus, string> = {
  new: 'border-phosphor/40 text-phosphor',
  planned: 'border-mark/40 text-mark',
  done: 'border-success/40 text-success',
  dismissed: 'border-line text-faint',
};

export const MAX_FEEDBACK_LENGTH = 2000;

type FeedbackRow = Tables<'feedback'>;

/** RLS returns your own items; an app admin gets everyone’s. */
export async function fetchMyFeedback(profileId: string): Promise<FeedbackRow[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

const QUEUE_SELECT = '*, profiles!feedback_profile_id_fkey ( display_name, username )';

export async function fetchFeedbackQueue() {
  const { data, error } = await supabase
    .from('feedback')
    .select(QUEUE_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

export type QueueItem = Awaited<ReturnType<typeof fetchFeedbackQueue>>[number];

export async function submitFeedback(profileId: string, kind: FeedbackKind, message: string) {
  const { error } = await supabase
    .from('feedback')
    .insert({ profile_id: profileId, kind, message: message.trim() });
  if (error) throw error;
}

/** Triage: status and note are the only columns `authenticated` may update. */
export async function setFeedbackStatus(id: string, status: FeedbackStatus) {
  const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function setFeedbackNote(id: string, note: string) {
  const { error } = await supabase
    .from('feedback')
    .update({ admin_note: note.trim() || null })
    .eq('id', id);
  if (error) throw error;
}

/** Authors can withdraw an untriaged item; admins can bin anything. */
export async function deleteFeedback(id: string) {
  const { error } = await supabase.from('feedback').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchIsAppAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_app_admin');
  if (error) throw error;
  return data ?? false;
}

/** "2 Sept" — same shorthand the feed uses. */
export function feedbackDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
