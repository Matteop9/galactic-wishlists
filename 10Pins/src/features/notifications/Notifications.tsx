import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/PageHeader';
import Strip from '../../components/Strip';
import EmptyState from '../../components/EmptyState';
import {
  fetchNotifications,
  markAllRead,
  notificationLink,
  notificationText,
} from '../../lib/notifications';
import { ListSkeleton, RefetchLine } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

/** "30 Aug": when it happened, in the meta register. */
function shortDate(iso: string | null): string {
  const date = new Date(iso ?? '');
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function Notifications({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const location = useLocation();
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

  // A deep link or a fresh launch has nothing behind it, so back goes home.
  const back = location.key === 'default' ? '/' : true;
  const rows = list.data ?? [];

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <PageHeader back={back} title="Notifications" />

      <RefetchLine active={list.isFetching && !list.isPending} />

      {showSkeleton && <ListSkeleton rows={5} label="Loading your notifications" trailing={false} />}

      {!showSkeleton && list.data && list.data.length === 0 && (
        <EmptyState
          tone="inline"
          title="All quiet"
          body="Reactions, comments, friend requests and match-day news show up here."
        />
      )}

      {rows.length > 0 && (
        <Strip className="rise-in">
          {rows.map((n) => (
            <Link
              key={n.id}
              to={notificationLink(n)}
              className={`press flex items-start gap-3 px-3.5 py-3 ${n.read_at ? '' : 'bg-card'}`}
            >
              <p className="min-w-0 flex-1 text-[14px]">{notificationText(n)}</p>
              <span className="num shrink-0 text-[12px] text-ink-faded">{shortDate(n.created_at)}</span>
            </Link>
          ))}
        </Strip>
      )}
    </div>
  );
}
