import { useQuery } from '@tanstack/react-query';
import ChipRow from './ChipRow';
import { fetchMyGroups } from '../lib/groups';

/**
 * Group selector on game entry, as a row of chips: a group game lands on that
 * group's feed and leaderboard; "Just for me" stays personal (friends still
 * see it). Renders nothing for someone with no groups.
 */
export default function GroupPicker({
  profileId,
  value,
  onChange,
  id = 'group-picker',
}: {
  profileId: string;
  value: string | null;
  onChange: (groupId: string | null) => void;
  id?: string;
}) {
  const groups = useQuery({ queryKey: ['my-groups', profileId], queryFn: () => fetchMyGroups(profileId) });
  const list = groups.data ?? [];
  if (list.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="label">
        Group
      </span>
      <ChipRow
        label="Group"
        value={value ?? ''}
        onChange={(v) => onChange(v || null)}
        options={[
          { value: '', label: 'Just for me' },
          ...list.flatMap((m) => (m.groups ? [{ value: m.groups.id, label: m.groups.name }] : [])),
        ]}
      />
    </div>
  );
}
