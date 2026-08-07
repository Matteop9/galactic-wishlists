import { describe, it, expect } from 'vitest';
import { scoreTable, scorerBonus, scoreLeague, withRanks, normaliseName, namesMatch } from '../scoring';
import type { ApiTableRow, ApiScorer } from '../types';
import fixture from './fixtures/excel-2025-26.json';

function tableRow(teamId: number, position: number): ApiTableRow {
  return {
    position,
    team: { id: teamId, name: `Team ${teamId}`, shortName: `T${teamId}`, tla: 'TTT', crest: '' },
    playedGames: 38,
    won: 0,
    draw: 0,
    lost: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
  };
}

function scorer(id: number, name: string, goals: number): ApiScorer {
  return {
    player: { id, name },
    team: { id: 1, name: '', shortName: '', tla: '', crest: '' },
    goals,
    assists: null,
    playedMatches: 0,
  };
}

describe('scoreTable', () => {
  it('scores |predicted - actual| per team', () => {
    // predicted: 1,2,3 — actual: 1st→3rd, 2nd→1st, 3rd→2nd
    const actual = [tableRow(10, 3), tableRow(20, 1), tableRow(30, 2)];
    const result = scoreTable([10, 20, 30], actual);
    expect(result.rows.map((r) => r.diff)).toEqual([2, 1, 1]);
    expect(result.total).toBe(4);
  });

  it('perfect prediction scores zero', () => {
    const actual = [tableRow(1, 1), tableRow(2, 2)];
    expect(scoreTable([1, 2], actual).total).toBe(0);
  });

  it('uses the API position field, not array order', () => {
    // actual table arrives shuffled
    const actual = [tableRow(2, 2), tableRow(1, 1)];
    expect(scoreTable([1, 2], actual).total).toBe(0);
  });

  it('team missing from actual table contributes 0 with null actualPos', () => {
    const actual = [tableRow(1, 1)];
    const result = scoreTable([1, 99], actual);
    expect(result.total).toBe(0);
    expect(result.rows[1].actualPos).toBeNull();
  });
});

describe('scorerBonus', () => {
  const scorers = [scorer(1, 'Erling Haaland', 27), scorer(2, 'Mohamed Salah', 27), scorer(3, 'Ollie Watkins', 20)];

  it('awards -5 for the top scorer', () => {
    const r = scorerBonus({ playerId: 1, playerName: 'Erling Haaland' }, scorers);
    expect(r.hit).toBe(true);
    expect(r.bonus).toBe(-5);
  });

  it('joint top scorers both count as #1', () => {
    const r = scorerBonus({ playerId: 2, playerName: 'Mohamed Salah' }, scorers);
    expect(r.hit).toBe(true);
    expect(r.topScorers).toEqual(['Erling Haaland', 'Mohamed Salah']);
  });

  it('non-top pick gets 0 with correct rank', () => {
    const r = scorerBonus({ playerId: 3, playerName: 'Ollie Watkins' }, scorers);
    expect(r.hit).toBe(false);
    expect(r.bonus).toBe(0);
    expect(r.pickRank).toBe(3); // two players with strictly more goals
  });

  it('matches by name when no playerId (diacritics + partial)', () => {
    const withAccents = [scorer(9, 'Kylian Mbappé', 30)];
    expect(scorerBonus({ playerName: 'mbappe' }, withAccents).hit).toBe(true);
    expect(scorerBonus({ playerName: 'Haaland' }, scorers).hit).toBe(true);
  });

  it('unranked pick and empty chart are safe', () => {
    expect(scorerBonus({ playerName: 'Nobody' }, scorers).pickRank).toBeNull();
    expect(scorerBonus(null, scorers).bonus).toBe(0);
    expect(scorerBonus({ playerName: 'x' }, []).bonus).toBe(0);
  });
});

describe('name helpers', () => {
  it('normalises diacritics and case', () => {
    expect(normaliseName('Kylian Mbappé')).toBe('kylian mbappe');
  });
  it('substring matches either direction', () => {
    expect(namesMatch('Haaland', 'Erling Haaland')).toBe(true);
    expect(namesMatch('Erling Braut Haaland', 'Haaland')).toBe(true);
    expect(namesMatch('', 'anything')).toBe(false);
  });
});

describe('withRanks', () => {
  it('assigns joint positions on equal totals', () => {
    const rows = [
      { total: 100, complete: true },
      { total: 105, complete: true },
      { total: 105, complete: true },
      { total: 110, complete: true },
    ];
    expect(withRanks(rows).map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });
});

// ---- Golden test: recompute last season's real game from the Excel ----
// Standings.xlsx Output sheet totals: Will 197, Dom 211, Luke 218, Matteo 219

describe('golden test — 2025-26 Excel game', () => {
  // build synthetic team ids from shortNames
  const idByName = new Map<string, number>();
  let nextId = 1;
  const idFor = (name: string) => {
    if (!idByName.has(name)) idByName.set(name, nextId++);
    return idByName.get(name)!;
  };

  const pTable: ApiTableRow[] = fixture.p_table.map((r) => tableRow(idFor(r.shortName), r.position));
  const cTable: ApiTableRow[] = fixture.c_table.map((r) => tableRow(idFor(r.shortName), r.position));
  const pScorers: ApiScorer[] = fixture.p_scorers.map((s, i) => scorer(100 + i, s.name, s.goals));
  const cScorers: ApiScorer[] = fixture.c_scorers.map((s, i) => scorer(200 + i, s.name, s.goals));

  const members = Object.entries(fixture.predictions).map(([name, p]) => ({
    userId: name,
    competitions: {
      '2021': {
        ranking: p.prem.map((t) => idFor(t!)),
        scorer: { playerName: p.pScorer! },
      },
      '2016': {
        ranking: p.champ.map((t) => idFor(t!)),
        scorer: { playerName: p.cScorer! },
      },
    },
  }));

  it('reproduces the exact final totals from the spreadsheet', () => {
    const results = scoreLeague(
      [2021, 2016],
      members,
      { '2021': pTable, '2016': cTable },
      { '2021': pScorers, '2016': cScorers },
    );
    const totals = Object.fromEntries(results.map((r) => [r.userId, r.total]));
    expect(totals).toEqual(fixture.expected_totals);
  });

  it('orders the leaderboard lowest-first: Will, Dom, Luke, Matteo', () => {
    const results = scoreLeague(
      [2021, 2016],
      members,
      { '2021': pTable, '2016': cTable },
      { '2021': pScorers, '2016': cScorers },
    );
    expect(results.map((r) => r.userId)).toEqual(['Will', 'Dom', 'Luke', 'Matteo']);
  });
});
