// football-data.org free-tier domestic leagues that produce a single final table.
// (Champions League / Euros / World Cup excluded — no single 1..N final table.)

export type Competition = {
  id: number;
  code: string;
  name: string;
  country: string;
  flag: string;
};

export const COMPETITIONS: Competition[] = [
  { id: 2021, code: 'PL', name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 2016, code: 'ELC', name: 'Championship', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 2014, code: 'PD', name: 'La Liga', country: 'Spain', flag: '🇪🇸' },
  { id: 2002, code: 'BL1', name: 'Bundesliga', country: 'Germany', flag: '🇩🇪' },
  { id: 2019, code: 'SA', name: 'Serie A', country: 'Italy', flag: '🇮🇹' },
  { id: 2015, code: 'FL1', name: 'Ligue 1', country: 'France', flag: '🇫🇷' },
  { id: 2003, code: 'DED', name: 'Eredivisie', country: 'Netherlands', flag: '🇳🇱' },
  { id: 2017, code: 'PPL', name: 'Primeira Liga', country: 'Portugal', flag: '🇵🇹' },
  { id: 2013, code: 'BSA', name: 'Série A', country: 'Brazil', flag: '🇧🇷' },
];

export const DEFAULT_COMPETITION_IDS = [2021, 2016];

export function competitionById(id: number): Competition | undefined {
  return COMPETITIONS.find((c) => c.id === id);
}

export function competitionName(id: number): string {
  return competitionById(id)?.name ?? `Competition ${id}`;
}
