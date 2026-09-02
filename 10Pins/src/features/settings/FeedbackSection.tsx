import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteFeedback,
  feedbackDate,
  fetchFeedbackQueue,
  fetchIsAppAdmin,
  fetchMyFeedback,
  FEEDBACK_KINDS,
  FEEDBACK_STATUSES,
  MAX_FEEDBACK_LENGTH,
  setFeedbackNote,
  setFeedbackStatus,
  STATUS_STYLE,
  submitFeedback,
  type FeedbackKind,
  type FeedbackStatus,
  type QueueItem,
} from '../../lib/feedback';
import { ListSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

/**
 * Feedback on your own profile (The Acca / Milky Bay pattern): anyone sends a
 * bug or an idea and then watches its status move; an app admin triages the
 * whole queue in the same place, so a request and what happened to it live
 * together instead of in a chat thread.
 */
export default function FeedbackSection({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<FeedbackKind>('idea');
  const [message, setMessage] = useState('');
  const [queueOpen, setQueueOpen] = useState(false);

  const isAdmin = useQuery({
    queryKey: ['is-app-admin', profile.id],
    queryFn: fetchIsAppAdmin,
    staleTime: Infinity,
  });
  const mine = useQuery({
    queryKey: ['feedback', profile.id],
    queryFn: () => fetchMyFeedback(profile.id),
  });
  const queue = useQuery({
    queryKey: ['feedback-queue'],
    queryFn: fetchFeedbackQueue,
    enabled: isAdmin.data === true,
  });

  const showSkeleton = useSkeleton(mine.isPending);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['feedback', profile.id] });
    queryClient.invalidateQueries({ queryKey: ['feedback-queue'] });
  };

  const send = useMutation({
    mutationFn: () => submitFeedback(profile.id, kind, message),
    onSuccess: () => {
      setMessage('');
      setKind('idea');
      invalidate();
    },
  });
  const withdraw = useMutation({ mutationFn: deleteFeedback, onSuccess: invalidate });

  const trimmed = message.trim();
  const remaining = MAX_FEEDBACK_LENGTH - message.length;
  const items = mine.data ?? [];
  const rows = queue.data ?? [];
  const openCount = rows.filter((r) => r.status === 'new').length;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <span className="label-caps">Feedback</span>
        <p className="mt-1 text-[12px] text-faint">
          Bug, idea or gripe — it lands in the queue and you can watch the status change here.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
        <div className="flex gap-2">
          {FEEDBACK_KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              aria-pressed={kind === k.value}
              className={
                kind === k.value
                  ? 'rounded-[10px] border border-phosphor bg-phosphor/10 px-3 py-1.5 font-display text-[12px] font-bold text-phosphor'
                  : 'rounded-[10px] border border-line bg-well px-3 py-1.5 font-display text-[12px] font-bold text-dim'
              }
            >
              {k.label}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_FEEDBACK_LENGTH))}
          rows={3}
          placeholder="What happened, or what would you change?"
          aria-label="Your feedback"
          className="resize-y rounded-[10px] border border-line bg-well px-3 py-2.5 text-[14px] text-text placeholder:text-faint"
        />

        {remaining < 200 && (
          <span className="score-text text-[11px] text-faint">{remaining} characters left</span>
        )}

        <button
          type="button"
          onClick={() => trimmed && send.mutate()}
          disabled={send.isPending || !trimmed}
          className="rounded-[10px] bg-phosphor py-3 font-display text-[14px] font-bold text-ink disabled:bg-disabled disabled:text-faint"
        >
          {send.isPending ? 'Sending…' : 'Send feedback'}
        </button>

        {send.isError && (
          <p className="text-[12px] text-signal">
            Couldn’t send that — check your signal and try again.
          </p>
        )}
      </div>

      <span className="label-caps">Your items · {items.length}</span>
      {showSkeleton ? (
        <ListSkeleton rows={2} label="Loading your feedback" avatar={false} trailing={false} />
      ) : items.length === 0 ? (
        <p className="text-[12px] text-faint">Nothing sent yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((f) => (
            <div
              key={f.id}
              className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3.5"
            >
              <div className="flex items-center gap-2">
                <StatusPill status={f.status as FeedbackStatus} />
                <span className="label-caps">{f.kind}</span>
                <span className="score-text ml-auto text-[11px] text-faint">
                  {feedbackDate(f.created_at)}
                </span>
              </div>
              <p className="text-[13.5px] text-text">{f.message}</p>
              {f.admin_note && (
                <p className="border-l-2 border-line pl-2 text-[12px] text-dim">{f.admin_note}</p>
              )}
              {f.status === 'new' && (
                <button
                  type="button"
                  onClick={() => withdraw.mutate(f.id)}
                  disabled={withdraw.isPending}
                  className="self-start text-[12px] text-faint underline"
                >
                  Withdraw
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin.data === true && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setQueueOpen((open) => !open)}
            className="press flex items-center justify-between rounded-2xl border border-line bg-panel px-4 py-3.5"
          >
            <span className="text-[15px] text-text">
              Queue · everyone
              {openCount > 0 && <span className="text-phosphor"> · {openCount} new</span>}
            </span>
            <span className="text-[15px] text-faint">{queueOpen ? '⌃' : '⌄'}</span>
          </button>
          {queueOpen &&
            (rows.length === 0 ? (
              <p className="text-[12px] text-faint">Queue is empty.</p>
            ) : (
              rows.map((row, i) => (
                <div
                  key={row.id}
                  className="sheet-up"
                  style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
                >
                  <QueueRow row={row} onChanged={invalidate} />
                </div>
              ))
            ))}
        </div>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: FeedbackStatus }) {
  const label = FEEDBACK_STATUSES.find((s) => s.value === status)?.label ?? status;
  return (
    <span className={`label-caps rounded-[4px] border px-1.5 py-0.5 ${STATUS_STYLE[status]}`}>
      {label}
    </span>
  );
}

/** One triage row: set the status, leave the author a note, or bin it. */
function QueueRow({ row, onChanged }: { row: QueueItem; onChanged: () => void }) {
  const [note, setNote] = useState(row.admin_note ?? '');
  const status = useMutation({
    mutationFn: (next: FeedbackStatus) => setFeedbackStatus(row.id, next),
    onSuccess: onChanged,
  });
  const saveNote = useMutation({
    mutationFn: () => setFeedbackNote(row.id, note),
    onSuccess: onChanged,
  });
  const remove = useMutation({ mutationFn: () => deleteFeedback(row.id), onSuccess: onChanged });

  const author = row.profiles?.display_name ?? 'Someone';
  const noteDirty = note.trim() !== (row.admin_note ?? '');

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-panel p-3.5">
      <div className="flex items-center gap-2">
        <StatusPill status={row.status as FeedbackStatus} />
        <span className="label-caps">{row.kind}</span>
        <span className="score-text ml-auto text-[11px] text-faint">
          {feedbackDate(row.created_at)}
        </span>
      </div>
      <p className="text-[13.5px] text-text">{row.message}</p>
      <span className="text-[12px] text-dim">
        {author}
        {row.profiles?.username && <span className="text-faint"> @{row.profiles.username}</span>}
      </span>

      <div className="flex flex-wrap gap-1.5">
        {FEEDBACK_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => row.status !== s.value && status.mutate(s.value)}
            disabled={status.isPending}
            aria-pressed={row.status === s.value}
            className={
              row.status === s.value
                ? 'rounded-[8px] border border-phosphor bg-phosphor/10 px-2.5 py-1 font-display text-[11px] font-bold text-phosphor'
                : 'rounded-[8px] border border-line bg-well px-2.5 py-1 font-display text-[11px] font-bold text-dim'
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          placeholder="Note back to them (optional)"
          aria-label={`Note on ${author}’s feedback`}
          className="min-w-0 flex-1 rounded-[10px] border border-line bg-well px-3 py-2 text-[13px] text-text placeholder:text-faint"
        />
        <button
          type="button"
          onClick={() => saveNote.mutate()}
          disabled={!noteDirty || saveNote.isPending}
          className="rounded-[10px] border border-line bg-well px-3 py-2 font-display text-[12px] font-bold text-dim disabled:text-disabled"
        >
          Save
        </button>
      </div>

      <button
        type="button"
        onClick={() => remove.mutate()}
        disabled={remove.isPending}
        className="self-start text-[12px] text-faint underline"
      >
        Delete
      </button>

      {(status.isError || saveNote.isError || remove.isError) && (
        <p className="text-[12px] text-signal">That didn’t save — try again.</p>
      )}
    </div>
  );
}
