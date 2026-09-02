import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export default function FirstRun() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const candidate = useDebounced(username, 400);
  const candidateValid = USERNAME_RE.test(candidate);

  const availability = useQuery({
    queryKey: ['username-availability', candidate],
    enabled: candidateValid,
    queryFn: async () => {
      const { count, error: err } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('username', candidate);
      if (err) throw err;
      return (count ?? 0) === 0;
    },
  });

  const usernameValid = USERNAME_RE.test(username);
  const settled = candidate === username && candidateValid && !availability.isFetching;
  const available = settled && availability.data === true;
  const canSubmit = displayName.trim().length > 0 && usernameValid && available && !saving;

  async function createProfile(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('profiles').insert({
      id: session.user.id,
      username,
      display_name: displayName.trim(),
    });
    if (err) {
      setError(
        err.code === '23505'
          ? "That username’s just been taken — pick another."
          : "That didn’t save — try again.",
      );
      setSaving(false);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-20 items-center justify-center rounded-full border-2 border-line bg-panel font-display text-[26px] font-bold text-glass">
          {initials(displayName)}
        </div>
        <p className="font-display text-[20px] font-bold">Set up your profile</p>
      </div>

      <form onSubmit={createProfile} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="display-name" className="label-caps">
            Display name
          </label>
          <input
            id="display-name"
            type="text"
            required
            maxLength={40}
            placeholder="Matt Brown"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-[10px] border border-line bg-well px-4 py-3 text-[15px] text-text placeholder:text-faint"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="username" className="label-caps">
            Username
          </label>
          <div className="flex items-center rounded-[10px] border border-line bg-well px-4">
            <span className="text-[15px] text-faint">@</span>
            <input
              id="username"
              type="text"
              required
              maxLength={20}
              placeholder="mattb"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
              }
              className="w-full bg-transparent py-3 pl-1 text-[15px] text-text placeholder:text-faint focus:outline-none"
            />
          </div>
          <p className="min-h-5 text-[13.5px]" aria-live="polite">
            {username.length > 0 && !usernameValid && (
              <span className="text-faint">3–20 characters: a–z, 0–9 and _</span>
            )}
            {usernameValid && !settled && <span className="text-faint">Checking…</span>}
            {available && <span className="text-success">@{username} is available</span>}
            {settled && availability.data === false && (
              <span className="text-signal">@{username} is taken</span>
            )}
          </p>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-[10px] bg-phosphor py-3 font-display text-[15px] font-bold text-ink shadow-glow-amber disabled:opacity-50 disabled:shadow-none"
        >
          {saving ? 'Saving…' : 'Start bowling'}
        </button>
        {error && <p className="text-center text-[13.5px] text-signal">{error}</p>}
      </form>
    </div>
  );
}
