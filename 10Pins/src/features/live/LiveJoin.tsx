import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import EmptyState from '../../components/EmptyState';
import Strip from '../../components/Strip';
import Wordmark from '../../components/Wordmark';
import { fetchLivePreview, joinLiveSession } from '../../lib/live';
import { PreviewSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';

const COLUMN = 'mx-auto flex min-h-dvh w-full max-w-[390px] flex-col justify-center gap-6 px-5 py-12';

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
    onError: () => setError('That didn’t join. Check the link and try again.'),
  });

  if (showSkeleton) {
    return (
      <div className={COLUMN}>
        <Wordmark size="sm" />
        <PreviewSkeleton label="Looking up the lane" />
      </div>
    );
  }
  if (preview.isPending) return <div className={COLUMN} />;

  const data = preview.data;
  if (preview.isError || !data?.session_id) {
    return (
      <div className={COLUMN}>
        <Wordmark size="sm" />
        <EmptyState
          title="Link not found"
          body="That live session has finished or the code is wrong."
          action={{ label: 'Back home', to: '/' }}
        />
      </div>
    );
  }

  const finished = data.status !== 'active';
  const where = [data.venue, data.group_name].filter(Boolean).join(' · ');

  return (
    <div className={COLUMN}>
      <Wordmark size="sm" />

      <Strip as="section">
        <div className="flex flex-col gap-1 px-3.5 py-3">
          <p className="text-[13px]">
            {finished ? (
              <span className="font-semibold text-ink-faded">Finished</span>
            ) : (
              <span className="font-semibold text-red">Live</span>
            )}
          </p>
          <h1 className="num text-[22px] font-semibold leading-tight">{data.host} is bowling</h1>
          <p className="text-[13px] text-ink-faded">{where || 'Scored live'}</p>
        </div>
        {data.players.length > 0 && (
          <div className="px-3.5 py-2.5">
            <span className="label">On the lane</span>
          </div>
        )}
        {data.players.map((name, i) => (
          <div key={`${name}-${i}`} className="flex items-baseline gap-3 px-3.5 py-[11px]">
            <span className="num w-5 shrink-0 text-[15px] text-ink-faded">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-[15px]">{name}</span>
          </div>
        ))}
      </Strip>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            setError('');
            join.mutate();
          }}
          disabled={join.isPending}
          className="btn-primary"
        >
          {join.isPending ? 'Joining' : finished ? 'See how it went' : 'Watch live'}
        </button>
        <p className="text-center text-[13px] text-ink-faded">
          {finished
            ? 'The game is over, but the scoresheet is still there to read.'
            : 'Scores update on your phone as they are bowled.'}
        </p>
        {error && <p className="text-center text-[13px] text-red">{error}</p>}
        <Link to="/" className="press self-center text-[13px] font-semibold text-blue">
          Not now
        </Link>
      </div>
    </div>
  );
}
