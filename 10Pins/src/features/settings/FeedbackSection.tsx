import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from '../../components/Icon';
import Strip, { StripTitle } from '../../components/Strip';
import ChipRow from '../../components/ChipRow';
import EmptyState from '../../components/EmptyState';
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
  submitFeedback,
  type FeedbackKind,
  type FeedbackStatus,
  type QueueItem,
} from '../../lib/feedback';
import { Bar } from '../../components/Skeleton';
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
    <Strip as="section">
      <StripTitle>Feedback</StripTitle>

      <div className="flex flex-col gap-3 p-3.5">
        <p className="text-[13px] text-ink-faded">
          Send a bug or an idea. Its status updates here as it moves along.
        </p>

        <ChipRow
          label="Kind"
          options={FEEDBACK_KINDS}
          value={kind}
          onChange={(v) => setKind(v as FeedbackKind)}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="feedback-message" className="label">
            Your feedback
          </label>
          <textarea
            id="feedback-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_FEEDBACK_LENGTH))}
            rows={3}
            placeholder="What happened, or what would you change?"
            aria-label="Your feedback"
            className="field min-h-[96px] resize-y"
          />
          {remaining < 200 && (
            <span className="text-[12px] text-ink-faded">
              <span className="num">{remaining}</span> characters left
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => trimmed && send.mutate()}
            disabled={send.isPending || !trimmed}
            className="btn-primary-sm"
          >
            {send.isPending ? 'Sending…' : 'Send'}
          </button>
          {send.isError && (
            <p className="text-[13px] text-red" role="alert">
              That didn’t send. Check your connection and try again.
            </p>
          )}
        </div>
      </div>

      <StripTitle right={<span className="num">{items.length}</span>}>Your items</StripTitle>
      {showSkeleton ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-2 px-3.5 py-3">
          <span className="sr-only">Loading your feedback</span>
          <Bar w="62%" h={12} />
          <Bar w="38%" h={10} />
        </div>
      ) : items.length === 0 ? (
        <div className="px-3.5 py-3">
          <EmptyState tone="quiet" body="You haven’t sent any feedback." />
        </div>
      ) : (
        items.map((f) => (
          <div key={f.id} className="flex flex-col gap-1.5 px-3.5 py-3">
            <div className="flex items-center gap-2 text-[12px] text-ink-faded">
              <span>{statusLabel(f.status as FeedbackStatus)}</span>
              <span>·</span>
              <span>{kindLabel(f.kind as FeedbackKind)}</span>
              <span className="num ml-auto">{feedbackDate(f.created_at)}</span>
            </div>
            <p className="text-[14px]">{f.message}</p>
            {f.admin_note && (
              <p className="text-[13px] text-ink-faded">Reply: {f.admin_note}</p>
            )}
            {f.status === 'new' && (
              <button
                type="button"
                onClick={() => withdraw.mutate(f.id)}
                disabled={withdraw.isPending}
                className="btn-secondary-sm self-start"
              >
                Withdraw
              </button>
            )}
          </div>
        ))
      )}

      {isAdmin.data === true && (
        <button
          type="button"
          onClick={() => setQueueOpen((open) => !open)}
          aria-expanded={queueOpen}
          aria-controls="feedback-queue"
          className="press flex w-full items-center justify-between px-3.5 py-3 text-left text-[15px]"
        >
          <span className="font-semibold">
            Everyone’s feedback
            {openCount > 0 && (
              <span className="font-normal text-ink-faded">
                {' · '}
                <span className="num">{openCount}</span> new
              </span>
            )}
          </span>
          <Icon name={queueOpen ? 'chevron-up' : 'chevron-down'} className="size-[18px] text-ink-faded" />
        </button>
      )}
      {isAdmin.data === true && queueOpen && (
        <div id="feedback-queue" className="flex flex-col divide-y divide-hairline">
          {rows.length === 0 ? (
            <div className="px-3.5 py-3">
              <EmptyState tone="quiet" body="The queue is empty." />
            </div>
          ) : (
            rows.map((row, i) => (
              <div key={row.id} className="rise-in" style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}>
                <QueueRow row={row} onChanged={invalidate} />
              </div>
            ))
          )}
        </div>
      )}
    </Strip>
  );
}

function statusLabel(status: FeedbackStatus): string {
  return FEEDBACK_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function kindLabel(kind: FeedbackKind): string {
  return FEEDBACK_KINDS.find((k) => k.value === kind)?.label ?? kind;
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
    <div className="flex flex-col gap-2.5 px-3.5 py-3">
      <div className="flex items-center gap-2 text-[12px] text-ink-faded">
        <span>{statusLabel(row.status as FeedbackStatus)}</span>
        <span>·</span>
        <span>{kindLabel(row.kind as FeedbackKind)}</span>
        <span className="num ml-auto">{feedbackDate(row.created_at)}</span>
      </div>
      <p className="text-[14px]">{row.message}</p>
      <p className="text-[13px] text-ink-faded">
        {author}
        {row.profiles?.username && <span> @{row.profiles.username}</span>}
      </p>

      <ChipRow
        label={`Status of ${author}’s feedback`}
        options={FEEDBACK_STATUSES}
        value={row.status}
        onChange={(v) => {
          if (row.status !== v && !status.isPending) status.mutate(v as FeedbackStatus);
        }}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`note-${row.id}`} className="label">
          Note back to them <span className="optional">optional</span>
        </label>
        <div className="flex gap-2">
          <input
            id={`note-${row.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder="A line they will see under their item"
            aria-label={`Note on ${author}’s feedback`}
            className="field min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={() => saveNote.mutate()}
            disabled={!noteDirty || saveNote.isPending}
            className="btn-secondary-sm shrink-0"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
          className="btn-danger-text"
        >
          Delete
        </button>
        {(status.isError || saveNote.isError || remove.isError) && (
          <p className="text-[13px] text-red" role="alert">
            That didn’t save. Check your connection and try again.
          </p>
        )}
      </div>
    </div>
  );
}
