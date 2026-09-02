import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGroup, removeMember, updateGroupSettings } from '../../lib/groups';
import { FormSkeleton } from '../../components/Skeleton';
import { useSkeleton } from '../../lib/useSkeleton';
import type { Profile } from '../../lib/auth';

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', id] }),
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
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <h1 className="font-display text-[20px] font-bold">Admins only</h1>
        <Link to={`/groups/${id}`} className="text-[13.5px] text-phosphor">
          Back to the group
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-[20px] font-bold">Group settings</h1>
        <Link to={`/groups/${id}`} className="text-[13.5px] text-dim">
          Cancel
        </Link>
      </header>

      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length >= 2) save.mutate();
        }}
      >
        <Field label="Group name" htmlFor="gs-name">
          <input id="gs-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={inputCls} />
        </Field>

        <section className="flex flex-col gap-3 rounded-card border border-line bg-panel p-4">
          <span className="label-caps">Season</span>
          <Field label="Season name" htmlFor="gs-season">
            <input
              id="gs-season"
              value={seasonName}
              onChange={(e) => setSeasonName(e.target.value)}
              placeholder="2026 season"
              maxLength={40}
              className={inputCls}
            />
          </Field>
          <div className="flex gap-3">
            <Field label="Starts" htmlFor="gs-starts" grow>
              <input id="gs-starts" type="date" value={seasonStarts} onChange={(e) => setSeasonStarts(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Ends" htmlFor="gs-ends" grow>
              <input id="gs-ends" type="date" value={seasonEnds} onChange={(e) => setSeasonEnds(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <p className="text-[11px] text-faint">Leave dates empty for an open season — every game counts.</p>
        </section>

        <section className="flex flex-col gap-3 rounded-card border border-line bg-panel p-4">
          <label className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[14px] text-text">Verified games only</p>
              <p className="text-[11px] text-faint">Leaderboard counts photo-verified games only</p>
            </div>
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="size-5 accent-[var(--color-phosphor)]"
            />
          </label>
        </section>

        <section className="flex flex-col gap-3 rounded-card border border-line bg-panel p-4">
          <span className="label-caps">Handicaps</span>
          <p className="text-[12px] text-dim">
            Default handicap on a match day = {pct}% of ({basis} − player’s average), never below 0.
            Organisers can override per player on the day.
          </p>
          <div className="flex gap-3">
            <Field label="Basis" htmlFor="gs-basis" grow>
              <input
                id="gs-basis"
                type="number"
                min={100}
                max={300}
                value={basis}
                onChange={(e) => setBasis(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Percent" htmlFor="gs-pct" grow>
              <input
                id="gs-pct"
                type="number"
                min={0}
                max={100}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
        </section>

        <button
          type="submit"
          disabled={save.isPending || name.trim().length < 2 || basis < 100 || basis > 300 || pct < 0 || pct > 100}
          className="btn-primary"
        >
          {save.isPending ? 'Saving…' : 'Save settings'}
        </button>
        {save.isError && (
          <p className="text-center text-[13px] text-signal" role="alert">
            Couldn’t save — try again.
          </p>
        )}
      </form>

      <section className="flex flex-col gap-2">
        <span className="label-caps">Members</span>
        {(g.group_members ?? []).map((m) => (
          <div
            key={m.profile_id}
            className="flex items-center justify-between rounded-card border border-line bg-panel px-4 py-3"
          >
            <div>
              <p className="text-[14px] text-text">
                {m.profiles?.display_name}
                {m.profile_id === profile.id ? ' (you)' : ''}
              </p>
              <p className="text-[11px] text-faint">
                @{m.profiles?.username}
                {m.role === 'admin' ? ' · admin' : ''}
              </p>
            </div>
            {m.profile_id !== profile.id && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Remove ${m.profiles?.display_name} from the group?`)) {
                    remove.mutate(m.profile_id);
                  }
                }}
                className="rounded-control border border-line bg-well px-3 py-1.5 text-[12px] font-bold text-signal"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

const inputCls =
  'w-full rounded-control border border-line bg-well px-3 py-3 text-[15px] text-text placeholder:text-faint';

function Field({
  label,
  htmlFor,
  grow,
  children,
}: {
  label: string;
  htmlFor: string;
  grow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${grow ? 'flex-1' : ''}`}>
      <label className="label-caps" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
