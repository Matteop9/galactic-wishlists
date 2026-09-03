import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import Strip from '../../components/Strip';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { markSeen } from '../../lib/changelog';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function UsernameRule() {
  return (
    <span className="text-ink-faded">
      Lowercase letters, numbers and underscores, <span className="num">3</span> to{' '}
      <span className="num">20</span> characters.
    </span>
  );
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
          ? 'That username has just been taken. Pick another.'
          : 'That didn’t save. Check your connection and try again.',
      );
      setSaving(false);
      return;
    }
    // A brand-new account has no release to catch up on: mark the current
    // version read so their first feed is games, not a changelog. A missing
    // key therefore means "had the app before this page existed", which is
    // what `releasesSince(null)` is written for.
    try {
      markSeen(typeof localStorage === 'undefined' ? null : localStorage);
    } catch {
      /* blocked storage: worst case they see one card they didn't need */
    }
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
  }

  // The disc previews how the name will read on a scoresheet; "?" until typed.
  const previewName = displayName.trim() || '?';

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col justify-center gap-5 px-6 py-12">
      <header className="flex items-center gap-3.5 px-1 py-2">
        <Avatar name={previewName} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="num text-[24px] font-semibold leading-tight">Set up your profile</h1>
          <p className="text-[13px] text-ink-faded">How your name reads on the scoresheet.</p>
        </div>
      </header>

      <form onSubmit={createProfile} className="flex flex-col gap-4">
        <Strip>
          <div className="flex flex-col gap-1.5 p-3.5">
            <label htmlFor="display-name" className="label">
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
              className="field"
            />
          </div>

          <div className="flex flex-col gap-1.5 p-3.5">
            <label htmlFor="username" className="label">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              maxLength={20}
              placeholder="mattb"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(event) =>
                setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
              }
              className="field"
            />
            <p className="min-h-5 text-[13px]" aria-live="polite">
              {!usernameValid && <UsernameRule />}
              {usernameValid && !settled && <span className="text-ink-faded">Checking…</span>}
              {available && <span className="text-ink">@{username} is available</span>}
              {settled && availability.data === false && (
                <span className="text-red">@{username} is taken</span>
              )}
            </p>
          </div>

          <div className="p-3.5">
            <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
              {saving ? 'Saving…' : 'Start bowling'}
            </button>
          </div>
        </Strip>

        {error && (
          <p className="text-center text-[13px] text-red" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
