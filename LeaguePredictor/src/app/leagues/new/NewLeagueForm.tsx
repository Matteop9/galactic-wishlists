'use client';

import { useActionState } from 'react';
import { createLeagueAction, type CreateLeagueState } from './actions';
import { COMPETITIONS, DEFAULT_COMPETITION_IDS } from '@/lib/competitions';

export default function NewLeagueForm({ defaultLockAt }: { defaultLockAt: string }) {
  const [state, formAction, pending] = useActionState<CreateLeagueState | undefined, FormData>(
    createLeagueAction,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 flex max-w-lg flex-col gap-6">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">League name</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={60}
          placeholder="e.g. The House Picks"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 focus:border-primary focus:outline-none"
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Competitions</legend>
        <p className="mb-3 text-xs text-muted">
          Everyone in the league predicts the full final table (and top scorer) for each one you tick.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {COMPETITIONS.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 has-[:checked]:border-primary has-[:checked]:bg-primary/10 transition-colors"
            >
              <input
                type="checkbox"
                name="competitions"
                value={c.id}
                defaultChecked={DEFAULT_COMPETITION_IDS.includes(c.id)}
                className="accent-(--primary)"
              />
              <span className="text-sm">
                {c.flag} <span className="font-semibold">{c.name}</span>{' '}
                <span className="text-muted">· {c.country}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Prediction deadline</span>
        <input
          type="datetime-local"
          name="lockAt"
          required
          defaultValue={defaultLockAt}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 focus:border-primary focus:outline-none"
        />
        <span className="mt-1 block text-xs text-muted">
          Predictions lock and become visible to everyone at this time. Heads-up: the Championship
          kicks off before the Premier League — set the deadline before the first game of your
          earliest competition.
        </span>
      </label>

      {state?.error && (
        <p className="rounded-md border border-off/40 bg-off/10 px-3 py-2 text-sm text-off">{state.error}</p>
      )}

      <button
        disabled={pending}
        className="rounded-lg bg-primary px-5 py-2.5 font-display font-bold text-primary-ink hover:brightness-110 transition disabled:opacity-60"
      >
        {pending ? 'Creating…' : 'Create league'}
      </button>
    </form>
  );
}
