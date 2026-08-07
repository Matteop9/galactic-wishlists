'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction, registerAction, type AuthFormState } from './actions';

export default function AuthForm({ mode, next }: { mode: 'login' | 'register'; next: string }) {
  const action = mode === 'login' ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState<AuthFormState | undefined, FormData>(
    action,
    undefined,
  );

  return (
    <div className="mx-auto mt-6 max-w-sm">
      <h1 className="text-3xl font-extrabold tracking-tight">
        {mode === 'login' ? 'Sign in' : 'Create your account'}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {mode === 'login' ? 'Welcome back. Lowest score wins.' : 'Pick a username and password — that’s it.'}
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Username</span>
          <input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]+"
            title="Letters, numbers and _ only"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 focus:border-primary focus:outline-none"
          />
        </label>
        {mode === 'register' && (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">
              Display name <span className="font-normal text-muted">(what your mates see)</span>
            </span>
            <input
              name="displayName"
              maxLength={30}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Password</span>
          <input
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 focus:border-primary focus:outline-none"
          />
        </label>

        {state?.error && (
          <p className="rounded-md border border-off/40 bg-off/10 px-3 py-2 text-sm text-off">{state.error}</p>
        )}

        <button
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2.5 font-display font-bold text-primary-ink hover:brightness-110 transition disabled:opacity-60"
        >
          {pending ? 'One sec…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        {mode === 'login' ? (
          <>
            New here?{' '}
            <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-primary hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already got an account?{' '}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-primary hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
