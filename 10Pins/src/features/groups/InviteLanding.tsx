import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInvitePreview, joinGroup } from '../../lib/groups';
import { PreviewSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';

/** /join/:code — shown post-auth (the route lives inside the Shell). */
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
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <h1 className="font-display text-[20px] font-bold">Invite not found</h1>
        <p className="max-w-[260px] text-[13.5px] text-dim">
          That invite link doesn’t work — ask for a fresh one from the group.
        </p>
      </div>
    );
  }

  const p = preview.data;

  return (
    <div className="flex flex-col gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="label-caps">You’re invited to</span>
        <h1 className="font-display text-[24px] font-bold">{p.name}</h1>
        <p className="text-[13.5px] text-dim">
          {p.member_count} {p.member_count === 1 ? 'member' : 'members'}
          {p.season_name ? ` · ${p.season_name}` : ''}
        </p>
      </div>

      {p.top3.length > 0 && (
        <div className="flex flex-col gap-2 rounded-card border border-line bg-panel p-4">
          <span className="label-caps">Top of the table</span>
          {p.top3.map((row, i) => (
            <div key={row.display_name} className="flex items-center gap-3">
              <span className="score-text w-5 text-[14px] font-bold text-dim">{i + 1}</span>
              <span className="flex-1 truncate text-[14px] text-text">{row.display_name}</span>
              <span className="text-[11px] text-faint">
                {row.games} {row.games === 1 ? 'game' : 'games'}
              </span>
              <span className="score-text text-[15px] font-bold text-text">{row.average}</span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => join.mutate()}
        disabled={join.isPending}
        className="btn-primary"
      >
        {join.isPending ? 'Joining…' : 'Join the group'}
      </button>
      {join.isError && (
        <p className="text-center text-[13px] text-signal" role="alert">
          Couldn’t join — try again.
        </p>
      )}
    </div>
  );
}
