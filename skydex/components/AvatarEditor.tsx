"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import {
  AVATAR_COLORS,
  MOTIFS,
  TREATMENTS,
  avatarParts,
  composeAvatarSeed,
} from "@/lib/avatar";
import { updateAvatar } from "@/app/profile/actions";

// Build-your-own avatar (feedback 2026-07-17): pick the icon, background and
// icon colour, and ring style directly — Shuffle remains for the indecisive.
// Legacy hash avatars prefill to their nearest structured equivalent.

type Picks = { motif: number; bg: number; fg: number; treatment: number };

const TREATMENT_LABELS: Record<(typeof TREATMENTS)[number], string> = {
  solid: "Solid",
  roundel: "Roundel",
  stamp: "Stamp",
};

export default function AvatarEditor({
  initialSeed,
  canEditNow,
  admin = false,
}: {
  initialSeed: string;
  canEditNow: boolean;
  admin?: boolean;
}) {
  const [picks, setPicks] = useState<Picks>(() => {
    const p = avatarParts(initialSeed);
    return { motif: p.motif, bg: p.bg, fg: p.fg, treatment: p.treatment };
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const seed = composeAvatarSeed(picks.motif, picks.bg, picks.fg, picks.treatment);
  // Compare parts, not seed strings — re-saving the structured form of an
  // unchanged legacy avatar shouldn't burn the once-a-day save.
  const initial = avatarParts(initialSeed);
  const changed =
    picks.motif !== initial.motif ||
    picks.bg !== initial.bg ||
    picks.fg !== initial.fg ||
    picks.treatment !== initial.treatment;

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

  function shuffle() {
    const motif = Math.floor(Math.random() * MOTIFS.length);
    const bg = Math.floor(Math.random() * AVATAR_COLORS.length);
    let fg = Math.floor(Math.random() * AVATAR_COLORS.length);
    if (fg === bg) fg = (fg + 1) % AVATAR_COLORS.length;
    const treatment = Math.floor(Math.random() * TREATMENTS.length);
    setPicks({ motif, bg, fg, treatment });
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

  // Round two-layer swatch: disc = the colour, ring marks the selection.
  const swatch = (colour: string, selected: boolean, disabled: boolean, onPick: () => void, label: string) => (
    <button
      key={colour + label}
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
      title={disabled ? "Background and icon can't share a colour" : label}
      className={`h-8 w-8 rounded-full border-2 transition ${
        selected ? "border-ink ring-2 ring-sky" : "border-paper-edge"
      } ${disabled ? "cursor-not-allowed opacity-25" : "hover:border-ink"}`}
      style={{ background: colour }}
    />
  );

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-lg border border-paper-edge p-4">
      <div className="flex items-center gap-4">
        <Avatar seed={seed} size={96} />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={shuffle} className="sd-btn sd-btn--log !px-4 !py-2 !text-sm">
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
            <p className="text-xs text-ink-faint">Pick an icon, colours and style, then save.</p>
          )}
          {msg && <p className="text-xs text-stamp">{msg}</p>}
        </div>
      </div>

      <div>
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-faint">Icon</p>
        <div className="grid grid-cols-6 gap-1.5">
          {MOTIFS.map((name, i) => (
            <button
              key={name}
              type="button"
              onClick={() => setPicks((p) => ({ ...p, motif: i }))}
              aria-pressed={picks.motif === i}
              aria-label={name.replace(/_/g, " ")}
              title={name.replace(/_/g, " ")}
              className={`rounded-lg border-2 p-0.5 leading-none transition ${
                picks.motif === i ? "border-ink ring-2 ring-sky" : "border-transparent hover:border-paper-edge"
              }`}
            >
              <Avatar
                seed={composeAvatarSeed(i, picks.bg, picks.fg, picks.treatment)}
                size={40}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-faint">Background</p>
        <div className="flex flex-wrap gap-1.5">
          {AVATAR_COLORS.map((c, i) =>
            swatch(c, picks.bg === i, picks.fg === i, () => setPicks((p) => ({ ...p, bg: i })), `Background colour ${i + 1}`),
          )}
        </div>
      </div>

      <div>
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-faint">Icon colour</p>
        <div className="flex flex-wrap gap-1.5">
          {AVATAR_COLORS.map((c, i) =>
            swatch(c, picks.fg === i, picks.bg === i, () => setPicks((p) => ({ ...p, fg: i })), `Icon colour ${i + 1}`),
          )}
        </div>
      </div>

      <div>
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-faint">Style</p>
        <div className="flex gap-1.5">
          {TREATMENTS.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setPicks((p) => ({ ...p, treatment: i }))}
              aria-pressed={picks.treatment === i}
              className={`rounded-lg border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wide ${
                picks.treatment === i
                  ? "border-ink bg-ink text-paper"
                  : "border-paper-edge text-ink-soft hover:border-ink"
              }`}
            >
              {TREATMENT_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
