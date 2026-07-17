import Link from "next/link";
import { airlineFromCallsign } from "@/lib/airlines";
import Avatar from "@/components/Avatar";
import AirportCode from "@/components/AirportCode";
import { RARITY_COLOR } from "@/lib/rarity";
import { specialLivery } from "@/lib/specialLiveries";

export type Sighting = {
  id: string;
  photo_url: string | null;
  captured_at: string;
  callsign: string | null;
  registration: string | null;
  aircraft_type: string | null;
  airline: string | null;
  altitude_m: number | null;
  rarity: string;
  verified: boolean;
  handle?: string | null;
  avatar_seed?: string | null;
  is_admin?: boolean | null;
  origin?: string | null;
  destination?: string | null;
  flight_no?: string | null;
  painted_as?: string | null;
  operating_as?: string | null;
  eta?: string | null;
  gspeed_kt?: number | null;
  vspeed_fpm?: number | null;
};

// Times render in UTC ("Zulu"), the aviation convention — and, unlike
// toLocaleString, identical on server and client, so cards don't flash a
// hydration-mismatched hour on load.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const two = (n: number) => String(n).padStart(2, "0");
function zuluTime(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${two(d.getUTCHours())}:${two(d.getUTCMinutes())}Z`;
}
function zuluDateTime(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${zuluTime(iso)}`;
}

// The card's info block — reg headline, type · airline, linked spotter, and the
// mono spec grid. Shared with the Lightbox so "the same card and info" shows
// everywhere a sighting opens (UI convention — see AGENTS.md). `dark` restyles
// it for the Lightbox's ink backdrop.
export function SightingSpecs({ s, dark = false }: { s: Sighting; dark?: boolean }) {
  const airline = s.airline ?? airlineFromCallsign(s.callsign);
  const livery = specialLivery(s.registration);
  const altFt = s.altitude_m != null ? Math.round(s.altitude_m / 0.3048) : null;
  const flightNo = s.flight_no || s.callsign;
  // Flight state at the moment of capture (from FR24): climb/cruise/descent + speed.
  const phase =
    s.vspeed_fpm != null
      ? s.vspeed_fpm > 300
        ? "Climbing"
        : s.vspeed_fpm < -300
          ? "Descending"
          : "Cruising"
      : null;
  const eta = s.eta ? zuluTime(s.eta) : null;
  const seen = zuluDateTime(s.captured_at) ?? s.captured_at;

  const c = dark
    ? { head: "text-paper", sub: "text-paper/70", rule: "border-paper/25", strong: "text-paper" }
    : { head: "text-ink", sub: "text-ink-soft", rule: "border-paper-edge", strong: "text-ink" };

  return (
    <>
      <div className={`font-display text-2xl font-bold tracking-wide ${c.head}`}>
        {s.registration || s.callsign || "Unknown"}
      </div>
      <div className={`font-serif text-sm ${c.sub}`}>
        {[s.aircraft_type, airline].filter(Boolean).join(" · ") || "—"}
      </div>
      {s.handle ? (
        <Link
          href={`/u/${s.handle}`}
          className="mb-2.5 flex items-center gap-1.5 hover:underline"
        >
          <Avatar seed={s.avatar_seed ?? s.handle} admin={Boolean(s.is_admin)} size={18} />
          <span className="font-mono text-xs text-sky">@{s.handle}</span>
        </Link>
      ) : (
        <div className="mb-2.5" />
      )}
      <div className={`grid gap-0.5 border-t pt-2.5 font-mono text-[11px] ${c.rule} ${c.sub}`}>
        {flightNo && (
          <div>
            FLIGHT&nbsp;&nbsp;<b className={`font-semibold ${c.strong}`}>{flightNo}</b>
          </div>
        )}
        {altFt != null && (
          <div>
            ALT&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            <b className={`font-semibold ${c.strong}`}>{altFt.toLocaleString()} ft</b>
          </div>
        )}
        {phase && (
          <div>
            PHASE&nbsp;&nbsp;
            <b className={`font-semibold ${c.strong}`}>
              {phase}
              {s.gspeed_kt != null ? ` · ${s.gspeed_kt} kt` : ""}
            </b>
          </div>
        )}
        {(s.origin || s.destination) && (
          <div className="flex items-center gap-1.5">
            ROUTE&nbsp;&nbsp;
            <b className={`font-semibold ${c.strong}`}>
              {s.origin ? <AirportCode code={s.origin} /> : "—"}
              {" → "}
              {s.destination ? <AirportCode code={s.destination} /> : "—"}
            </b>
          </div>
        )}
        {eta && (
          <div>
            ETA&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b className={`font-semibold ${c.strong}`}>{eta}</b>
          </div>
        )}
        <div>
          RARITY&nbsp;&nbsp;
          <b className={`font-semibold uppercase ${c.strong}`}>{s.rarity}</b>
        </div>
        {livery && (
          <div>
            LIVERY&nbsp;&nbsp;<b className="font-semibold text-brass">{livery.livery}</b>
          </div>
        )}
        <div>
          SEEN&nbsp;&nbsp;&nbsp;&nbsp;<b className={`font-semibold ${c.strong}`}>{seen}</b>
        </div>
      </div>
    </>
  );
}

export default function SightingCard({ s, onOpen }: { s: Sighting; onOpen?: () => void }) {
  const livery = specialLivery(s.registration);
  const wetLease = Boolean(
    s.painted_as && s.operating_as && s.painted_as !== s.operating_as,
  );
  const rarityColor = RARITY_COLOR[s.rarity] ?? "var(--color-paper-edge)";

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-paper-deep shadow-[0_8px_24px_rgba(32,38,43,0.16)] ${
        livery ? "sd-livery border-[3px]" : "border-2"
      }`}
      style={livery ? undefined : { borderColor: rarityColor }}
    >
      {/* rarity rail — a coloured spine down the left edge (skipped on livery
          cards, which carry their own animated border as the signal) */}
      {!livery && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 z-10 w-1.5"
          style={{ background: rarityColor }}
        />
      )}
      <div
        className={`relative h-40 bg-gradient-to-b from-[#9FC0D4] via-[#C4D6DF] to-[#DFE6E0] ${
          onOpen && s.photo_url ? "cursor-zoom-in" : ""
        }`}
        onClick={onOpen && s.photo_url ? onOpen : undefined}
        {...(onOpen && s.photo_url
          ? {
              role: "button" as const,
              tabIndex: 0,
              "aria-label": `View photo of ${s.registration || s.callsign || "sighting"}`,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen();
                }
              },
            }
          : {})}
      >
        {s.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.photo_url}
            alt={`Sighting photo of ${s.registration || s.callsign || "an aircraft"}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/stamps/${s.rarity}.svg`}
          alt={s.rarity}
          className="absolute left-3 top-3 h-16 w-16"
        />
        {s.verified && (
          <span className="absolute right-3 top-3 flex h-16 w-16 -rotate-12 items-center justify-center rounded-full border-2 border-stamp bg-paper/70 text-center font-mono text-[8px] font-semibold leading-tight tracking-wider text-stamp">
            VERIFIED
            <br />
            SIGHTING
          </span>
        )}
        {livery && (
          <span className="sd-livery-badge absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border border-brass bg-paper/85 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-brass">
            ✦ Special Livery
          </span>
        )}
        {wetLease && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-sky bg-paper/85 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-sky">
            Wet-lease
          </span>
        )}
      </div>

      <div className="px-4 pb-4 pt-3">
        <SightingSpecs s={s} />
      </div>
    </div>
  );
}
