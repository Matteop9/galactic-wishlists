"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/useDialog";
import { setBookCover } from "@/app/books/actions";
import { type Sighting } from "@/components/SightingCard";
import SightingPhoto from "@/components/SightingPhoto";

// One ruled slot in a book. Tapping a collected slot's photo opens the standard
// enriched Lightbox (app-wide convention — see AGENTS.md); owners with more
// than one photo get a separate "⋯" button to choose which shot fronts the
// slot. readOnly renders the shared (public) book: no picker, view only.

export type Slot = {
  key: string;
  label: string;
  rarity: string | null;
  photo: string | null;
  // The sighting behind the cover photo — feeds the Lightbox. Null for empty slots.
  cover: Sighting | null;
  // Every photo the owner has of this slot, newest first (empty for viewers
  // of empty slots). id feeds setBookCover; url renders the picker grid.
  options: { id: string; url: string }[];
  coverId: string | null; // currently pinned sighting id, when one is set
};

export default function BookSlot({
  slot,
  kind,
  readOnly = false,
}: {
  slot: Slot;
  kind: "type" | "airline" | "rarity";
  readOnly?: boolean;
}) {
  const [picking, setPicking] = useState(false);
  // Rarity book slots are type slots — covers save under "type" so both books agree.
  const coverKind = kind === "airline" ? "airline" : "type";

  if (!slot.photo) {
    return (
      <div className="overflow-hidden rounded-lg border border-dashed border-paper-edge bg-paper-deep">
        <div className="flex aspect-[4/3] items-center justify-center bg-[repeating-linear-gradient(45deg,rgba(216,201,168,0.3)_0_8px,transparent_8px_16px)]">
          <span className="text-center font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-ink-faint">
            Not yet
            <br />
            spotted
          </span>
        </div>
        <div className="px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-wide text-ink-faint">
          {slot.label}
        </div>
      </div>
    );
  }

  const pickable = !readOnly && slot.options.length > 1;

  const photo = (
    <span className="relative block aspect-[4/3] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slot.photo} alt={slot.label} className="h-full w-full object-cover" />
      {slot.rarity && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/stamps/${slot.rarity}.svg`}
          alt={slot.rarity}
          className="absolute bottom-1 right-1 h-8 w-8"
        />
      )}
    </span>
  );

  return (
    <>
      <div className="relative overflow-hidden rounded-lg border border-paper-edge bg-white shadow-[0_4px_12px_rgba(32,38,43,0.1)] transition-shadow hover:shadow-[0_6px_16px_rgba(32,38,43,0.2)]">
        {slot.cover ? (
          <SightingPhoto sighting={slot.cover} className="block w-full text-left">
            {photo}
          </SightingPhoto>
        ) : (
          photo
        )}
        {pickable && (
          <button
            type="button"
            onClick={() => setPicking(true)}
            title="Choose which photo fronts this slot"
            aria-label={`Choose photo for ${slot.label} (${slot.options.length} available)`}
            className="absolute left-1 top-1 z-10 rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-paper hover:bg-ink"
          >
            ⋯ {slot.options.length} photos
          </button>
        )}
        <div className="px-2 py-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
          {slot.label}
        </div>
      </div>
      {picking && (
        <CoverPicker
          slot={slot}
          kind={coverKind}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}

function CoverPicker({
  slot,
  kind,
  onClose,
}: {
  slot: Slot;
  kind: "type" | "airline";
  onClose: () => void;
}) {
  const dialogRef = useDialog(onClose);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentId = slot.coverId ?? slot.options[0]?.id ?? null;

  async function pick(id: string) {
    if (busy || id === currentId) return;
    setBusy(id);
    setError(null);
    const res = await setBookCover(kind, slot.key, id);
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      setBusy(null);
      setError(res.error ?? "Could not save.");
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Choose photo for ${slot.label}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/60 p-4 outline-none"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border-2 border-ink bg-paper p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-stamp">
          Book photo
        </p>
        <h2 className="mt-0.5 font-display text-xl font-bold tracking-wide text-ink">
          {slot.label}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Pick which of your {slot.options.length} shots fronts this slot.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {slot.options.map((o) => {
            const selected = o.id === currentId;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => pick(o.id)}
                disabled={busy != null}
                className={`relative overflow-hidden rounded-lg border-2 transition ${
                  selected ? "border-sky ring-2 ring-sky/40" : "border-paper-edge hover:border-ink"
                } ${busy && busy !== o.id ? "opacity-50" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.url} alt="" className="aspect-[4/3] w-full object-cover" />
                {selected && (
                  <span className="absolute right-1 top-1 rounded bg-sky px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-paper">
                    Current
                  </span>
                )}
                {busy === o.id && (
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/40 font-mono text-[10px] uppercase tracking-wide text-paper">
                    Saving…
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && <p className="mt-3 text-xs text-stamp">{error}</p>}

        <button onClick={onClose} className="sd-btn sd-btn--log mt-5 w-full justify-center !py-2 !text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
