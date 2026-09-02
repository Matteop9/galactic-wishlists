import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGroup, fetchMyGroups, joinGroup } from '../../lib/groups';
import { ListSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

export default function GroupsList({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const groups = useQuery({ queryKey: ['my-groups', profile.id], queryFn: () => fetchMyGroups(profile.id) });
  const showSkeleton = useSkeleton(groups.isPending);

  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const create = useMutation({
    mutationFn: () => createGroup(profile.id, name),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      navigate(`/groups/${id}`);
    },
  });

  const join = useMutation({
    mutationFn: () => joinGroup(code.trim()),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      navigate(`/groups/${id}`);
    },
  });

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-[20px] font-bold">Groups</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === 'join' ? 'none' : 'join')}
            className="rounded-[10px] border border-line bg-panel px-3 py-2 text-[13px] font-bold text-text"
          >
            Join
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'create' ? 'none' : 'create')}
            className="rounded-[10px] bg-phosphor px-3 py-2 font-display text-[13px] font-bold text-ink"
          >
            New group
          </button>
        </div>
      </header>

      {mode === 'create' && (
        <form
          className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length >= 2) create.mutate();
          }}
        >
          <label className="label-caps" htmlFor="group-name">
            Group name
          </label>
          <input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friday Night Strikes"
            maxLength={40}
            className="rounded-[10px] border border-line bg-well px-3 py-3 text-[15px] text-text placeholder:text-faint"
          />
          <button
            type="submit"
            disabled={name.trim().length < 2 || create.isPending}
            className="rounded-[10px] bg-phosphor py-3 font-display text-[15px] font-bold text-ink disabled:opacity-60"
          >
            {create.isPending ? 'Creating…' : 'Create group'}
          </button>
          {create.isError && (
            <p className="text-[13px] text-signal" role="alert">
              Couldn’t create the group — try again.
            </p>
          )}
        </form>
      )}

      {mode === 'join' && (
        <form
          className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) join.mutate();
          }}
        >
          <label className="label-caps" htmlFor="invite-code">
            Invite code
          </label>
          <input
            id="invite-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. 4f9a1c22b8d0"
            className="rounded-[10px] border border-line bg-well px-3 py-3 font-mono text-[15px] text-text placeholder:text-faint"
          />
          <button
            type="submit"
            disabled={!code.trim() || join.isPending}
            className="rounded-[10px] bg-phosphor py-3 font-display text-[15px] font-bold text-ink disabled:opacity-60"
          >
            {join.isPending ? 'Joining…' : 'Join group'}
          </button>
          {join.isError && (
            <p className="text-[13px] text-signal" role="alert">
              That code didn’t work — check it and try again.
            </p>
          )}
        </form>
      )}

      {showSkeleton && <ListSkeleton rows={3} label="Loading your groups" />}

      {!showSkeleton && groups.data && groups.data.length === 0 && mode === 'none' && (
        <EmptyState
          title="No groups yet"
          body="A group is where the leaderboard and the banter live. Create one for your crew, or join one with an invite code."
          action={{ label: 'Create a group', onPress: () => setMode('create') }}
          secondary={{ label: 'I have an invite code', onPress: () => setMode('join') }}
        />
      )}

      <div className="flex flex-col gap-3">
        {(groups.data ?? []).map((m, i) => {
          const g = m.groups;
          if (!g) return null;
          return (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
              className="rise-in press flex items-center justify-between rounded-2xl border border-line bg-panel p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-[17px] font-bold text-text">{g.name}</p>
                {g.season_name && <p className="text-[12px] text-faint">{g.season_name}</p>}
              </div>
              {m.role === 'admin' && <span className="label-caps text-phosphor">Admin</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
