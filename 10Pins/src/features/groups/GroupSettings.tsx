import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGroup, removeMember, updateGroupSettings } from '../../lib/groups';
import { FormSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import ChipRow from '../../components/ChipRow';
import Strip, { StripTitle } from '../../components/Strip';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

const ON_OFF = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

export default function GroupSettings({ profile }: { profile: Profile }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const group = useQuery({ queryKey: ['group', id], queryFn: () => fetchGroup(id!), enabled: !!id });
  const showSkeleton = useSkeleton(group.isPending);

  const [name, setName] = useState('');
  const [seasonName, setSeasonName] = useState('');
  const [seasonStarts, setSeasonStarts] = useState('');
  const [seasonEnds, setSeasonEnds] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [basis, setBasis] = useState(200);
  const [pct, setPct] = useState(90);
  /** The member whose "Remove" is awaiting a second press. */
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  // Seed the form once the group loads
  useEffect(() => {
    const g = group.data;
    if (!g) return;
    setName(g.name);
    setSeasonName(g.season_name ?? '');
    setSeasonStarts(g.season_starts ?? '');
    setSeasonEnds(g.season_ends ?? '');
    setVerifiedOnly(g.verified_only_leaderboard);
    setBasis(g.handicap_basis);
    setPct(g.handicap_pct);
  }, [group.data]);

  const save = useMutation({
    mutationFn: () =>
      updateGroupSettings(id!, {
        name: name.trim(),
        season_name: seasonName.trim() || null,
        season_starts: seasonStarts || null,
        season_ends: seasonEnds || null,
        verified_only_leaderboard: verifiedOnly,
        handicap_basis: basis,
        handicap_pct: pct,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', id] });
      navigate(`/groups/${id}`);
    },
  });

  const remove = useMutation({
    mutationFn: (profileId: string) => removeMember(id!, profileId),
    onSuccess: () => {
      setConfirmRemove(null);
      queryClient.invalidateQueries({ queryKey: ['group', id] });
    },
  });

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-5 px-4 py-6">
        <FormSkeleton fields={4} label="Loading group settings" />
      </div>
    );
  }
  if (group.isPending) return <div className="px-4 py-6" />;
  const g = group.data;
  const myRole = g?.group_members?.find((m) => m.profile_id === profile.id)?.role;
  if (!g || myRole !== 'admin') {
    return (
      <div className="px-4 py-6">
        <EmptyState
          tone="page"
          title="Admins only"
          body="Only a group admin can change these settings."
          action={{ label: 'Back to the group', to: `/groups/${id}` }}
        />
      </div>
    );
  }

  const members = g.group_members ?? [];
  const canSave =
    !save.isPending && name.trim().length >= 2 && basis >= 100 && basis <= 300 && pct >= 0 && pct <= 100;

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div className="px-1">
        <PageHeader
          back={`/groups/${id}`}
          title="Group settings"
          right={
            <Link to={`/groups/${id}`} className="btn-secondary-sm">
              Cancel
            </Link>
          }
        />
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length >= 2) save.mutate();
        }}
      >
        <Strip>
          <div className="flex flex-col gap-1.5 p-3.5">
            <label className="label" htmlFor="gs-name">
              Group name
            </label>
            <input id="gs-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="field" />
          </div>
        </Strip>

        <Strip>
          <StripTitle>Season</StripTitle>
          <div className="flex flex-col gap-3 p-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="gs-season">
                Season name <span className="optional">optional</span>
              </label>
              <input
                id="gs-season"
                value={seasonName}
                onChange={(e) => setSeasonName(e.target.value)}
                placeholder="Autumn season"
                maxLength={40}
                className="field"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="gs-starts">
                  Starts
                </label>
                <input
                  id="gs-starts"
                  type="date"
                  value={seasonStarts}
                  onChange={(e) => setSeasonStarts(e.target.value)}
                  className="field num"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="gs-ends">
                  Ends
                </label>
                <input
                  id="gs-ends"
                  type="date"
                  value={seasonEnds}
                  onChange={(e) => setSeasonEnds(e.target.value)}
                  className="field num"
                />
              </div>
            </div>
            <p className="text-[13px] text-ink-faded">Leave the dates empty for an open season, every game counts.</p>
          </div>
        </Strip>

        <Strip>
          <div className="flex items-center justify-between gap-3 p-3.5">
            <div className="min-w-0">
              <p className="text-[15px]">Verified games only</p>
              <p className="text-[13px] text-ink-faded">The leaderboard counts photo-verified games only.</p>
            </div>
            <div className="shrink-0">
              <ChipRow
                fill
                label="Verified games only"
                options={ON_OFF}
                value={verifiedOnly ? 'on' : 'off'}
                onChange={(v) => setVerifiedOnly(v === 'on')}
              />
            </div>
          </div>
        </Strip>

        <Strip>
          <StripTitle>Handicaps</StripTitle>
          <div className="flex flex-col gap-3 p-3.5">
            <p className="text-[13px] text-ink-faded">
              A match day handicap is <span className="num">{pct}</span>% of <span className="num">{basis}</span> minus the
              player’s average, never below <span className="num">0</span>. Organisers can change it per player on the day.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="gs-basis">
                  Basis
                </label>
                <input
                  id="gs-basis"
                  type="number"
                  min={100}
                  max={300}
                  value={basis}
                  onChange={(e) => setBasis(Number(e.target.value))}
                  className="field num"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="gs-pct">
                  Percent
                </label>
                <input
                  id="gs-pct"
                  type="number"
                  min={0}
                  max={100}
                  value={pct}
                  onChange={(e) => setPct(Number(e.target.value))}
                  className="field num"
                />
              </div>
            </div>
          </div>
        </Strip>

        <button type="submit" disabled={!canSave} className="btn-primary">
          {save.isPending ? 'Saving…' : 'Save settings'}
        </button>
        {save.isError && (
          <p className="text-center text-[13px] text-red" role="alert">
            That didn’t save. Check your connection and try again.
          </p>
        )}
      </form>

      <Strip>
        <StripTitle right={<span className="num">{members.length}</span>}>Members</StripTitle>
        {members.map((m) => {
          const you = m.profile_id === profile.id;
          const displayName = m.profiles?.display_name ?? 'this player';
          const confirming = confirmRemove === m.profile_id;
          return (
            <div key={m.profile_id} className="flex flex-col">
              <div className="flex items-center justify-between gap-3 px-3.5 py-[11px] text-[14px]">
                <div className="min-w-0">
                  <p className="truncate">
                    {m.profiles?.display_name}
                    {you && <span className="text-ink-faded"> you</span>}
                  </p>
                  <p className="truncate text-[12px] text-ink-faded">
                    @{m.profiles?.username}
                    {m.role === 'admin' ? ' · admin' : ''}
                  </p>
                </div>
                {!you && !confirming && (
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(m.profile_id)}
                    className="btn-danger-text shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
              {confirming && (
                <div className="px-3.5 pb-3.5">
                  <div className="strip-soft flex flex-col gap-2.5 p-3">
                    <p className="text-[13px]">Remove {displayName} from the group? Their games stay on their own record.</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setConfirmRemove(null)} className="btn-secondary-sm">
                        Keep it
                      </button>
                      <button
                        type="button"
                        onClick={() => remove.mutate(m.profile_id)}
                        disabled={remove.isPending}
                        className="press rounded-r2 bg-red px-4 py-2 text-[13px] font-semibold text-paper disabled:bg-disabled-bg disabled:text-disabled-fg"
                      >
                        {remove.isPending ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                    {remove.isError && (
                      <p className="text-[13px] text-red" role="alert">
                        That didn’t save. Check your connection and try again.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Strip>
    </div>
  );
}
