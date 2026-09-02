import { describe, expect, it } from 'vitest';
import { friendState, meetingOutcome, recentForm, recordLine, type Meeting } from './players';

function meeting(my: number | null, their: number | null): Meeting {
  return {
    game_id: 'g',
    played_at: '2026-01-01T00:00:00Z',
    verification_status: 'unverified',
    venue_name: null,
    my_score: my,
    their_score: their,
  };
}

describe('recordLine', () => {
  it('formats wins–losses with an en dash', () => {
    expect(recordLine({ wins: 7, losses: 3, ties: 0 })).toBe('7–3');
  });

  it('appends a singular tie note', () => {
    expect(recordLine({ wins: 5, losses: 2, ties: 1 })).toBe('5–2 · 1 tie');
  });

  it('appends a plural ties note', () => {
    expect(recordLine({ wins: 5, losses: 2, ties: 2 })).toBe('5–2 · 2 ties');
  });
});

describe('meetingOutcome', () => {
  it('is won when my score is higher', () => {
    expect(meetingOutcome(180, 150)).toBe('won');
  });

  it('is lost when my score is lower', () => {
    expect(meetingOutcome(150, 180)).toBe('lost');
  });

  it('is tied on equal scores', () => {
    expect(meetingOutcome(150, 150)).toBe('tied');
  });

  it('is tied when either score is missing', () => {
    expect(meetingOutcome(null, 150)).toBe('tied');
    expect(meetingOutcome(150, null)).toBe('tied');
  });
});

describe('recentForm', () => {
  it('is empty with no meetings', () => {
    expect(recentForm([], 'Dave')).toBe('');
  });

  it('reports a leading win streak of 2+', () => {
    const meetings = [meeting(200, 150), meeting(190, 170), meeting(120, 200)];
    expect(recentForm(meetings, 'Dave')).toBe('You’ve won the last 2');
  });

  it('reports the other side\'s streak by name', () => {
    const meetings = [meeting(150, 200), meeting(140, 210), meeting(140, 210), meeting(200, 150)];
    expect(recentForm(meetings, 'Dave')).toBe('Dave has won the last 3');
  });

  it('falls back to a ratio when the leading streak is a single game', () => {
    // Most recent is a win, but the one before it was a loss — streak length 1.
    const meetings = [meeting(200, 150), meeting(150, 200), meeting(210, 140), meeting(220, 130)];
    expect(recentForm(meetings, 'Dave')).toBe('You’ve won 3 of the last 4');
  });

  it('falls back to a ratio when the most recent game was a tie', () => {
    const meetings = [meeting(150, 150), meeting(200, 150), meeting(190, 160)];
    expect(recentForm(meetings, 'Dave')).toBe('You’ve won 2 of the last 3');
  });

  it('names the other side in the ratio when they lead it', () => {
    const meetings = [meeting(150, 150), meeting(140, 200), meeting(150, 210)];
    expect(recentForm(meetings, 'Dave')).toBe('Dave has won 2 of the last 3');
  });

  it('handles a single meeting deterministically', () => {
    expect(recentForm([meeting(200, 150)], 'Dave')).toBe('You’ve won 1 of the last 1');
  });

  it('returns empty when the ratio window is evenly split', () => {
    const meetings = [meeting(150, 150), meeting(200, 150), meeting(150, 200)];
    expect(recentForm(meetings, 'Dave')).toBe('');
  });

  it('only reads up to the last 5 games for the ratio window', () => {
    const meetings = [
      meeting(150, 200), // loss (breaks any lead streak)
      meeting(200, 150),
      meeting(200, 150),
      meeting(200, 150),
      meeting(200, 150),
      meeting(200, 150), // outside the 5-game window, must not count
    ];
    expect(recentForm(meetings, 'Dave')).toBe('You’ve won 4 of the last 5');
  });
});

describe('friendState', () => {
  const rows = [
    { requester: 'me', addressee: 'a', status: 'accepted' },
    { requester: 'b', addressee: 'me', status: 'pending' },
    { requester: 'me', addressee: 'c', status: 'pending' },
  ];

  it('is friend when accepted, regardless of direction', () => {
    expect(friendState(rows, 'me', 'a')).toBe('friend');
  });

  it('is incoming when they requested and it is still pending', () => {
    expect(friendState(rows, 'me', 'b')).toBe('incoming');
  });

  it('is outgoing when I requested and it is still pending', () => {
    expect(friendState(rows, 'me', 'c')).toBe('outgoing');
  });

  it('is none when there is no row at all', () => {
    expect(friendState(rows, 'me', 'stranger')).toBe('none');
  });
});
