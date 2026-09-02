import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchGroup } from '../../lib/groups';
import { defaultHandicap } from '../../lib/handicap';
import { createMatchDay, fetchAverages, type ScoringMode } from '../../lib/matchday';
import { fetchVenueNames } from '../../lib/games';
import { FormSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

interface DraftPlayer {
  key: string;
  profile_id: string | null;
  guest_name: string | null;
  display_name: string;
  handicap: number;
  handicapTouched: boolean;
}

interface DraftTeam {
  name: string;
  players: DraftPlayer[];
}

export default function MatchDaySetup({ profile }: { profile: Profile }) {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const group = useQuery({ queryKey: ['group', groupId], queryFn: () => fetchGroup(groupId!), enabled: !!groupId });
  const venues = useQuery({ queryKey: ['venues'], queryFn: fetchVenueNames });
  const showSkeleton = useSkeleton(group.isPending);

  const memberIds = useMemo(
    () => (group.data?.group_members ?? []).map((m) => m.profile_id),
    [group.data],
  );
  const averages = useQuery({
    queryKey: ['averages', groupId],
    queryFn: () => fetchAverages(memberIds),
    enabled: memberIds.length > 0,
  });

  const [venue, setVenue] = useState('');
  const [bestOf, setBestOf] = useState<1 | 3 | 5>(3);
  const [mode, setMode] = useState<ScoringMode>('total_pins');
  const [teams, setTeams] = useState<DraftTeam[]>([
    { name: 'Team 1', players: [] },
    { name: 'Team 2', players: [] },
  ]);
  const [guestName, setGuestName] = useState('');

  const basis = group.data?.handicap_basis ?? 200;
  const pct = group.data?.handicap_pct ?? 90;

  const assignedKeys = new Set(teams.flatMap((t) => t.players.map((p) => p.key)));
  const unassigned = (group.data?.group_members ?? []).filter((m) => !assignedKeys.has(m.profile_id));

  function assign(teamIdx: number, player: Omit<DraftPlayer, 'handicap' | 'handicapTouched'>) {
    const avg = player.profile_id ? averages.data?.[player.profile_id] ?? null : null;
    setTeams((ts) =>
      ts.map((t, i) =>
        i === teamIdx
          ? {
              ...t,
              players: [
                ...t.players,
                { ...player, handicap: defaultHandicap(avg, basis, pct), handicapTouched: false },
              ],
            }
          : t,
      ),
    );
  }

  function unassign(key: string) {
    setTeams((ts) => ts.map((t) => ({ ...t, players: t.players.filter((p) => p.key !== key) })));
  }

  function setHandicap(key: string, handicap: number) {
    setTeams((ts) =>
      ts.map((t) => ({
        ...t,
        players: t.players.map((p) => (p.key === key ? { ...p, handicap, handicapTouched: true } : p)),
      })),
    );
  }

  const valid =
    teams.length >= 2 &&
    teams.every((t) => t.name.trim().length > 0 && t.players.length > 0) &&
    teams.flatMap((t) => t.players).every((p) => p.handicap >= 0);

  const create = useMutation({
    mutationFn: () =>
      createMatchDay({
        profileId: profile.id,
        groupId: groupId!,
        venueName: venue,
        bestOf,
        scoringMode: mode,
        handicapBasis: basis,
        handicapPct: pct,
        teams: teams.map((t) => ({
          name: t.name,
          players: t.players.map((p) => ({
            profile_id: p.profile_id,
            guest_name: p.guest_name,
            handicap: p.handicap,
          })),
        })),
      }),
    onSuccess: (id) => navigate(`/matchday/${id}`, { replace: true }),
  });

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-5 px-4 py-6">
        <FormSkeleton fields={3} label="Loading the match day setup" />
      </div>
    );
  }
  if (group.isPending) return <div className="px-4 py-6" />;

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-[20px] font-bold">New match day</h1>
        <Link to={`/groups/${groupId}`} className="text-[13.5px] text-dim">
          Cancel
        </Link>
      </header>

      <div className="flex flex-col gap-2">
        <label htmlFor="md-venue" className="label-caps">
          Venue (optional)
        </label>
        <input
          id="md-venue"
          list="md-venues"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="Hollywood Bowl…"
          className="rounded-[10px] border border-line bg-well px-3 py-3 text-[14px] text-text placeholder:text-faint"
        />
        <datalist id="md-venues">
          {(venues.data ?? []).map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-2">
        <span className="label-caps">Series</span>
        <div className="flex gap-2">
          {([1, 3, 5] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setBestOf(n)}
              className={`flex-1 rounded-[10px] border py-2.5 text-[13px] font-bold ${
                bestOf === n ? 'border-phosphor/50 bg-phosphor/10 text-phosphor' : 'border-line bg-panel text-dim'
              }`}
            >
              {n === 1 ? 'Single game' : `Best of ${n}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="label-caps">Scoring</span>
        <div className="flex gap-2">
          <ModeButton active={mode === 'total_pins'} onClick={() => setMode('total_pins')} title="Total pins" hint="Team totals incl. handicap" />
          <ModeButton active={mode === 'points'} onClick={() => setMode('points')} title="Points" hint="Head-to-head pairings + team total" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="label-caps">Teams</span>
          <button
            type="button"
            onClick={() => setTeams((ts) => [...ts, { name: `Team ${ts.length + 1}`, players: [] }])}
            className="rounded-lg border border-line bg-well px-3 py-1.5 text-[12px] text-dim"
          >
            Add team
          </button>
        </div>

        {teams.map((team, ti) => (
          <div key={ti} className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3">
            <div className="flex items-center gap-2">
              <input
                value={team.name}
                aria-label={`Team ${ti + 1} name`}
                onChange={(e) => setTeams((ts) => ts.map((t, i) => (i === ti ? { ...t, name: e.target.value } : t)))}
                maxLength={24}
                className="min-w-0 flex-1 rounded-[10px] border border-line bg-well px-3 py-2 font-display text-[14px] font-bold text-text"
              />
              {teams.length > 2 && team.players.length === 0 && (
                <button
                  type="button"
                  aria-label={`Remove team ${ti + 1}`}
                  onClick={() => setTeams((ts) => ts.filter((_, i) => i !== ti))}
                  className="text-[16px] text-faint"
                >
                  ×
                </button>
              )}
            </div>
            {team.players.map((p, pi) => (
              <div key={p.key} className="flex items-center gap-2">
                {mode === 'points' && <span className="score-text w-4 text-[12px] text-faint">{pi + 1}</span>}
                <span className="min-w-0 flex-1 truncate text-[14px] text-text">
                  {p.display_name}
                  {p.guest_name ? ' (guest)' : ''}
                </span>
                <label className="flex items-center gap-1 text-[11px] text-faint">
                  HCP
                  <input
                    type="number"
                    min={0}
                    max={220}
                    value={p.handicap}
                    aria-label={`${p.display_name} handicap`}
                    onChange={(e) => setHandicap(p.key, Math.max(0, Number(e.target.value)))}
                    className={`score-text w-16 rounded-[8px] border border-line bg-well px-2 py-1.5 text-right text-[13px] ${
                      p.handicapTouched ? 'text-phosphor' : 'text-text'
                    }`}
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Remove ${p.display_name}`}
                  onClick={() => unassign(p.key)}
                  className="text-[16px] text-faint"
                >
                  ×
                </button>
              </div>
            ))}
            {team.players.length === 0 && <p className="text-[12px] text-faint">No players yet — add from below.</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <span className="label-caps">Who’s playing?</span>
        {unassigned.map((m) => (
          <div key={m.profile_id} className="flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-[14px] text-text">{m.profiles?.display_name}</span>
            {teams.map((t, ti) => (
              <button
                key={ti}
                type="button"
                onClick={() =>
                  assign(ti, {
                    key: m.profile_id,
                    profile_id: m.profile_id,
                    guest_name: null,
                    display_name: m.profiles?.display_name ?? '?',
                  })
                }
                className="rounded-lg border border-line bg-well px-2.5 py-1.5 text-[11px] font-bold text-dim"
              >
                {t.name.trim() || `Team ${ti + 1}`}
              </button>
            ))}
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-well/50 px-3 py-2.5">
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Guest name…"
            aria-label="Guest name"
            className="min-w-0 flex-1 rounded-[8px] border border-line bg-well px-2.5 py-1.5 text-[13px] text-text placeholder:text-faint"
          />
          {teams.map((t, ti) => (
            <button
              key={ti}
              type="button"
              disabled={guestName.trim().length === 0}
              onClick={() => {
                const name = guestName.trim();
                assign(ti, {
                  key: `guest:${name.toLowerCase()}`,
                  profile_id: null,
                  guest_name: name,
                  display_name: name,
                });
                setGuestName('');
              }}
              className="rounded-lg border border-line bg-well px-2.5 py-1.5 text-[11px] font-bold text-dim disabled:opacity-40"
            >
              {t.name.trim() || `Team ${ti + 1}`}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-faint">
          Handicaps default to {pct}% of ({basis} − average) — tap a number to override for the day.
        </p>
      </div>

      <button
        type="button"
        onClick={() => create.mutate()}
        disabled={!valid || create.isPending}
        className="rounded-[10px] bg-phosphor py-3.5 font-display text-[15px] font-bold text-ink shadow-glow-amber disabled:opacity-50 disabled:shadow-none"
      >
        {create.isPending ? 'Setting up…' : 'Start match day'}
      </button>
      {create.isError && (
        <p className="text-center text-[13px] text-signal" role="alert">
          Couldn’t create the match day — try again.
        </p>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-start gap-0.5 rounded-[10px] border px-3 py-2.5 text-left ${
        active ? 'border-phosphor/50 bg-phosphor/10' : 'border-line bg-panel'
      }`}
    >
      <span className={`text-[13px] font-bold ${active ? 'text-phosphor' : 'text-text'}`}>{title}</span>
      <span className="text-[10.5px] text-faint">{hint}</span>
    </button>
  );
}
