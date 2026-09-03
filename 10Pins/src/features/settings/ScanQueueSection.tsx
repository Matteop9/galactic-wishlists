import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Strip, { StripTitle } from '../../components/Strip';
import { processScanQueue, removeQueuedScan, type QueuedScan } from '../../lib/scanQueue';
import { deleteScanPhoto } from '../../lib/capture';
import { useScanQueue } from '../../lib/useScanQueue';
import type { Profile } from '../../lib/auth';

const STATUS_LABEL: Record<QueuedScan['status'], string> = {
  queued: 'Waiting for a connection',
  ready: 'Ready to review',
  failed: 'Couldn’t read it',
};

function queuedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * The offline scan queue, visible where the design puts it (Offline: "queue
 * list in Profile"). Framed as normal behaviour: a queued scan is a job in
 * hand, not a failure.
 */
export default function ScanQueueSection({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  // The shell already drains the queue on mount, on `online` and on focus;
  // this section only needs the contents and a manual retry.
  const { items, summary } = useScanQueue();

  const drain = useMutation({
    mutationFn: () => processScanQueue(profile.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scan-queue'] }),
  });

  if (items.length === 0) return null;

  return (
    <Strip as="section">
      <StripTitle right={summary.line || undefined}>Scans waiting</StripTitle>

      {items.map((item) => (
        <div key={item.id} className="rise-in flex items-center gap-3 px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">
              Scan from <span className="num">{queuedAt(item.queuedAt)}</span>
            </p>
            <p className="text-[13px] text-ink-faded">
              {STATUS_LABEL[item.status]}
              {item.status === 'failed' && item.error === 'daily_cap' && ', daily limit reached'}
            </p>
          </div>
          {item.status === 'ready' && (
            <Link to={`/add/scan?queued=${item.id}`} className="btn-primary-sm shrink-0">
              Review
            </Link>
          )}
          {item.status === 'queued' && (
            <button
              type="button"
              onClick={() => drain.mutate()}
              disabled={drain.isPending}
              className="btn-secondary-sm shrink-0"
            >
              {drain.isPending ? 'Trying…' : 'Try now'}
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              if (item.photoPath) await deleteScanPhoto(item.photoPath);
              await removeQueuedScan(item.id);
              queryClient.invalidateQueries({ queryKey: ['scan-queue'] });
            }}
            className="btn-danger-text shrink-0"
          >
            {item.status === 'ready' ? 'Discard' : 'Remove'}
          </button>
        </div>
      ))}
    </Strip>
  );
}
