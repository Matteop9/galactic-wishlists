"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import { updateAvatar } from "@/app/profile/actions";

export default function AvatarEditor({
  initialSeed,
  canEditNow,
  admin = false,
}: {
  initialSeed: string;
  canEditNow: boolean;
  admin?: boolean;
}) {
  const [seed, setSeed] = useState(initialSeed);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const changed = seed !== initialSeed;

  if (admin) {
    return (
      <div className="mb-6 flex items-center gap-4 rounded-lg border border-brass p-4">
        <Avatar seed={seed} admin size={64} />
        <p className="text-sm text-ink-soft">
          Admins wear the captain&apos;s badge.
        </p>
      </div>
    );
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await updateAvatar(seed);
    if (res.ok) {
      window.location.reload();
    } else {
      setBusy(false);
      setMsg(res.error ?? "Could not save.");
    }
  }

  return (
    <div className="mb-6 flex items-center gap-4 rounded-lg border border-paper-edge p-4">
      <Avatar seed={seed} size={64} />
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setSeed(Math.random().toString(36).slice(2, 12))}
            className="sd-btn sd-btn--log !px-4 !py-2 !text-sm"
          >
            Shuffle
          </button>
          <button
            onClick={save}
            disabled={busy || !changed || !canEditNow}
            className="sd-btn sd-btn--capture !px-4 !py-2 !text-sm"
          >
            {busy ? "Saving…" : "Save avatar"}
          </button>
        </div>
        {!canEditNow ? (
          <p className="text-xs text-ink-faint">You can change your avatar once a day.</p>
        ) : (
          <p className="text-xs text-ink-faint">Shuffle until you like it, then save.</p>
        )}
        {msg && <p className="text-xs text-stamp">{msg}</p>}
      </div>
    </div>
  );
}
