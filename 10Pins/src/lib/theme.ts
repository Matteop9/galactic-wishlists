import { useCallback, useEffect, useState } from 'react';

/**
 * Theme preference: light is the default, dark follows the system, and Profile
 * can pin either. The choice is `data-theme` on <html> (index.css keys its dark
 * tokens off it) and `tenpins.theme` in localStorage. index.html applies the
 * stored value before first paint so the page never flashes the other theme.
 *
 * Pure helpers take a `Storage | null` and swallow exceptions, in the shape of
 * feedFilter.ts: private mode and blocked storage just mean the choice lasts
 * for the session.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_KEY = 'tenpins.theme';

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function normaliseTheme(raw: string | null | undefined): ThemePreference {
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

export function readTheme(storage: Storage | null): ThemePreference {
  if (!storage) return 'system';
  try {
    return normaliseTheme(storage.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

export function writeTheme(storage: Storage | null, pref: ThemePreference): void {
  if (!storage) return;
  try {
    if (pref === 'system') storage.removeItem(THEME_KEY);
    else storage.setItem(THEME_KEY, pref);
  } catch {
    // blocked storage: the in-memory choice still applies for this session
  }
}

/** Put the choice on <html>. `system` removes the attribute so the media query decides. */
export function applyTheme(pref: ThemePreference): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
}

function storageOrNull(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** The theme preference and a setter that persists and applies it. */
export function useTheme(): [ThemePreference, (pref: ThemePreference) => void] {
  const [pref, setPref] = useState<ThemePreference>(() => readTheme(storageOrNull()));

  useEffect(() => {
    applyTheme(pref);
  }, [pref]);

  const update = useCallback((next: ThemePreference) => {
    setPref(next);
    writeTheme(storageOrNull(), next);
    applyTheme(next);
  }, []);

  return [pref, update];
}
