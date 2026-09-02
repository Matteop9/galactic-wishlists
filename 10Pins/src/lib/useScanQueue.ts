import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listQueuedScans, processScanQueue, summariseQueue } from './scanQueue';

/**
 * Keeps the offline scan queue moving wherever you are in the app: on mount,
 * when the signal comes back, and when the app regains focus. Mounted once in
 * the shell — a scan taken at the lane finishes itself without anyone having
 * to go and find it.
 */
export function useScanQueueDrain(profileId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let running = false;
    let cancelled = false;

    const run = async () => {
      if (running || !navigator.onLine) return;
      running = true;
      try {
        const { processed } = await processScanQueue(profileId);
        if (!cancelled && processed > 0) {
          queryClient.invalidateQueries({ queryKey: ['scan-queue'] });
        }
      } catch {
        /* the queue keeps what it has; the next trigger tries again */
      } finally {
        running = false;
      }
    };

    run();
    window.addEventListener('online', run);
    window.addEventListener('focus', run);
    return () => {
      cancelled = true;
      window.removeEventListener('online', run);
      window.removeEventListener('focus', run);
    };
  }, [profileId, queryClient]);
}

/** The queue as the UI reads it. */
export function useScanQueue() {
  const queue = useQuery({ queryKey: ['scan-queue'], queryFn: listQueuedScans });
  const items = queue.data ?? [];
  return { items, summary: summariseQueue(items), firstReady: items.find((i) => i.status === 'ready') ?? null };
}
