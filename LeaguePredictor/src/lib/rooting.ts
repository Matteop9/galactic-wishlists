// Pure "who do I cheer for" logic — zero I/O, unit-tested like scoring.ts.
//
// For each team in a fixture, compare where I predicted them with where they sit now:
// predicted higher than now → I need them to climb → I want the win;
// predicted lower than now → I need them to drop → I want the defeat;
// exactly where I put them → hold — a quiet draw keeps my table intact.

export type Want = 'up' | 'down' | 'hold';

export type Stake = {
  want: Want;
  places: number; // distance from the predicted slot, always >= 0
  predictedPos: number;
  currentPos: number;
};

export function stakeFor(
  teamId: number,
  predictedPosByTeam: Map<number, number>,
  currentPosByTeam: Map<number, number>,
): Stake | null {
  const predictedPos = predictedPosByTeam.get(teamId);
  const currentPos = currentPosByTeam.get(teamId);
  if (predictedPos === undefined || currentPos === undefined) return null;
  const delta = currentPos - predictedPos; // positive → they sit below where I want them
  return {
    want: delta > 0 ? 'up' : delta < 0 ? 'down' : 'hold',
    places: Math.abs(delta),
    predictedPos,
    currentPos,
  };
}

export type Verdict =
  | { kind: 'home' | 'away' } // cheer for that side (or against the other)
  | { kind: 'draw' } // both need to drop — a draw hands out the fewest points
  | { kind: 'either' } // everything is where I put it — no result hurts
  | { kind: 'torn'; lean: 'home' | 'away' | null } // both need to climb
  | { kind: 'none' }; // no stake in either team

export function fixtureVerdict(home: Stake | null, away: Stake | null): Verdict {
  if (!home && !away) return { kind: 'none' };
  let pref = 0;
  if (home?.want === 'up') pref++;
  if (home?.want === 'down') pref--;
  if (away?.want === 'up') pref--;
  if (away?.want === 'down') pref++;
  if (pref > 0) return { kind: 'home' };
  if (pref < 0) return { kind: 'away' };
  if (home?.want === 'up' && away?.want === 'up') {
    // Both need to climb — lean towards whoever has further to go.
    const lean = home.places > away.places ? 'home' : away.places > home.places ? 'away' : null;
    return { kind: 'torn', lean };
  }
  if (home?.want === 'down' && away?.want === 'down') return { kind: 'draw' };
  return { kind: 'either' };
}
