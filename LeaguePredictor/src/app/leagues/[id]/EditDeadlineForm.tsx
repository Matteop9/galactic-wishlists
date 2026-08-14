'use client';

import { useActionState } from 'react';
import { updateDeadlineAction, type EditDeadlineState } from './actions';

// datetime-local default shown in UK time — deterministic on server and client
// (explicit timeZone), so no hydration mismatch
function toLondonInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export default function EditDeadlineForm({ leagueId, lockAt }: { leagueId: string; lockAt: string }) {
  const [state, formAction, pending] = useActionState<EditDeadlineState | undefined, FormData>(
    (prev, formData) => {
      // datetime-local is timezone-less — resolve it to an instant here,
      // in the creator's timezone, before it reaches the server
      const parsed = new Date(String(formData.get('lockAt') ?? ''));
      if (!Number.isNaN(parsed.getTime())) formData.set('lockAtISO', parsed.toISOString());
      return updateDeadlineAction(leagueId, prev, formData);
    },
    undefined,
  );

  return (
    <form action={formAction} className="mt-4 border-t border-border pt-4">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-muted">Edit deadline (creator only)</span>
        <div className="flex gap-2">
          <input
            type="datetime-local"
            name="lockAt"
            required
            defaultValue={toLondonInputValue(lockAt)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            disabled={pending}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-display font-bold text-primary-ink hover:brightness-110 transition disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </label>
      {state?.error && (
        <p className="mt-2 rounded-md border border-off/40 bg-off/10 px-3 py-2 text-sm text-off">{state.error}</p>
      )}
      {state?.ok && !pending && <p className="mt-2 text-sm font-semibold text-spot">Deadline updated ✓</p>}
    </form>
  );
}
