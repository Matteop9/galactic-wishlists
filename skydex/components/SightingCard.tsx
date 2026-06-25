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
};

export default function SightingCard({ s, onOpen }: { s: Sighting; onOpen?: () => void }) {
  const airline = s.airline ?? airlineFromCallsign(s.callsign);
  const livery = specialLivery(s.registration);
  const altFt = s.altitude_m != null ? Math.round(s.altitude_m / 0.3048) : null;
  const seen = new Date(s.captured_at).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-paper-deep shadow-[0_8px_24px_rgba(32,38,43,0.16)] ${
        livery ? "sd-livery border-[3px]" : "border-2"
      }`}
      style={livery ? undefined : { borderColor: RARITY_COLOR[s.rarity] ?? "var(--color-paper-edge)" }}
    >
      <div
        className={`relative h-40 bg-gradient-to-b from-[#9FC0D4] via-[#C4D6DF] to-[#DFE6E0] ${
          onOpen && s.photo_url ? "cursor-zoom-in" : ""
        }`}
        onClick={onOpen && s.photo_url ? onOpen : undefined}
      >
        {s.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.photo_url} alt="" className="h-full w-full object-cover" />
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
      </div>

      <div className="px-4 pb-4 pt-3">
        <div className="font-display text-2xl font-bold tracking-wide text-ink">
          {s.registration || s.callsign || "Unknown"}
        </div>
        <div className="font-serif text-sm text-ink-soft">
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
        <div className="grid gap-0.5 border-t border-paper-edge pt-2.5 font-mono text-[11px] text-ink-soft">
          {s.callsign && (
            <div>
              FLIGHT&nbsp;&nbsp;<b className="font-semibold text-ink">{s.callsign}</b>
            </div>
          )}
          {altFt != null && (
            <div>
              ALT&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <b className="font-semibold text-ink">{altFt.toLocaleString()} ft</b>
            </div>
          )}
          {(s.origin || s.destination) && (
            <div className="flex items-center gap-1.5">
              ROUTE&nbsp;&nbsp;
              <b className="font-semibold text-ink">
                {s.origin ? <AirportCode code={s.origin} /> : "—"}
                {" → "}
                {s.destination ? <AirportCode code={s.destination} /> : "—"}
              </b>
            </div>
          )}
          <div>
            RARITY&nbsp;&nbsp;
            <b className="font-semibold uppercase text-ink">{s.rarity}</b>
          </div>
          {livery && (
            <div>
              LIVERY&nbsp;&nbsp;<b className="font-semibold text-brass">{livery.livery}</b>
            </div>
          )}
          <div>
            SEEN&nbsp;&nbsp;&nbsp;&nbsp;<b className="font-semibold text-ink">{seen}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
