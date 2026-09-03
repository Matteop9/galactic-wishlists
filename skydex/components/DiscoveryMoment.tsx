"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import ShareButton from "@/components/ShareButton";
import SightingPhoto from "@/components/SightingPhoto";
import AdSlot from "@/components/AdSlot";
import { TicketGlyph } from "@/components/TicketChip";
import { type Sighting } from "@/components/SightingCard";
import { useDialog } from "@/components/useDialog";
import { type CaptureTickets } from "@/lib/tickets";
import { RARITY_COLOR } from "@/lib/rarity";
import { celebrationHeadline, celebrationTier } from "@/lib/celebration";

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
  /** Server celebration flags (v1.0.7+; optional so older responses still render). */
  firstCatch?: boolean;
  newRarityTier?: boolean;
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
  mascotSlot,
}: {
  result: DiscoveryResult;
  onClose: () => void;
  /** Delete this just-saved catch and return to the camera. */
  onRetake?: () => Promise<{ ok?: boolean; error?: string }>;
  /** Optional companion (the mascot, once designed) — shown for tier ≥ 2 only. */
  mascotSlot?: ReactNode;
}) {
  const [pop, setPop] = useState<Popularity | null>(null);
  const [retaking, setRetaking] = useState(false);
  // Two-step inline confirm — a native window.confirm here interrupts the
  // camera stream in WKWebView (the delete → frozen-preview bug).
  const [confirmRetake, setConfirmRetake] = useState(false);
  const [retakeError, setRetakeError] = useState<string | null>(null);
  const dialogRef = useDialog(onClose);

  // How loud to be. Decided once, from server facts only — never from `pop`,
  // which lands a beat later (see lib/celebration.ts).
  const tier = celebrationTier(result);

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

  // A short buzz where the web platform allows it (Android Chrome). iOS never
  // implemented navigator.vibrate, so this is a silent no-op there — real iOS
  // haptics need @capacitor/haptics + a native rebuild (deferred).
  // Sound: intentionally none — SkyDex is used outdoors, in public.
  useEffect(() => {
    if (tier < 2) return;
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(tier === 3 ? [30, 40, 30] : 20);
      }
    } catch {
      /* ignore */
    }
  }, [tier]);

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

  // Tier 2+: the numbers tick up instead of just appearing.
  const today = useCountUp(pop?.today ?? null, tier >= 2);
  const week = useCountUp(pop?.week ?? null, tier >= 2);
  const month = useCountUp(pop?.month ?? null, tier >= 2);
  const ever = useCountUp(pop?.ever ?? null, tier >= 2);

  const stat = (label: string, n: number | null) => (
    <div className="flex flex-col items-center">
      <span className="font-display text-2xl font-bold tabular-nums text-ink">
        {n == null ? "·" : n}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  );

  const rarityColor = RARITY_COLOR[result.rarity] ?? "var(--color-brass)";

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
      {tier === 3 && <ConfettiLayer />}

      <div
        className="sd-card-rise w-full max-w-sm rounded-xl border border-paper-edge bg-paper-deep p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center font-display text-sm font-bold uppercase tracking-[0.2em] text-stamp">
          {celebrationHeadline(result, tier)}
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
          } ${result.photoUrl ? "" : "h-44"}`}
        >
          {result.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.photoUrl} alt="" className="h-44 w-full object-cover" />
          )}
          {tier >= 2 && (
            // The bloom sits behind the stamp and takes the tier's own colour.
            <span
              aria-hidden
              className="sd-burst absolute left-3 top-3 h-16 w-16 rounded-full border-[3px]"
              style={{ borderColor: rarityColor }}
            />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/stamps/${result.rarity}.svg`}
            alt={result.rarity}
            className={`absolute left-3 top-3 h-16 w-16 ${tier >= 1 ? "sd-stamp-thunk" : ""}`}
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
                className="sd-card-rise rounded-full border border-sky bg-sky/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink"
                style={{ animationDelay: `${350 + i * 90}ms` }}
              >
                New {c.k} · {c.v}
              </span>
            ))}
          </div>
        )}

        {tier >= 2 && mascotSlot && <div className="mt-4 flex justify-center">{mascotSlot}</div>}

        {hero && (
          <p
            className={`mt-4 text-center font-display text-lg font-semibold leading-snug text-ink ${
              tier === 3 ? "sd-hero-reveal" : ""
            }`}
          >
            {hero}
          </p>
        )}

        <div className="mt-4 grid grid-cols-4 gap-1 border-t border-paper-edge pt-3">
          {stat("Today", today)}
          {stat("Week", week)}
          {stat("Month", month)}
          {stat("Ever", ever)}
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
          <div className="mt-3 text-center font-mono text-[11px] uppercase tracking-wide">
            {!confirmRetake ? (
              <button
                onClick={() => setConfirmRetake(true)}
                className="text-ink-faint underline decoration-dotted underline-offset-2 hover:text-stamp"
              >
                Retake — delete this catch
              </button>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <span className="text-ink-faint">Delete this catch?</span>
                <button
                  onClick={async () => {
                    setRetaking(true);
                    setRetakeError(null);
                    try {
                      const res = await onRetake();
                      if (res?.error) setRetakeError(res.error);
                    } finally {
                      setRetaking(false);
                    }
                  }}
                  disabled={retaking}
                  className="text-stamp underline decoration-dotted underline-offset-2 disabled:opacity-60"
                >
                  {retaking ? "Removing…" : "Delete it"}
                </button>
                <button
                  onClick={() => {
                    setConfirmRetake(false);
                    setRetakeError(null);
                  }}
                  disabled={retaking}
                  className="text-ink-faint underline decoration-dotted underline-offset-2 hover:text-ink disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            )}
            {retakeError && <p className="mt-1 normal-case text-stamp">{retakeError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Ticks from 0 up to `target` once it arrives (~700 ms, ease-out). When
 * `active` is false it returns the target untouched so tiers 0–1 pay nothing.
 * Honours prefers-reduced-motion by jumping straight to the value.
 */
function useCountUp(target: number | null, active: boolean): number | null {
  const [shown, setShown] = useState<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!active || target == null || started.current) return;
    started.current = true;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Reduced motion: dur 0 → the first frame lands on the target.
    const dur = reduce ? 0 : 700;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = dur === 0 ? 1 : Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);

  return active ? shown : target;
}

const CONFETTI_COLOURS = [
  "var(--color-brass)",
  "var(--color-sky)",
  "var(--color-stamp)",
  "var(--color-paper-deep)",
  "var(--color-paper)",
];
const CONFETTI_COUNT = 40;

/**
 * Tier-3 paper confetti — no library. Forty transform/opacity-only spans,
 * randomised once on mount, that unmount themselves after the last piece lands
 * (or the moment the page is hidden, so a backgrounded WebView never sees a
 * second drop on resume). Hidden entirely under prefers-reduced-motion via CSS.
 */
type ConfettiPiece = {
  x: string;
  drift: string;
  r0: string;
  r1: string;
  dur: string;
  delay: string;
  colour: string;
  wide: boolean;
};

// Deterministic "scatter" — golden-ratio and prime strides spread the pieces
// evenly-but-irregularly across the viewport with no Math.random, so this is
// pure (React render rules) and identical on every drop.
const CONFETTI: ConfettiPiece[] = Array.from({ length: CONFETTI_COUNT }, (_, i) => {
  const g = (i * 0.618033988749) % 1;
  return {
    x: `${(g * 100).toFixed(1)}vw`,
    drift: `${(((i * 37) % 24) - 12).toFixed(0)}vw`,
    r0: `${(i * 137) % 360}deg`,
    r1: `${540 + ((i * 211) % 360)}deg`,
    dur: `${(1.7 + ((i * 7) % 10) / 11).toFixed(2)}s`,
    delay: `${(i * 53) % 450}ms`,
    colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
    wide: i % 3 === 0,
  };
});

function ConfettiLayer() {
  const [show, setShow] = useState(true);
  const pieces = CONFETTI;

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3200); // max dur + delay + a beat
    const onVis = () => {
      if (document.visibilityState === "hidden") setShow(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!show) return null;
  return (
    <div className="sd-confetti-layer" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="sd-confetti-piece"
          style={
            {
              "--x": p.x,
              "--drift": p.drift,
              "--r0": p.r0,
              "--r1": p.r1,
              "--dur": p.dur,
              "--delay": p.delay,
              background: p.colour,
              width: p.wide ? 11 : 7,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
