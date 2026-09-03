import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGroup, fetchMyGroups, joinGroup } from '../../lib/groups';
import { ListSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Strip from '../../components/Strip';
import Avatar from '../../components/Avatar';
import Icon from '../../components/Icon';
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
    <div className="flex flex-col gap-4 px-4 py-6">
      <div className="px-1">
        <PageHeader
          title="Groups"
          right={
            <>
              <button
                type="button"
                onClick={() => setMode(mode === 'join' ? 'none' : 'join')}
                aria-pressed={mode === 'join'}
                className="btn-secondary-sm"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => setMode(mode === 'create' ? 'none' : 'create')}
                aria-pressed={mode === 'create'}
                className="btn-secondary-sm"
              >
                New group
              </button>
            </>
          }
        />
      </div>

      {mode === 'create' && (
        <Strip as="form" className="rise-in">
          <form
            className="flex flex-col gap-3 p-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().length >= 2) create.mutate();
            }}
          >
            <label className="label" htmlFor="group-name">
              Group name
            </label>
            <input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friday night strikes"
              maxLength={40}
              className="field"
            />
            <button type="submit" disabled={name.trim().length < 2 || create.isPending} className="btn-primary">
              {create.isPending ? 'Creating…' : 'Create group'}
            </button>
            {create.isError && (
              <p className="text-[13px] text-red" role="alert">
                That didn’t save. Check your connection and try again.
              </p>
            )}
          </form>
        </Strip>
      )}

      {mode === 'join' && (
        <Strip className="rise-in">
          <form
            className="flex flex-col gap-3 p-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) join.mutate();
            }}
          >
            <label className="label" htmlFor="invite-code">
              Invite code
            </label>
            <input
              id="invite-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 4f9a1c22b8d0"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="field num"
            />
            <button type="submit" disabled={!code.trim() || join.isPending} className="btn-primary">
              {join.isPending ? 'Joining…' : 'Join group'}
            </button>
            {join.isError && (
              <p className="text-[13px] text-red" role="alert">
                That code didn’t work. Check it and try again.
              </p>
            )}
          </form>
        </Strip>
      )}

      {showSkeleton && <ListSkeleton rows={3} label="Loading your groups" />}

      {!showSkeleton && groups.data && groups.data.length === 0 && mode === 'none' && (
        <EmptyState
          title="No groups yet"
          body="A group is where the leaderboard lives. Start one for your friends, or join one with an invite code."
          action={{ label: 'Create a group', onPress: () => setMode('create') }}
          secondary={{ label: 'I have an invite code', onPress: () => setMode('join') }}
        />
      )}

      <div className="flex flex-col gap-3">
        {(groups.data ?? []).map((m, i) => {
          const g = m.groups;
          if (!g) return null;
          return (
            <div key={g.id} className="rise-in" style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}>
              <Strip>
                <Link to={`/groups/${g.id}`} className="press flex items-center gap-3 p-3.5">
                  <Avatar name={g.name} size={34} />
                  <div className="flex min-w-0 flex-col gap-px">
                    <span className="num truncate text-[17px] font-semibold">{g.name}</span>
                    <span className="truncate text-[13px] text-ink-faded">
                      {g.season_name ?? 'No season yet'}
                      {m.role === 'admin' ? ' · admin' : ''}
                    </span>
                  </div>
                  <Icon name="chevron-right" className="ml-auto size-5 shrink-0 text-ink-faded" />
                </Link>
              </Strip>
            </div>
          );
        })}
      </div>
    </div>
  );
}
