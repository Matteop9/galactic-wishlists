"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ShareButton from "@/components/ShareButton";
import SightingPhoto from "@/components/SightingPhoto";
import AdSlot from "@/components/AdSlot";
import { TicketGlyph } from "@/components/TicketChip";
import { type Sighting } from "@/components/SightingCard";
import { useDialog } from "@/components/useDialog";
import { type CaptureTickets } from "@/lib/tickets";

export type DiscoveryResult = {
  id: string;
  photoUrl: string | null;
  label: string; // registration / callsign
  typeCode: string | null;
  typeName: string | null;
  airline: string | null;
  origin: string | null;
  destination: string | null;
  rarity: string;
  discoveries: { type: boolean; airline: boolean; origin: boolean; destination: boolean };
  specialLivery: string | null; // livery name when this airframe is a known special livery
  sighting: Sighting; // the saved row — feeds the standard Lightbox on photo tap
  tickets?: CaptureTickets | null; // spend/quota info from /api/sightings (null pre-economy)
};

type Popularity = {
  today: number;
  week: number;
  month: number;
  ever: number;
  total_spotters: number;
  pct: number;
};

export default function DiscoveryMoment({
  result,
  onClose,
  onRetake,
}: {
  result: DiscoveryResult;
  onClose: () => void;
  /** Delete this just-saved catch and return to the camera. */
  onRetake?: () => Promise<void>;
}) {
  const [pop, setPop] = useState<Popularity | null>(null);
  const [retaking, setRetaking] = useState(false);
  const dialogRef = useDialog(onClose);

  // Just-in-time: the screen renders instantly, the numbers fill in a beat later.
  useEffect(() => {
    if (!result.typeCode) return;
    let cancelled = false;
    createClient()
      .rpc("type_popularity", { p_type: result.typeCode })
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (!cancelled && row) setPop(row as Popularity);
      });
    return () => {
      cancelled = true;
    };
  }, [result.typeCode]);

  const d = result.discoveries;
  const newChips = [
    d.type && { k: "TYPE", v: result.typeName ?? result.typeCode },
    d.airline && { k: "CARRIER", v: result.airline },
    d.origin && { k: "DEPARTURE", v: result.origin },
    d.destination && { k: "DESTINATION", v: result.destination },
  ].filter(Boolean) as { k: string; v: string | null }[];
  const isNew = newChips.length > 0;

  // Hero line — counts include this just-made capture, so 1 == "only you".
  let hero: string | null = null;
  if (pop) {
    if (pop.ever <= 1) hero = "You're the only one in the world to have caught this ✦";
    else if (pop.today <= 1) hero = "First to catch one today!";
    else hero = `You're one of ${pop.week} spotters this week`;
  }

  const stat = (label: string, n: number | null) => (
    <div className="flex flex-col items-center">
      <span className="font-display text-2xl font-bold tabular-nums text-ink">
        {n == null ? "·" : n}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  );

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Sighting captured"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-ink/95 p-4 outline-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-paper-edge bg-paper-deep p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center font-display text-sm font-bold uppercase tracking-[0.2em] text-stamp">
          {isNew ? "New discovery" : "Caught!"}
        </p>

        {result.specialLivery && (
          <p className="sd-livery-badge mt-2 rounded-full border border-brass bg-brass-tint px-3 py-1 text-center font-display text-sm font-bold uppercase tracking-wide text-ink">
            ✦ Special livery — {result.specialLivery}
          </p>
        )}

        <SightingPhoto
          sighting={result.sighting}
          className={`relative mt-3 block w-full overflow-hidden rounded-lg bg-gradient-to-b from-[#9FC0D4] to-[#DFE6E0] text-left ${
            result.specialLivery ? "sd-livery border-[3px]" : ""
          }`}
        >
          {result.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.photoUrl} alt="" className="h-44 w-full object-cover" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/stamps/${result.rarity}.svg`}
            alt={result.rarity}
            className="absolute left-3 top-3 h-16 w-16"
          />
        </SightingPhoto>

        <div className="mt-3 text-center">
          <div className="font-display text-2xl font-bold tracking-wide text-ink">{result.label}</div>
          <div className="font-serif text-sm text-ink-soft">
            {[result.typeName ?? result.typeCode, result.airline].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>

        {isNew && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {newChips.map((c, i) => (
              <span
                key={i}
                className="rounded-full border border-sky bg-sky/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink"
              >
                New {c.k} · {c.v}
              </span>
            ))}
          </div>
        )}

        {hero && (
          <p className="mt-4 text-center font-display text-lg font-semibold leading-snug text-ink">
            {hero}
          </p>
        )}

        <div className="mt-4 grid grid-cols-4 gap-1 border-t border-paper-edge pt-3">
          {stat("Today", pop?.today ?? null)}
          {stat("Week", pop?.week ?? null)}
          {stat("Month", pop?.month ?? null)}
          {stat("Ever", pop?.ever ?? null)}
        </div>

        {pop && pop.pct > 0 && (
          <p className="mt-2 text-center font-mono text-xs text-ink-faint">
            {pop.pct}% of spotters have this type
          </p>
        )}

        {result.tickets && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center font-mono text-xs text-ink-faint">
            <TicketGlyph className="h-3.5 w-3.5 text-brass" />
            {result.tickets.spentTicket
              ? `1 Ticket used · ${result.tickets.balance} left`
              : result.tickets.spotsUsedToday <= result.tickets.freeSpotsPerDay
                ? `Free spot ${result.tickets.spotsUsedToday}/${result.tickets.freeSpotsPerDay} today`
                : `Spot ${result.tickets.spotsUsedToday} today`}
          </p>
        )}

        {/* Phase-5 interstitial point — renders nothing while ads are dark / for Frequent Flyers */}
        <AdSlot placement="post-capture" frequentFlyer={result.tickets?.frequentFlyer} />

        <div className="mt-5 flex items-center justify-center gap-3">
          <ShareButton id={result.id} className="sd-btn sd-btn--log !px-4 !py-2 !text-sm" />
          <a href="/scrapbook" className="sd-btn sd-btn--log !px-4 !py-2 !text-sm">
            Scrapbook
          </a>
          <button onClick={onClose} className="sd-btn sd-btn--capture !px-4 !py-2 !text-sm">
            Spot another
          </button>
        </div>

        {onRetake && (
          <button
            onClick={async () => {
              if (!window.confirm("Delete this catch and return to the camera?")) return;
              setRetaking(true);
              try {
                await onRetake();
              } finally {
                setRetaking(false);
              }
            }}
            disabled={retaking}
            className="mx-auto mt-3 block font-mono text-[11px] uppercase tracking-wide text-ink-faint underline decoration-dotted underline-offset-2 hover:text-stamp disabled:opacity-60"
          >
            {retaking ? "Removing…" : "Retake — delete this catch"}
          </button>
        )}
      </div>
    </div>
  );
}
