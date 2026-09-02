import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptFriendRequest,
  fetchFriendships,
  otherProfile,
  removeFriendship,
  searchProfiles,
  sendFriendRequest,
  type ProfileLite,
} from '../../lib/friends';
import { ListSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import Avatar from '../../components/Avatar';
import PlayerLink from '../../components/PlayerLink';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

export default function Friends({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');

  const friendships = useQuery({
    queryKey: ['friendships', profile.id],
    queryFn: () => fetchFriendships(profile.id),
  });
  const results = useQuery({
    queryKey: ['profile-search', query],
    queryFn: () => searchProfiles(query, profile.id),
    enabled: query.trim().length >= 2,
  });

  const showSkeleton = useSkeleton(friendships.isPending);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['friendships', profile.id] });
  const send = useMutation({
    mutationFn: (them: string) => sendFriendRequest(profile.id, them),
    onSuccess: invalidate,
  });
  const accept = useMutation({
    mutationFn: (requester: string) => acceptFriendRequest(requester, profile.id),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (them: string) => removeFriendship(profile.id, them),
    onSuccess: invalidate,
  });

  const rows = friendships.data ?? [];
  const accepted = rows.filter((f) => f.status === 'accepted');
  const incoming = rows.filter((f) => f.status === 'pending' && f.addressee === profile.id);
  const outgoing = rows.filter((f) => f.status === 'pending' && f.requester === profile.id);
  const linkedIds = new Set(rows.flatMap((f) => [f.requester, f.addressee]));

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <h1 className="font-display text-[20px] font-bold">Friends</h1>
      <p className="text-[12px] text-faint">
        Friends see each other’s games on the feed, even outside shared groups.
      </p>

      <div className="flex flex-col gap-2">
        <label className="label-caps" htmlFor="friend-search">
          Find people
        </label>
        <input
          id="friend-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or @username"
          className="rounded-control border border-line bg-well px-3 py-3 text-[14px] text-text placeholder:text-faint"
        />
        {(results.data ?? []).map((p) => (
          <PersonRow key={p.id} person={p} myId={profile.id}>
            {linkedIds.has(p.id) ? (
              <span className="text-[12px] text-faint">Added</span>
            ) : (
              <button
                type="button"
                onClick={() => send.mutate(p.id)}
                disabled={send.isPending}
                className="rounded-control bg-phosphor px-3 py-1.5 font-display text-[12px] font-bold text-ink"
              >
                Add friend
              </button>
            )}
          </PersonRow>
        ))}
        {query.trim().length >= 2 && results.data && results.data.length === 0 && (
          <p className="text-[12px] text-faint">Nobody found for “{query.trim()}”.</p>
        )}
      </div>

      {incoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <span className="label-caps">Requests</span>
          {incoming.map((f) => {
            const p = otherProfile(f, profile.id);
            if (!p) return null;
            return (
              <PersonRow key={p.id} person={p} myId={profile.id}>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => remove.mutate(p.id)}
                    className="rounded-control border border-line bg-well px-3 py-1.5 text-[12px] text-dim"
                  >
                    Ignore
                  </button>
                  <button
                    type="button"
                    onClick={() => accept.mutate(f.requester)}
                    disabled={accept.isPending}
                    className="rounded-control bg-phosphor px-3 py-1.5 font-display text-[12px] font-bold text-ink"
                  >
                    Accept
                  </button>
                </div>
              </PersonRow>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <span className="label-caps">Your friends · {accepted.length}</span>
        {showSkeleton && <ListSkeleton rows={3} label="Loading your friends" />}
        {!showSkeleton && accepted.length === 0 && (
          <EmptyState
            tone="inline"
            body="No friends yet — search above, or share a group invite instead."
          />
        )}
        {accepted.map((f) => {
          const p = otherProfile(f, profile.id);
          if (!p) return null;
          return (
            <PersonRow key={p.id} person={p} myId={profile.id}>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Unfriend ${p.display_name}?`)) remove.mutate(p.id);
                }}
                className="text-[12px] text-faint underline underline-offset-2"
              >
                Unfriend
              </button>
            </PersonRow>
          );
        })}
      </section>

      {outgoing.length > 0 && (
        <section className="flex flex-col gap-2">
          <span className="label-caps">Sent</span>
          {outgoing.map((f) => {
            const p = otherProfile(f, profile.id);
            if (!p) return null;
            return (
              <PersonRow key={p.id} person={p} myId={profile.id}>
                <span className="text-[12px] text-faint">Pending</span>
              </PersonRow>
            );
          })}
        </section>
      )}
    </div>
  );
}

function PersonRow({
  person,
  myId,
  children,
}: {
  person: ProfileLite;
  myId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-panel px-4 py-3">
      <PlayerLink profileId={person.id} myId={myId} className="flex min-w-0 items-center gap-3">
        <Avatar name={person.display_name} url={person.avatar_url} size={32} />
        <div className="min-w-0">
          <p className="truncate text-[14px] text-text underline-offset-2 hover:underline">
            {person.display_name}
          </p>
          <p className="text-[11px] text-faint">@{person.username}</p>
        </div>
      </PlayerLink>
      {children}
    </div>
  );
}
