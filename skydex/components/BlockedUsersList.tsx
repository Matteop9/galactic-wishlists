"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import FlyerStar from "@/components/FlyerStar";
import { unblockUser } from "@/app/actions/blocks";

export type BlockedRow = {
  blocked_id: string;
  profile: {
    handle: string | null;
    avatar_seed: string | null;
    is_admin: boolean | null;
    frequent_flyer: boolean | null;
  } | null;
};

/** Settings "Blocked spotters" list — the visible manage-blocks surface. */
export default function BlockedUsersList({ initial }: { initial: BlockedRow[] }) {
  const [rows, setRows] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function unblock(row: BlockedRow) {
    setErr(null);
    setBusyId(row.blocked_id);
    // Optimistic removal; restore the row if the delete didn't land.
    setRows((r) => r.filter((x) => x.blocked_id !== row.blocked_id));
    const res = await unblockUser(row.blocked_id);
    setBusyId(null);
    if (res.error) {
      setRows((r) => [row, ...r]);
      setErr("Could not unblock — try again.");
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-paper-edge p-4">
      <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
        Blocked spotters
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        You don&apos;t see a blocked spotter&apos;s sightings or comments, and neither of you
        can comment on the other&apos;s sightings.
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 font-mono text-xs text-ink-faint">
          You haven&apos;t blocked anyone.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-paper-edge">
          {rows.map((row) => (
            <li key={row.blocked_id} className="flex items-center justify-between gap-3 py-2">
              {row.profile?.handle ? (
                <Link
                  href={`/u/${row.profile.handle}`}
                  className="flex min-w-0 items-center gap-2 hover:underline"
                >
                  <Avatar
                    seed={row.profile.avatar_seed ?? row.profile.handle}
                    admin={Boolean(row.profile.is_admin)}
                    size={24}
                  />
                  <span className="truncate font-mono text-xs text-sky">
                    @{row.profile.handle}
                    <FlyerStar show={row.profile.frequent_flyer} />
                  </span>
                </Link>
              ) : (
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar seed={row.profile?.avatar_seed} admin={false} size={24} />
                  <span className="font-mono text-xs text-sky">@spotter</span>
                </span>
              )}
              <button
                onClick={() => unblock(row)}
                disabled={busyId === row.blocked_id}
                className="shrink-0 font-mono text-[11px] uppercase text-ink-faint hover:text-stamp disabled:opacity-60"
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
      {err && <p className="mt-2 text-xs text-stamp">{err}</p>}
    </div>
  );
}
