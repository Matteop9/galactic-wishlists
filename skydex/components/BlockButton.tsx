"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { blockUser, unblockUser } from "@/app/actions/blocks";

export default function BlockButton({
  targetUserId,
  handle,
  currentUserId,
  initiallyBlocked = false,
  className = "",
  onChanged,
}: {
  targetUserId: string;
  handle: string | null;
  currentUserId: string | null;
  initiallyBlocked?: boolean;
  className?: string;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!currentUserId || targetUserId === currentUserId) return null;

  async function toggle() {
    if (!blocked) {
      const who = handle ? `@${handle}` : "this spotter";
      const ok = window.confirm(
        `Block ${who}? You won't see their sightings or comments, and neither of you can comment on the other's sightings. You can unblock them in Settings.`,
      );
      if (!ok) return;
    }
    setBusy(true);
    setFailed(false);
    const res = blocked
      ? await unblockUser(targetUserId)
      : await blockUser(targetUserId);
    setBusy(false);
    if (res.error) {
      setFailed(true);
      return;
    }
    setBlocked(!blocked);
    // Re-render the current route's server components so filtered content
    // (feed rows, profile interstitial) reflects the new block immediately.
    router.refresh();
    onChanged?.();
  }

  return (
    <button onClick={toggle} disabled={busy} className={className}>
      {busy ? "…" : failed ? "Failed — retry" : blocked ? "Unblock" : "Block"}
    </button>
  );
}
