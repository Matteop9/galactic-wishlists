import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { GAME_EVENT, ROLL_EVENT } from '../../lib/live';
import type { RollEvent } from '../../lib/liveState';
import { supabase } from '../../lib/supabase';

export type ChannelStatus = 'connecting' | 'live' | 'offline';

export interface GameEvent {
  gameId: string;
  gameNumber: number;
}

/**
 * One Realtime channel per session (spec §8): broadcast carries roll events at
 * keypad speed, presence drives the "N watching" count. `frames` stays the
 * durable record — onSubscribed fires on every (re)connect so the caller can
 * refetch and catch up on anything it missed while away.
 */
export function useLiveChannel(
  sessionId: string | undefined,
  opts: {
    role: 'scorer' | 'viewer';
    presenceKey: string;
    onRoll?: (event: RollEvent) => void;
    onGame?: (event: GameEvent) => void;
    onSubscribed?: () => void;
  },
) {
  const [status, setStatus] = useState<ChannelStatus>('connecting');
  const [watching, setWatching] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Handlers change every render; the subscription must not.
  const handlers = useRef(opts);
  handlers.current = opts;

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase.channel(`live:${sessionId}`, {
      config: { broadcast: { self: false }, presence: { key: opts.presenceKey } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: ROLL_EVENT }, ({ payload }) =>
        handlers.current.onRoll?.(payload as RollEvent),
      )
      .on('broadcast', { event: GAME_EVENT }, ({ payload }) =>
        handlers.current.onGame?.(payload as GameEvent),
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ role?: string }>();
        setWatching(
          Object.values(state).filter((entries) => entries.some((e) => e.role === 'viewer')).length,
        );
      })
      .subscribe((channelStatus) => {
        if (channelStatus === 'SUBSCRIBED') {
          setStatus('live');
          void channel.track({ role: handlers.current.role });
          handlers.current.onSubscribed?.();
        } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          setStatus('offline');
        }
      });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
    // presenceKey/role are per-session constants; handlers live in the ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  function broadcast(event: typeof ROLL_EVENT | typeof GAME_EVENT, payload: unknown) {
    void channelRef.current?.send({ type: 'broadcast', event, payload });
  }

  return { status, watching, broadcast };
}
