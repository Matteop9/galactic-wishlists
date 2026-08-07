'use server';

import { redirect } from 'next/navigation';
import { createSessionCookie, registerUser, verifyLogin } from '@/lib/auth';

export type AuthFormState = { error?: string };

function safeNext(next: string): string {
  // internal paths only
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return '/';
}

export async function loginAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const username = String(formData.get('username') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/');

  const user = await verifyLogin(username, password);
  if (!user) return { error: 'Wrong username or password' };

  await createSessionCookie({
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
  });
  redirect(safeNext(next));
}

export async function registerAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const username = String(formData.get('username') ?? '');
  const displayName = String(formData.get('displayName') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/');

  const result = await registerUser(username, displayName, password);
  if (!result.ok) return { error: result.error };

  await createSessionCookie({
    userId: result.user.id,
    username: result.user.username,
    displayName: result.user.displayName,
  });
  redirect(safeNext(next));
}
