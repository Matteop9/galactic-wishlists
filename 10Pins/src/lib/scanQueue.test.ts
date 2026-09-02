import { describe, expect, it } from 'vitest';
import { summariseQueue, type QueuedScan } from './scanQueue';

function item(status: QueuedScan['status'], id = crypto.randomUUID()): QueuedScan {
  return {
    id,
    status,
    blob: new Blob(),
    queuedAt: '2026-09-02T20:00:00.000Z',
    playedAt: '2026-09-02T20:00:00.000Z',
    groupId: null,
    venueName: null,
  };
}

describe('summariseQueue', () => {
  it('says nothing when the queue is empty', () => {
    expect(summariseQueue([])).toEqual({ waiting: 0, ready: 0, failed: 0, line: null });
  });

  it('leads with scans that need a human', () => {
    const summary = summariseQueue([item('queued'), item('ready'), item('failed')]);
    expect(summary).toMatchObject({ waiting: 1, ready: 1, failed: 1 });
    expect(summary.line).toBe('1 scan ready to review');
  });

  it('falls back to what is still waiting for signal', () => {
    expect(summariseQueue([item('queued'), item('queued')]).line).toBe('2 scans waiting for signal');
  });

  it('mentions unreadable scans only when nothing else is pending', () => {
    expect(summariseQueue([item('failed')]).line).toBe("1 scan we couldn’t read");
    expect(summariseQueue([item('failed'), item('failed')]).line).toBe("2 scans we couldn’t read");
  });

  it('counts one scan in the singular', () => {
    expect(summariseQueue([item('ready')]).line).toBe('1 scan ready to review');
    expect(summariseQueue([item('queued')]).line).toBe('1 scan waiting for signal');
  });
});
