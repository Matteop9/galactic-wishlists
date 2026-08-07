import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { readDoc, updateDoc, paths } from './store';
import type { User, UsersDoc } from './types';

const COOKIE_NAME = 'spoton_session';
const SESSION_DAYS = 90;

export type Session = {
  userId: string;
  username: string;
  displayName: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function createSessionCookie(session: Session): Promise<void> {
  const jwt = await new SignJWT(session)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
  const jar = await cookies();
  jar.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
    path: '/',
  });
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const { userId, username, displayName } = payload as Record<string, unknown>;
    if (typeof userId !== 'string' || typeof username !== 'string') return null;
    return { userId, username, displayName: String(displayName ?? username) };
  } catch {
    return null;
  }
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

// ---- user registry ----

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normaliseUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}

export async function getUsers(): Promise<User[]> {
  const doc = await readDoc<UsersDoc>(paths.users);
  return doc?.users ?? [];
}

export async function registerUser(
  usernameRaw: string,
  displayName: string,
  password: string,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const username = normaliseUsername(usernameRaw);
  if (!validUsername(username)) {
    return { ok: false, error: 'Username must be 3–20 characters: letters, numbers or _' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters' };
  }
  const existing = await getUsers();
  if (existing.some((u) => u.username === username)) {
    return { ok: false, error: 'That username is taken' };
  }
  const user: User = {
    id: crypto.randomUUID(),
    username,
    displayName: displayName.trim() || username,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  };
  await updateDoc<UsersDoc>(paths.users, (cur) => ({
    users: [...(cur?.users ?? []).filter((u) => u.username !== username), user],
  }));
  return { ok: true, user };
}

export async function verifyLogin(
  usernameRaw: string,
  password: string,
): Promise<User | null> {
  const username = normaliseUsername(usernameRaw);
  const users = await getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');
  return session;
}
