import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  markAllRead,
  notificationLink,
  notificationText,
} from '../../lib/notifications';
import { ListSkeleton, RefetchLine } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

export default function Notifications({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ['notifications', profile.id],
    queryFn: () => fetchNotifications(profile.id),
  });
  const showSkeleton = useSkeleton(list.isPending);

  // Opening the screen clears the badge (after the list has loaded, so the
  // unread highlights still render for this visit).
  useEffect(() => {
    if (!list.isSuccess) return;
    markAllRead(profile.id)
      .then(() => queryClient.invalidateQueries({ queryKey: ['unread-count', profile.id] }))
      .catch(() => {});
  }, [list.isSuccess, profile.id, queryClient]);

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h1 className="font-display text-[20px] font-bold">Notifications</h1>

      <RefetchLine active={list.isFetching && !list.isPending} />

      {showSkeleton && <ListSkeleton rows={5} label="Loading your notifications" trailing={false} />}

      {!showSkeleton && list.data && list.data.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="font-display text-[20px] font-bold">All quiet</p>
          <p className="max-w-[260px] text-[13.5px] text-dim">
            Reactions, comments, friend requests and match-day news land here.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {(list.data ?? []).map((n, i) => (
          <Link
            key={n.id}
            to={notificationLink(n)}
            style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
            className={`rise-in press flex items-start justify-between gap-3 rounded-xl border px-4 py-3 ${
              n.read_at ? 'border-line bg-panel' : 'border-phosphor/40 bg-phosphor/5'
            }`}
          >
            <p className="text-[13.5px] text-text">{notificationText(n)}</p>
            <span className="shrink-0 text-[10.5px] text-faint">
              {new Date(n.created_at ?? '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
