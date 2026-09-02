import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchLivePreview, joinLiveSession } from '../../lib/live';
import { PreviewSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';

/**
 * Live session · join. The link a scorer shares: who is bowling, where, and
 * one tap to watch it live.
 */
export default function LiveJoin() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const preview = useQuery({
    queryKey: ['live-preview', code],
    queryFn: () => fetchLivePreview(code!),
    enabled: !!code,
  });
  const showSkeleton = useSkeleton(preview.isPending);

  const join = useMutation({
    mutationFn: () => joinLiveSession(code!),
    onSuccess: (sessionId) => navigate(`/live/${sessionId}/watch`, { replace: true }),
    onError: () => setError("Couldn’t join — check the link and try again."),
  });

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6">
        <PreviewSkeleton label="Looking up the lane" />
      </div>
    );
  }
  if (preview.isPending) return <div className="px-4 py-6" />;

  const data = preview.data;
  if (preview.isError || !data?.session_id) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <h1 className="font-display text-[20px] font-bold">Link not found</h1>
        <p className="max-w-[260px] text-[13.5px] text-dim">
          That live session has finished or the code is wrong.
        </p>
        <Link to="/" className="text-[13.5px] text-phosphor">
          Back home
        </Link>
      </div>
    );
  }

  const finished = data.status !== 'active';

  return (
    <div className="flex flex-col gap-5 px-4 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex items-center gap-2 label-caps text-signal">
          <span className="size-2 live-dot rounded-full bg-signal" aria-hidden />
          {finished ? 'Finished' : 'Bowling now'}
        </span>
        <h1 className="font-display text-[24px] font-bold">{data.host} is bowling</h1>
        <p className="text-[13.5px] text-dim">
          {[data.venue, data.group_name].filter(Boolean).join(' · ') || 'Live scoring'}
        </p>
      </div>

      {data.players.length > 0 && (
        <div className="flex flex-col gap-2 rounded-card border border-line bg-panel p-4">
          <span className="label-caps">On the lane</span>
          <p className="text-[14px] text-text">{data.players.join(' · ')}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setError('');
          join.mutate();
        }}
        disabled={join.isPending}
        className="btn-primary"
      >
        {join.isPending ? 'Joining…' : finished ? 'See how it went' : 'Watch live'}
      </button>
      {error && <p className="text-center text-[13.5px] text-signal">{error}</p>}
      <Link to="/" className="text-center text-[13.5px] text-dim">
        Not now
      </Link>
    </div>
  );
}
