import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchGroup, fetchMyGroups } from '../../lib/groups';
import { defaultHandicap } from '../../lib/handicap';
import { createMatchDay, fetchAverages, type ScoringMode } from '../../lib/matchday';
import { fetchVenueNames } from '../../lib/games';
import ChipRow from '../../components/ChipRow';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import Strip, { StripTitle } from '../../components/Strip';
import { FormSkeleton, ListSkeleton } from '../../components/Skeleton';
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

type DraftSeed = Omit<DraftPlayer, 'handicap' | 'handicapTouched'>;

/**
 * Match day · setup: pick the group, split it into teams, choose the series
 * and scoring, check the handicaps, name the venue. Handicaps default from the
 * group's basis and percentage; any of them can be changed for the day.
 */
export default function MatchDaySetup({ profile }: { profile: Profile }) {
  const { id: paramGroupId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pickedGroupId, setPickedGroupId] = useState<string | null>(null);

  const myGroups = useQuery({
    queryKey: ['my-groups', profile.id],
    queryFn: () => fetchMyGroups(profile.id),
    enabled: !paramGroupId,
  });

  const singleGroupId =
    !paramGroupId && myGroups.data?.length === 1 ? (myGroups.data[0].groups?.id ?? null) : null;
  const groupId = paramGroupId ?? pickedGroupId ?? singleGroupId ?? null;

  const group = useQuery({ queryKey: ['group', groupId], queryFn: () => fetchGroup(groupId!), enabled: !!groupId });
  const venues = useQuery({ queryKey: ['venues'], queryFn: fetchVenueNames });
  const showSkeleton = useSkeleton(!!groupId && group.isPending);
  const showGroupsSkeleton = useSkeleton(!paramGroupId && myGroups.isPending);

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

  const teamLabel = (team: DraftTeam, index: number) => team.name.trim() || `Team ${index + 1}`;
  const teamOptions = teams.map((team, index) => ({ value: String(index), label: teamLabel(team, index) }));
  const teamIndexOf = (key: string) => teams.findIndex((t) => t.players.some((p) => p.key === key));
  const assigned = teams.flatMap((team, index) => team.players.map((player) => ({ player, team, index })));
  const guests = assigned.filter(({ player }) => !player.profile_id).map(({ player }) => player);

  function assign(teamIdx: number, player: DraftSeed) {
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

  /** The segmented control per player: tap a team to join it, tap it again to leave. */
  function pickTeam(value: string, player: DraftSeed) {
    const current = teamIndexOf(player.key);
    unassign(player.key);
    if (String(current) !== value) assign(Number(value), player);
  }

  function addGuest(value: string) {
    const name = guestName.trim();
    if (!name) return;
    assign(Number(value), {
      key: `guest:${name.toLowerCase()}`,
      profile_id: null,
      guest_name: name,
      display_name: name,
    });
    setGuestName('');
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

  const header = (
    <header className="flex items-center justify-between px-5 pb-1 pt-2.5">
      <Link
        to={paramGroupId ? `/groups/${paramGroupId}` : '/'}
        aria-label="Cancel"
        className="press -ml-2.5 flex size-11 shrink-0 items-center justify-center text-ink"
      >
        <Icon name="x" className="size-6" />
      </Link>
      <h1 className="num text-[18px] font-semibold">Start a match day</h1>
      <span className="size-11 shrink-0" aria-hidden />
    </header>
  );

  if (!groupId) {
    if (showGroupsSkeleton) {
      return (
        <div className="flex flex-col gap-5 px-5 py-6">
          <ListSkeleton rows={3} label="Loading your groups" avatar={false} trailing={false} />
        </div>
      );
    }
    const groups = myGroups.data ?? [];
    if (groups.length === 0) {
      return (
        <div className="px-5">
          <EmptyState
            tone="page"
            title="Match days live in a group"
            body="Split a group into teams, set handicaps and bowl a series. You need a group first."
            action={{ label: 'Create a group', to: '/groups' }}
          />
        </div>
      );
    }
    return (
      <div className="flex flex-col pb-6">
        {header}
        <div className="flex flex-col gap-1.5 px-5 py-[18px]">
          <span className="label">Which group</span>
          <Strip>
            {groups.map((m) =>
              m.groups ? (
                <button
                  key={m.groups.id}
                  type="button"
                  onClick={() => setPickedGroupId(m.groups!.id)}
                  className="press flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px]"
                >
                  <span className="min-w-0 flex-1 truncate">{m.groups.name}</span>
                  {m.groups.season_name && (
                    <span className="truncate text-[13px] text-ink-faded">{m.groups.season_name}</span>
                  )}
                  <Icon name="chevron-right" className="size-5 shrink-0 text-ink-faded" />
                </button>
              ) : null,
            )}
          </Strip>
        </div>
      </div>
    );
  }

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-5 px-5 py-6">
        <FormSkeleton fields={3} label="Loading the match day setup" />
      </div>
    );
  }
  if (group.isPending) return <div className="px-5 py-6" />;

  const members = group.data?.group_members ?? [];

  return (
    <div className="flex flex-col pb-6">
      {header}

      <div className="flex flex-col gap-[18px] px-5 py-[18px]">
        <p className="flex items-baseline gap-2 text-[13px] text-ink-faded">
          <span className="min-w-0 truncate">{group.data?.name}</span>
          {!paramGroupId && pickedGroupId && (
            <button
              type="button"
              onClick={() => setPickedGroupId(null)}
              className="press shrink-0 font-semibold text-blue"
            >
              Change group
            </button>
          )}
        </p>

        {/* Teams: a name each, and who is on it so far. */}
        <div className="flex flex-col gap-1.5">
          <Strip>
            <StripTitle right={mode === 'points' ? 'Order sets the pairings' : undefined}>Teams</StripTitle>
            {teams.map((team, ti) => (
              <div key={ti} className="flex flex-col gap-2 p-3.5">
                <div className="flex items-center gap-2">
                  <input
                    value={team.name}
                    aria-label={`Team ${ti + 1} name`}
                    onChange={(e) => setTeams((ts) => ts.map((t, i) => (i === ti ? { ...t, name: e.target.value } : t)))}
                    maxLength={24}
                    className="field min-w-0 flex-1"
                  />
                  {teams.length > 2 && team.players.length === 0 && (
                    <button
                      type="button"
                      aria-label={`Remove team ${ti + 1}`}
                      onClick={() => setTeams((ts) => ts.filter((_, i) => i !== ti))}
                      className="press flex size-11 shrink-0 items-center justify-center text-ink"
                    >
                      <Icon name="x" className="size-5" />
                    </button>
                  )}
                </div>
                {team.players.length === 0 ? (
                  <p className="text-[13px] text-ink-faded">No players on this team yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {team.players.map((p, pi) => (
                      <li key={p.key} className="flex items-center gap-2 text-[15px]">
                        {mode === 'points' && (
                          <span className="num w-5 shrink-0 text-[15px] text-ink-faded">{pi + 1}</span>
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {p.display_name}
                          {p.guest_name && <span className="text-ink-faded"> guest</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Strip>
          <button
            type="button"
            onClick={() => setTeams((ts) => [...ts, { name: `Team ${ts.length + 1}`, players: [] }])}
            className="press self-start pt-0.5 text-[13px] font-semibold text-blue"
          >
            Add a team
          </button>
        </div>

        {/* Players: every group member, and each guest, with a team picker. */}
        <Strip>
          <StripTitle right="Tap a team again to take them off it">Players</StripTitle>
          {members.map((m) => {
            const name = m.profiles?.display_name ?? 'Player';
            const index = teamIndexOf(m.profile_id);
            return (
              <div key={m.profile_id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[15px]">
                  {name}
                  {m.profile_id === profile.id && <span className="text-ink-faded"> you</span>}
                </span>
                <ChipRow
                  label={`${name}, team`}
                  fill
                  size="sm"
                  options={teamOptions}
                  value={index >= 0 ? String(index) : ''}
                  onChange={(v) =>
                    pickTeam(v, {
                      key: m.profile_id,
                      profile_id: m.profile_id,
                      guest_name: null,
                      display_name: name,
                    })
                  }
                />
              </div>
            );
          })}
          {guests.map((g) => (
            <div key={g.key} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
              <span className="min-w-0 flex-1 truncate text-[15px]">
                {g.display_name}
                <span className="text-ink-faded"> guest</span>
              </span>
              <ChipRow
                label={`${g.display_name}, team`}
                fill
                size="sm"
                options={teamOptions}
                value={String(teamIndexOf(g.key))}
                onChange={(v) =>
                  pickTeam(v, {
                    key: g.key,
                    profile_id: null,
                    guest_name: g.guest_name,
                    display_name: g.display_name,
                  })
                }
              />
            </div>
          ))}
          <div className="flex flex-col gap-1.5 p-3.5">
            <label htmlFor="md-guest" className="label">
              Guest <span className="optional">name on the monitor</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="md-guest"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                aria-label="Guest name"
                className="field min-w-0 flex-1"
              />
              {guestName.trim() ? (
                <ChipRow label="Guest team" fill size="sm" options={teamOptions} value="" onChange={addGuest} />
              ) : (
                <span className="text-[12px] text-ink-faded">Type a name, then pick their team.</span>
              )}
            </div>
          </div>
        </Strip>

        {/* Series and scoring. */}
        <Strip>
          <StripTitle>Series</StripTitle>
          <div className="px-3.5 py-3">
            <ChipRow
              label="Series"
              fill
              options={[
                { value: '1', label: 'Single game' },
                { value: '3', label: 'Best of 3' },
                { value: '5', label: 'Best of 5' },
              ]}
              value={String(bestOf)}
              onChange={(v) => setBestOf(Number(v) as 1 | 3 | 5)}
            />
          </div>
        </Strip>

        <Strip>
          <StripTitle right={mode === 'points' ? 'Pairings plus the team total' : 'Team totals with handicap'}>
            Scoring
          </StripTitle>
          <div className="px-3.5 py-3">
            <ChipRow
              label="Scoring"
              fill
              options={[
                { value: 'total_pins', label: 'Total pins' },
                { value: 'points', label: 'Points' },
              ]}
              value={mode}
              onChange={(v) => setMode(v as ScoringMode)}
            />
          </div>
        </Strip>

        {/* Handicaps: one row per assigned player, editable for the day. */}
        <Strip>
          <StripTitle
            right={
              <>
                <span className="num">{pct}</span>% of <span className="num">{basis}</span> minus average
              </>
            }
          >
            Handicaps
          </StripTitle>
          {assigned.length === 0 ? (
            <p className="px-3.5 py-3 text-[13px] text-ink-faded">Put players on teams to see their handicaps.</p>
          ) : (
            assigned.map(({ player, team, index }) => (
              <div key={player.key} className="flex items-center gap-3 px-3.5 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{player.display_name}</p>
                  <p className="truncate text-[12px] text-ink-faded">{teamLabel(team, index)}</p>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={220}
                  value={player.handicap}
                  aria-label={`${player.display_name} handicap`}
                  onChange={(e) => setHandicap(player.key, Math.max(0, Number(e.target.value)))}
                  className="field num w-20 text-right [appearance:textfield]"
                />
              </div>
            ))
          )}
          <p className="px-3.5 py-2.5 text-[12px] text-ink-faded">Change any number to set it for the day.</p>
        </Strip>

        <div className="flex flex-col gap-1">
          <label htmlFor="md-venue" className="label">
            Venue <span className="optional">optional</span>
          </label>
          <input
            id="md-venue"
            type="text"
            list="md-venues"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="field"
          />
          <datalist id="md-venues">
            {(venues.data ?? []).map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={!valid || create.isPending}
          className="btn-primary"
        >
          {create.isPending ? 'Starting' : 'Start match day'}
        </button>
        {create.isError && (
          <p className="text-center text-[13px] text-red" role="alert">
            That didn’t start. Check your connection and try again.
          </p>
        )}
      </div>
    </div>
  );
}
