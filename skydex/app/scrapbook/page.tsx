import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type Sighting } from "@/components/SightingCard";
import SightingBrowser from "@/components/SightingBrowser";
import ProgressWheel from "@/components/ProgressWheel";
import AirportCode from "@/components/AirportCode";
import { RARITY_TIERS, RARITY_RANK, RARITY_COLOR } from "@/lib/rarity";
import { SPECIAL_LIVERIES, SPECIAL_LIVERIES_COUNT, normalizeReg } from "@/lib/specialLiveries";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  photo_path: string | null;
  captured_at: string;
  callsign: string | null;
  registration: string | null;
  aircraft_type: string | null;
  airline: string | null;
  altitude_m: number | null;
  rarity: string;
  verified: boolean;
  origin: string | null;
  destination: string | null;
};

export default async function ScrapbookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: sightingData }, { data: typeData }, { data: airlineData }] =
    await Promise.all([
      supabase
        .from("sightings")
        .select(
          "id, photo_path, captured_at, callsign, registration, aircraft_type, airline, altitude_m, rarity, verified, origin, destination",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false }),
      supabase.from("aircraft_types").select("code, name, display_name, rarity"),
      supabase.from("airlines").select("name"),
    ]);

  const rows = (sightingData ?? []) as Row[];
  const types = (typeData ?? []) as {
    code: string;
    name: string;
    display_name: string | null;
    rarity: string;
  }[];
  const airlines = (airlineData ?? []) as { name: string }[];
  const typeName = new Map(types.map((t) => [t.code, t.display_name ?? t.code]));

  const sightings: Sighting[] = rows.map((r) => ({
    ...r,
    aircraft_type: r.aircraft_type
      ? typeName.get(r.aircraft_type) ?? r.aircraft_type
      : null,
    photo_url: r.photo_path
      ? supabase.storage.from("sightings").getPublicUrl(r.photo_path).data.publicUrl
      : null,
  }));

  // Collected sets.
  const collectedTypes = new Set(rows.map((r) => r.aircraft_type).filter(Boolean));
  const collectedAirlines = new Set(rows.map((r) => r.airline).filter(Boolean) as string[]);
  const liverySet = new Set(SPECIAL_LIVERIES.map((l) => normalizeReg(l.reg)));
  const collectedLiveries = new Set(
    rows.map((r) => normalizeReg(r.registration)).filter((k) => k && liverySet.has(k)),
  ).size;

  // Totals by rarity tier (guard stray values not in the known tiers).
  const rarityCounts: Record<string, number> = {};
  for (const r of rows) {
    if (RARITY_RANK[r.rarity] != null) {
      rarityCounts[r.rarity] = (rarityCounts[r.rarity] ?? 0) + 1;
    }
  }

  // Airports collected, by leg — counted per code, sorted most-seen first.
  // (No universe to tick off against: the airport list is too large to seed.)
  const airportCounts = (key: "origin" | "destination") => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const code = r[key];
      if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  const departures = airportCounts("origin");
  const destinations = airportCounts("destination");

  if (rows.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <h1 className="border-b border-paper-edge pb-2 font-display text-3xl font-bold tracking-tight">
          Scrapbook
        </h1>
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-paper-edge p-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tag.svg" alt="" className="sd-tag-swing h-32 w-auto opacity-90" />
          <p className="mt-4 text-ink-soft">Your logbook is empty.</p>
          <Link href="/spot" className="sd-btn sd-btn--capture mt-5 inline-flex">
            Spot your first aircraft
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-paper-edge pb-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Scrapbook</h1>
        <Link href="/books" className="sd-btn sd-btn--log !px-4 !py-2 !text-sm">
          Open as book
        </Link>
      </div>

      {/* hero — completion is the front-and-centre of the scrapbook */}
      <div className="mt-6 rounded-lg border border-paper-edge bg-paper-deep p-5">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5 sm:justify-start">
          <ProgressWheel value={collectedTypes.size} total={types.length} label="Types" />
          <ProgressWheel value={collectedAirlines.size} total={airlines.length} label="Carriers" />
          <Link href="/liveries" className="transition-opacity hover:opacity-80">
            <ProgressWheel
              value={collectedLiveries}
              total={SPECIAL_LIVERIES_COUNT}
              label="Liveries"
              color="var(--color-brass)"
            />
          </Link>
          <div className="text-center sm:text-left">
            <div className="font-display text-3xl font-bold text-ink">{rows.length}</div>
            <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              Sightings
            </div>
          </div>
        </div>

        {/* totals by rarity — stacked bar + per-tier counts (replaces the old legend) */}
        <div className="mt-6 border-t border-paper-edge pt-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-paper-edge">
            {RARITY_TIERS.map((t) =>
              (rarityCounts[t] ?? 0) > 0 ? (
                <span key={t} style={{ flexGrow: rarityCounts[t], background: RARITY_COLOR[t] }} />
              ) : null,
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
            {RARITY_TIERS.map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ background: RARITY_COLOR[t] }} />
                {t} <b className="font-semibold text-ink">{rarityCounts[t] ?? 0}</b>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* The books — luggage-tag tabs into the universe to tick off */}
      <h2 className="mt-9 border-b border-paper-edge pb-1.5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-ink-soft">
        The books
      </h2>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {([
          { book: "type", label: "Types", dot: "var(--color-ink)", got: collectedTypes.size, total: types.length },
          { book: "airline", label: "Carriers", dot: "var(--color-brass)", got: collectedAirlines.size, total: airlines.length },
          { book: "rarity", label: "Rarity", dot: "var(--color-stamp)", got: collectedTypes.size, total: types.length },
        ] as const).map((t) => (
          <Link
            key={t.book}
            href={`/books?book=${t.book}`}
            className="group relative flex items-center gap-2 rounded-[5px] border border-paper-edge bg-paper-deep py-2 pl-6 pr-3.5 font-display text-sm font-semibold uppercase tracking-wide text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            <span
              aria-hidden
              className="absolute left-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
              style={{ background: t.dot }}
            />
            {t.label}
            <span className="font-mono text-xs font-normal normal-case text-ink-faint">
              {t.got}/{t.total}
            </span>
          </Link>
        ))}
      </div>

      {/* Airports seen — no universe to tick off, so shown as a tally, not a book */}
      {([
        { label: "Departures", data: departures },
        { label: "Destinations", data: destinations },
      ] as const).map(({ label, data }) =>
        data.length > 0 ? (
          <div key={label} className="mt-6">
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
              {label} <span className="text-ink-soft">· {data.length}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.map(([code, count]) => (
                <AirportCode
                  key={code}
                  code={code}
                  count={count}
                  className="rounded-md border border-sky bg-sky-tint px-2.5 py-1 font-mono text-xs font-semibold text-sky-deep"
                />
              ))}
            </div>
          </div>
        ) : null,
      )}

      {/* Cards */}
      <h2 className="mt-10 font-display text-xl font-semibold uppercase tracking-wide text-ink-soft">
        Cards
      </h2>
      <div className="mt-4">
        <SightingBrowser sightings={sightings} showVerifiedToggle canDelete />
      </div>
    </main>
  );
}
