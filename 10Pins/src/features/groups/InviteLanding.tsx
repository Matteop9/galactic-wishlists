import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInvitePreview, joinGroup } from '../../lib/groups';
import { PreviewSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import Strip from '../../components/Strip';
import Wordmark from '../../components/Wordmark';
import { useSkeleton } from '../../lib/useSkeleton';

/** /join/:code, shown post-auth (the route lives inside the Shell). */
export default function InviteLanding() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const preview = useQuery({
    queryKey: ['invite-preview', code],
    queryFn: () => fetchInvitePreview(code!),
    enabled: !!code,
    retry: false,
  });
  const showSkeleton = useSkeleton(preview.isPending);

  const join = useMutation({
    mutationFn: () => joinGroup(code!),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      navigate(`/groups/${id}`, { replace: true });
    },
  });

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6">
        <PreviewSkeleton label="Checking your invite" />
      </div>
    );
  }
  if (preview.isPending) return <div className="px-4 py-6" />;

  if (preview.isError || !preview.data) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          tone="page"
          title="Invite not found"
          body="That invite link doesn’t work. Ask the group for a fresh one."
          action={{ label: 'Back to groups', to: '/groups' }}
        />
      </div>
    );
  }

  const p = preview.data;

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-5 px-4 py-10">
      <Wordmark size="sm" />

      <Strip className="w-full">
        <div className="flex flex-col items-center gap-1 p-5 text-center">
          <span className="text-[13px] text-ink-faded">You’re invited to</span>
          <span className="num text-[22px] font-semibold leading-tight">{p.name}</span>
          <span className="text-[13px] text-ink-faded">
            <span className="num">{p.member_count}</span> {p.member_count === 1 ? 'player' : 'players'}
            {p.season_name ? ` · ${p.season_name}` : ''}
          </span>
        </div>
        {p.top3.length > 0 && (
          <div className="grid grid-cols-[34px_1fr_52px_56px] px-3.5 py-[9px] text-[12px] text-ink-faded">
            <span>#</span>
            <span>Top of the table</span>
            <span className="text-right">Games</span>
            <span className="text-right">Average</span>
          </div>
        )}
        {p.top3.map((row, i) => (
          <div
            key={row.display_name}
            className="grid grid-cols-[34px_1fr_52px_56px] items-baseline px-3.5 py-[11px] text-[14px]"
          >
            <span className="num text-[16px] font-semibold">{i + 1}</span>
            <span className="truncate font-semibold">{row.display_name}</span>
            <span className="num text-right">{row.games}</span>
            <span className="num text-right text-[17px] font-semibold text-blue">{row.average}</span>
          </div>
        ))}
      </Strip>

      <button
        type="button"
        onClick={() => join.mutate()}
        disabled={join.isPending}
        className="btn-primary w-full"
      >
        {join.isPending ? 'Joining…' : `Join ${p.name}`}
      </button>
      {join.isError && (
        <p className="text-center text-[13px] text-red" role="alert">
          That didn’t go through. Check your connection and try again.
        </p>
      )}
      <p className="text-center text-[13px] text-ink-faded">
        You’re on the leaderboard from your first game with the group.
      </p>
    </div>
  );
}
