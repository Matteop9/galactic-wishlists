import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { processScanQueue, removeQueuedScan, type QueuedScan } from '../../lib/scanQueue';
import { deleteScanPhoto } from '../../lib/capture';
import { useScanQueue } from '../../lib/useScanQueue';
import type { Profile } from '../../lib/auth';

const STATUS_LABEL: Record<QueuedScan['status'], string> = {
  queued: 'Waiting for signal',
  ready: 'Ready to review',
  failed: "Couldn't read it",
};

/**
 * The offline scan queue, visible where the design puts it (§Offline: "queue
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
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className="label-caps">Scan queue</span>
        {summary.line && <span className="text-[12px] text-dim">{summary.line}</span>}
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          className="rise-in flex items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2.5"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-text">
              {STATUS_LABEL[item.status]}
              {item.status === 'failed' && item.error === 'daily_cap' && ' · daily limit'}
            </p>
            <p className="text-[11.5px] text-faint">
              {new Date(item.queuedAt).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          {item.status === 'ready' && (
            <Link
              to={`/add/scan?queued=${item.id}`}
              className="press rounded-lg bg-phosphor px-3 py-1.5 text-[12.5px] font-bold text-ink"
            >
              Review
            </Link>
          )}
          {item.status === 'queued' && (
            <button
              type="button"
              onClick={() => drain.mutate()}
              disabled={drain.isPending}
              className="press rounded-lg border border-line bg-well px-3 py-1.5 text-[12.5px] text-dim"
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
            className="text-[12px] text-signal"
          >
            {item.status === 'ready' ? 'Discard' : 'Remove'}
          </button>
        </div>
      ))}
    </section>
  );
}
