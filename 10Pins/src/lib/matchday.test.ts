import { describe, expect, it } from 'vitest';
import { legScores, seriesState, type LegGame, type MdPlayer, type MdTeam } from './matchday';

const teams: MdTeam[] = [
  { id: 'A', name: 'Strikers', team_order: 0 },
  { id: 'B', name: 'Spares', team_order: 1 },
];

function player(
  id: string,
  teamId: string,
  pairingOrder: number,
  handicap: number,
  profileId: string | null = id,
  guestName: string | null = null,
): MdPlayer {
  return {
    id,
    team_id: teamId,
    profile_id: profileId,
    guest_name: guestName,
    pairing_order: pairingOrder,
    handicap,
    display_name: id,
  };
}

const players: MdPlayer[] = [
  player('a1', 'A', 0, 20),
  player('a2', 'A', 1, 0),
  player('b1', 'B', 0, 45),
  player('b2', 'B', 1, 10),
];

function leg(gameNumber: number, scores: Record<string, number | null>): LegGame {
  return {
    gameNumber,
    gameId: `g${gameNumber}`,
    players: Object.entries(scores).map(([pid, final_score]) => ({
      profile_id: pid,
      guest_name: null,
      final_score,
    })),
  };
}

describe('legScores — total pins', () => {
  it('adds handicaps and picks the higher team total', () => {
    const result = legScores('total_pins', teams, players, leg(1, { a1: 150, a2: 180, b1: 120, b2: 160 }));
    // A: 150+20 + 180+0 = 350 · B: 120+45 + 160+10 = 335
    expect(result.teams[0].handicapTotal).toBe(350);
    expect(result.teams[1].handicapTotal).toBe(335);
    expect(result.teams[0].scratchTotal).toBe(330);
    expect(result.complete).toBe(true);
    expect(result.winnerTeamId).toBe('A');
  });

  it('handicap can flip the scratch result', () => {
    const result = legScores('total_pins', teams, players, leg(1, { a1: 150, a2: 150, b1: 130, b2: 140 }));
    // scratch: A 300, B 270 — but with handicaps A 320, B 325
    expect(result.winnerTeamId).toBe('B');
  });

  it('a drawn leg counts for nobody', () => {
    const result = legScores('total_pins', teams, players, leg(1, { a1: 150, a2: 155, b1: 130, b2: 140 }));
    // A 325, B 325
    expect(result.winnerTeamId).toBeNull();
    expect(result.complete).toBe(true);
  });

  it('an unfinished leg is incomplete and has no winner', () => {
    const result = legScores('total_pins', teams, players, leg(1, { a1: 150, a2: 180, b1: 120, b2: null }));
    expect(result.complete).toBe(false);
    expect(result.winnerTeamId).toBeNull();
  });

  it('matches guests case-insensitively', () => {
    const withGuest = [...players.slice(0, 3), player('bg', 'B', 1, 0, null, 'Jen')];
    const result = legScores('total_pins', teams, withGuest, {
      gameNumber: 1,
      gameId: 'g1',
      players: [
        { profile_id: 'a1', guest_name: null, final_score: 150 },
        { profile_id: 'a2', guest_name: null, final_score: 180 },
        { profile_id: 'b1', guest_name: null, final_score: 120 },
        { profile_id: null, guest_name: 'JEN', final_score: 190 },
      ],
    });
    expect(result.complete).toBe(true);
    expect(result.teams[1].scratchTotal).toBe(310);
  });
});

describe('legScores — points (head-to-head pairings)', () => {
  it('scores pairings by pairing order plus a team-total point', () => {
    const result = legScores('points', teams, players, leg(1, { a1: 150, a2: 180, b1: 120, b2: 160 }));
    // pairing 0: a1 170 v b1 165 → A · pairing 1: a2 180 v b2 170 → A
    // team totals: A 350 v B 335 → A. A 3 points, B 0.
    expect(result.teams[0].points).toBe(3);
    expect(result.teams[1].points).toBe(0);
    expect(result.winnerTeamId).toBe('A');
  });

  it('splits a tied pairing half each', () => {
    const result = legScores('points', teams, players, leg(1, { a1: 145, a2: 180, b1: 120, b2: 160 }));
    // pairing 0: a1 165 v b1 165 → ½ each · pairing 1: A → 1
    // totals: A 345 v B 335 → A. A 2.5, B 0.5.
    expect(result.teams[0].points).toBe(2.5);
    expect(result.teams[1].points).toBe(0.5);
  });

  it('supports three teams round-robin', () => {
    const threeTeams: MdTeam[] = [...teams, { id: 'C', name: 'Curves', team_order: 2 }];
    const threePlayers = [
      player('a1', 'A', 0, 0),
      player('b1', 'B', 0, 0),
      player('c1', 'C', 0, 0),
    ];
    const result = legScores('points', threeTeams, threePlayers, leg(1, { a1: 200, b1: 150, c1: 100 }));
    // Each pair: pairing point + total point (same single player) →
    // A beats B (2), A beats C (2), B beats C (2). A 4, B 2, C 0.
    expect(result.teams.map((t) => t.points)).toEqual([4, 2, 0]);
    expect(result.winnerTeamId).toBe('A');
  });

  it('skips unpaired players when team sizes differ', () => {
    const uneven = [...players, player('a3', 'A', 2, 0)];
    const result = legScores('points', teams, uneven, leg(1, { a1: 150, a2: 180, a3: 200, b1: 120, b2: 160 }));
    // a3 has no counterpart: only 2 pairings + team total are scored, but
    // a3's pins still count in the team total.
    expect(result.pairings).toHaveLength(2);
    expect(result.teams[0].handicapTotal).toBe(550);
  });
});

describe('seriesState', () => {
  const l = (n: number, winner: string | null): ReturnType<typeof legScores> =>
    ({
      gameNumber: n,
      gameId: `g${n}`,
      teams: [],
      complete: true,
      winnerTeamId: winner,
      pairings: [],
    });

  it('tracks legs won and stays undecided mid-series', () => {
    const s = seriesState(3, teams, [l(1, 'A')]);
    expect(s.legsWon).toEqual({ A: 1, B: 0 });
    expect(s.decided).toBe(false);
    expect(s.winnerTeamId).toBeNull();
  });

  it('clinches a best-of-three at 2–0', () => {
    const s = seriesState(3, teams, [l(1, 'A'), l(2, 'A')]);
    expect(s.decided).toBe(true);
    expect(s.winnerTeamId).toBe('A');
  });

  it('goes the distance at 1–1', () => {
    const s = seriesState(3, teams, [l(1, 'A'), l(2, 'B')]);
    expect(s.decided).toBe(false);
    const final = seriesState(3, teams, [l(1, 'A'), l(2, 'B'), l(3, 'B')]);
    expect(final.decided).toBe(true);
    expect(final.winnerTeamId).toBe('B');
  });

  it('a fully drawn series is decided with no winner', () => {
    const s = seriesState(3, teams, [l(1, 'A'), l(2, 'B'), l(3, null)]);
    expect(s.decided).toBe(true);
    expect(s.winnerTeamId).toBeNull();
    expect(s.drawn).toBe(true);
  });

  it('incomplete legs do not count', () => {
    const partial = { ...l(2, null), complete: false };
    const s = seriesState(3, teams, [l(1, 'A'), partial]);
    expect(s.legsCompleted).toBe(1);
    expect(s.decided).toBe(false);
  });

  it('best-of-five clinch maths holds for three teams', () => {
    const threeTeams: MdTeam[] = [...teams, { id: 'C', name: 'Curves', team_order: 2 }];
    // A has 3 of 4 played; B and C can reach at most 1 + 1 remaining = 2
    const s = seriesState(5, threeTeams, [l(1, 'A'), l(2, 'A'), l(3, 'B'), l(4, 'A')]);
    expect(s.decided).toBe(true);
    expect(s.winnerTeamId).toBe('A');
  });
});
