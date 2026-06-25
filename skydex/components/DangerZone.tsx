"use client";

import { useState } from "react";
import { deleteAccount } from "@/app/profile/actions";

export default function DangerZone() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (
      !window.confirm(
        "Permanently delete your account, sightings, photos and comments? This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    const res = await deleteAccount();
    if (res.ok) {
      window.location.href = "/";
    } else {
      setError(res.error ?? "Could not delete account.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 rounded-lg border border-paper-edge p-4">
      <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
        Your data
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Export everything tied to your account, or delete it permanently.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href="/api/export" className="sd-btn sd-btn--log">
          Export my data
        </a>
        <button onClick={onDelete} disabled={busy} className="sd-btn sd-btn--confirmed">
          {busy ? "Deleting…" : "Delete account"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-stamp">{error}</p>}
    </div>
  );
}
