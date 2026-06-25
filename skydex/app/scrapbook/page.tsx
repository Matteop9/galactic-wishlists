import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type Sighting } from "@/components/SightingCard";
import SightingBrowser from "@/components/SightingBrowser";
import CollectionGrid, { type CollectionItem } from "@/components/CollectionGrid";
import ProgressWheel from "@/components/ProgressWheel";
import AirportCode from "@/components/AirportCode";
import { airlineLogoUrl } from "@/lib/airlines";
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

  const sortedTypes = [...types].sort(
    (a, b) =>
      (RARITY_RANK[a.rarity] ?? 0) - (RARITY_RANK[b.rarity] ?? 0) ||
      a.code.localeCompare(b.code),
  );
  const sortedAirlines = [...airlines].sort((a, b) => a.name.localeCompare(b.name));

  const typeItems: CollectionItem[] = sortedTypes.map((t) => {
    const got = collectedTypes.has(t.code);
    return {
      key: t.code,
      label: t.display_name ?? t.code,
      title: `${t.name} · ${t.rarity}`,
      got,
      className: "rounded-md border px-2.5 py-1 font-mono text-xs font-semibold",
      style: got
        ? {
            background: RARITY_COLOR[t.rarity],
            borderColor: RARITY_COLOR[t.rarity],
            color: "var(--color-paper)",
          }
        : { borderColor: "var(--color-paper-edge)", color: "var(--color-ink-faint)", opacity: 0.55 },
    };
  });

  const carrierItems: CollectionItem[] = sortedAirlines.map((a) => {
    const got = collectedAirlines.has(a.name);
    return {
      key: a.name,
      label: a.name,
      title: a.name,
      got,
      iconUrl: airlineLogoUrl(a.name) ?? undefined,
      className: `rounded-md border px-2.5 py-1 text-xs ${
        got
          ? "border-sky bg-sky-tint font-semibold text-sky-deep"
          : "border-paper-edge text-ink-faint opacity-55"
      }`,
    };
  });

  if (rows.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <h1 className="border-b border-paper-edge pb-2 font-display text-3xl font-bold tracking-tight">
          Scrapbook
        </h1>
        <div className="mt-8 rounded-lg border border-dashed border-paper-edge p-8 text-center">
          <p className="text-ink-soft">Your logbook is empty.</p>
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

      {/* Collections — collapsed by default to keep the page scannable */}
      <details className="group mt-6 rounded-lg border border-paper-edge bg-paper-deep">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <ProgressWheel value={collectedTypes.size} total={types.length} size={46} stroke={6} />
          <span className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
            Types
          </span>
          <span className="font-mono text-sm text-ink-soft">
            {collectedTypes.size}/{types.length}
          </span>
          <span aria-hidden className="ml-auto text-ink-soft transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="border-t border-paper-edge px-4 pb-4 pt-3">
          <CollectionGrid title="Types" items={typeItems} compact />
        </div>
      </details>

      <details className="group mt-4 rounded-lg border border-paper-edge bg-paper-deep">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <ProgressWheel value={collectedAirlines.size} total={airlines.length} size={46} stroke={6} />
          <span className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
            Carriers
          </span>
          <span className="font-mono text-sm text-ink-soft">
            {collectedAirlines.size}/{airlines.length}
          </span>
          <span aria-hidden className="ml-auto text-ink-soft transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="border-t border-paper-edge px-4 pb-4 pt-3">
          <CollectionGrid title="Carriers" items={carrierItems} compact />
        </div>
      </details>

      {([
        { label: "Departures", data: departures },
        { label: "Destinations", data: destinations },
      ] as const).map(({ label, data }) =>
        data.length > 0 ? (
          <details key={label} className="group mt-4 rounded-lg border border-paper-edge bg-paper-deep">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
                {label}
              </span>
              <span className="font-mono text-sm text-ink-soft">{data.length}</span>
              <span aria-hidden className="ml-auto text-ink-soft transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="flex flex-wrap gap-2 border-t border-paper-edge px-4 pb-4 pt-3">
              {data.map(([code, count]) => (
                <AirportCode
                  key={code}
                  code={code}
                  count={count}
                  className="rounded-md border border-sky bg-sky-tint px-2.5 py-1 font-mono text-xs font-semibold text-sky-deep"
                />
              ))}
            </div>
          </details>
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
