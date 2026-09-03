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
import PageHeader from '../../components/PageHeader';
import PlayerLink from '../../components/PlayerLink';
import Strip, { StripTitle } from '../../components/Strip';
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

  const searching = query.trim().length >= 2;
  const found = results.data ?? [];

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <PageHeader
        back
        title="Friends"
        sub="Friends see each other’s games on the feed, even outside shared groups."
      />

      <Strip as="section">
        <div className="flex flex-col gap-1.5 p-3.5">
          <label className="label" htmlFor="friend-search">
            Find people
          </label>
          <input
            id="friend-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or @username"
            autoCapitalize="none"
            className="field"
          />
        </div>
        {found.map((p) => (
          <PersonRow key={p.id} person={p} myId={profile.id}>
            {linkedIds.has(p.id) ? (
              <span className="text-[13px] text-ink-faded">Added</span>
            ) : (
              <button
                type="button"
                onClick={() => send.mutate(p.id)}
                disabled={send.isPending}
                className="btn-primary-sm"
              >
                Add friend
              </button>
            )}
          </PersonRow>
        ))}
        {searching && results.data && found.length === 0 && (
          <div className="px-3.5 py-3">
            <EmptyState tone="quiet" body={`Nobody found for “${query.trim()}”.`} />
          </div>
        )}
      </Strip>

      {incoming.length > 0 && (
        <Strip as="section">
          <StripTitle right={<span className="num">{incoming.length}</span>}>Requests</StripTitle>
          {incoming.map((f) => {
            const p = otherProfile(f, profile.id);
            if (!p) return null;
            return (
              <PersonRow key={p.id} person={p} myId={profile.id}>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => remove.mutate(p.id)} className="btn-secondary-sm">
                    Ignore
                  </button>
                  <button
                    type="button"
                    onClick={() => accept.mutate(f.requester)}
                    disabled={accept.isPending}
                    className="btn-primary-sm"
                  >
                    Accept
                  </button>
                </div>
              </PersonRow>
            );
          })}
        </Strip>
      )}

      {showSkeleton ? (
        <ListSkeleton rows={3} label="Loading your friends" />
      ) : accepted.length === 0 ? (
        <EmptyState
          tone="inline"
          title="Friends"
          body="No friends yet. Search above, or share a group invite instead."
        />
      ) : (
        <Strip as="section">
          <StripTitle right={<span className="num">{accepted.length}</span>}>Friends</StripTitle>
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
                  className="btn-danger-text"
                >
                  Unfriend
                </button>
              </PersonRow>
            );
          })}
        </Strip>
      )}

      {outgoing.length > 0 && (
        <Strip as="section">
          <StripTitle right={<span className="num">{outgoing.length}</span>}>Sent</StripTitle>
          {outgoing.map((f) => {
            const p = otherProfile(f, profile.id);
            if (!p) return null;
            return (
              <PersonRow key={p.id} person={p} myId={profile.id}>
                <span className="text-[13px] text-ink-faded">Pending</span>
              </PersonRow>
            );
          })}
        </Strip>
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
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <PlayerLink profileId={person.id} myId={myId} className="flex min-w-0 items-center gap-3">
        <Avatar name={person.display_name} url={person.avatar_url} size={32} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold">{person.display_name}</p>
          <p className="truncate text-[12px] text-ink-faded">@{person.username}</p>
        </div>
      </PlayerLink>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
