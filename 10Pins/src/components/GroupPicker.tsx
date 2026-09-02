import { useQuery } from '@tanstack/react-query';
import { fetchMyGroups } from '../lib/groups';

/**
 * Optional group selector on game entry: a group game lands on that group's
 * feed and leaderboard; "Just for me" stays personal (friends still see it).
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
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="label-caps">
        Group (optional)
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        className="rounded-[10px] border border-line bg-well px-3 py-3 text-[14px] text-text [color-scheme:dark]"
      >
        <option value="">Just for me</option>
        {list.map((m) =>
          m.groups ? (
            <option key={m.groups.id} value={m.groups.id}>
              {m.groups.name}
            </option>
          ) : null,
        )}
      </select>
    </div>
  );
}
