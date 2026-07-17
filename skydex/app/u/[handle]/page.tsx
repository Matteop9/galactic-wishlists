import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import ProfileSightings from "@/components/ProfileSightings";
import SightingPhoto from "@/components/SightingPhoto";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { type Sighting } from "@/components/SightingCard";
import { RARITY_RANK, RARITY_COLOR } from "@/lib/rarity";
import { airportName } from "@/lib/airports";
import {
  PROFILE_PAGE_SIZE,
  SIGHTING_COLS as COLS,
  type SightingRow as Row,
  makeSightingMapper,
} from "@/lib/profileSightings";

export const dynamic = "force-dynamic";

type Stats = {
  spots_all: number; spots_all_rank: number | null;
  spots_month: number; spots_month_rank: number | null;
  spots_week: number; spots_week_rank: number | null;
  spots_today: number; spots_today_rank: number | null;
  types: number; types_rank: number | null;
  airlines: number; airlines_rank: number | null;
  airports: number; airports_rank: number | null;
  rarity: number; rarity_rank: number | null;
};

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const title = `@${handle} — SkyDex`;
  const description = `@${handle}'s plane-spotting profile — verified catches, rarest finds and collection stats on SkyDex.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
  };
}

function StatTile({ label, value, rank }: { label: string; value: number; rank: number | null }) {
  return (
    <div className="rounded-lg border border-paper-edge bg-paper-deep px-3 py-2.5 text-center">
      <div className="font-display text-2xl font-bold tabular-nums text-ink">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="mt-0.5 font-mono text-[11px] text-sky">{rank ? `#${rank}` : "—"}</div>
    </div>
  );
}

// Compact "rarest catch" tile — rarity rail + reg + tier label, photo if any.
// Opens the standard enriched Lightbox, like every other sighting photo.
function RareCatch({ s }: { s: Sighting }) {
  const color = RARITY_COLOR[s.rarity] ?? "var(--color-paper-edge)";
  return (
    <SightingPhoto sighting={s} className="block w-full text-left transition-transform hover:-translate-y-0.5">
      <span
        className="relative block overflow-hidden rounded-lg border-2 bg-paper-deep"
        style={{ borderColor: color }}
      >
        <span aria-hidden className="absolute inset-y-0 left-0 z-10 w-1.5" style={{ background: color }} />
        <span className="relative block h-[70px] bg-gradient-to-b from-[#9FC0D4] via-[#C4D6DF] to-[#DFE6E0]">
          {s.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.photo_url} alt="" className="h-full w-full object-cover" />
          )}
        </span>
        <span className="block px-2.5 py-1.5">
          <span className="block font-display text-base font-bold leading-none text-ink">
            {s.registration || s.callsign || "Unknown"}
          </span>
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-wide" style={{ color }}>
            {s.rarity}
          </span>
        </span>
      </span>
    </SightingPhoto>
  );
}

export default async function PublicProfile({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();
  const viewer = await getViewer();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle, home_airport, is_admin, avatar_seed, created_at, featured_sighting_ids")
    .eq("handle", handle)
    .maybeSingle();
  if (!profile) notFound();

  const isOwner = viewer.user?.id === profile.id;
  const featuredIds: string[] = profile.featured_sighting_ids ?? [];

  // Rarest catches probe per tier (rarest first) — derived from the user's whole
  // history, not just the 60 recent rows below, so an old legendary never drops off.
  const TIERS = ["legendary", "epic", "rare", "uncommon", "common"] as const;
  const [
    { data: rows, count: totalCount },
    { data: statRows },
    { data: typeData },
    { data: featRows },
    rareTiers,
  ] = await Promise.all([
      supabase
        .from("feed_sightings")
        .select(COLS, { count: "exact" })
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(PROFILE_PAGE_SIZE),
      supabase.rpc("profile_stats", { p_user: profile.id }),
      supabase.from("aircraft_types").select("code, display_name"),
      featuredIds.length
        ? supabase.from("feed_sightings").select(COLS).in("id", featuredIds)
        : Promise.resolve({ data: [] as Row[] }),
      Promise.all(
        TIERS.map((tier) =>
          supabase
            .from("feed_sightings")
            .select(COLS)
            .eq("user_id", profile.id)
            .eq("rarity", tier)
            .order("created_at", { ascending: false })
            .limit(2),
        ),
      ),
    ]);

  const toSighting = makeSightingMapper(
    supabase,
    (typeData ?? []) as { code: string; display_name: string | null }[],
  );

  const sightings = ((rows ?? []) as Row[]).map(toSighting);
  const featById = new Map(((featRows ?? []) as Row[]).map((r) => [r.id, toSighting(r)]));
  const featured = featuredIds.map((id) => featById.get(id)).filter(Boolean) as Sighting[];

  const stats = (statRows as Stats[] | null)?.[0] ?? null;
  const since = new Date(profile.created_at).toLocaleString("en-GB", {
    month: "short",
    year: "numeric",
  }).toUpperCase();

  // Two rarest catches for the headline strip (tiers already probed rarest-first).
  const rarest = rareTiers
    .flatMap(({ data }) => ((data ?? []) as Row[]).map(toSighting))
    .sort((a, b) => (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0))
    .slice(0, 2);

  const homeName = airportName(profile.home_airport);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
      {/* cover band — a flight chart: dotted grid, dashed route arcing to a
          plane top-right, home-base code stamped top-left. Bottom-left stays
          clear for the overlapping avatar. */}
      <div className="relative h-28 overflow-hidden rounded-xl bg-gradient-to-r from-sky to-sky-deep">
        {/* faint chart-paper dot grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(var(--color-paper) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        {/* home-base watermark — bottom-right, clear of the avatar (bottom-left)
            and the plane (top-right) */}
        {profile.home_airport && (
          <span
            aria-hidden
            className="absolute bottom-3 right-28 select-none font-display text-4xl font-bold uppercase tracking-[0.18em] text-paper/15"
          >
            {profile.home_airport}
          </span>
        )}
        {/* dashed route line, climbing towards the plane */}
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 640 112"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M-10 100 C 170 96, 380 78, 566 34"
            stroke="var(--color-paper)"
            strokeOpacity="0.4"
            strokeWidth="2"
            strokeDasharray="1.5 9"
            strokeLinecap="round"
          />
        </svg>
        {/* the plane, on the route, fully inside the band */}
        <svg
          aria-hidden
          className="absolute right-6 top-2.5 rotate-[62deg]"
          width="58"
          height="58"
          viewBox="0 0 64 64"
          fill="var(--color-paper)"
          fillOpacity="0.65"
        >
          <path d="M32 8 l3.5 21 l25 10 l0 5 l-25 -6.5 l-2.5 12 l7 5.5 l0 3 l-8 -2.5 l-8 2.5 l0 -3 l7 -5.5 l-2.5 -12 l-25 6.5 l0 -5 l25 -10 z" />
        </svg>
      </div>

      {/* avatar overlaps the band; handle + meta + edit */}
      <div className="flex items-end gap-4 px-1">
        <span className="-mt-10 shrink-0 rounded-full border-4 border-paper bg-paper shadow-[0_4px_10px_rgba(32,38,43,0.2)]">
          <Avatar seed={profile.avatar_seed ?? profile.handle} admin={Boolean(profile.is_admin)} size={78} />
        </span>
        <div className="min-w-0 flex-1 pb-1">
          <h1 className="truncate font-display text-3xl font-bold leading-none tracking-tight text-ink">
            @{profile.handle}
          </h1>
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
            {profile.home_airport ? `${profile.home_airport} · ` : ""}SINCE {since}
          </p>
        </div>
        {isOwner && (
          <a href="/settings" className="mb-1 sd-btn sd-btn--log !px-3.5 !py-1.5 !text-xs">
            Edit
          </a>
        )}
      </div>

      {/* stat strip */}
      <div className="mt-4 flex overflow-hidden rounded-lg border border-paper-edge bg-paper-deep">
        {([
          { label: "Sightings", value: String(stats?.spots_all ?? sightings.length), accent: false },
          { label: "Types", value: String(stats?.types ?? 0), accent: false },
          { label: "Rank", value: stats?.spots_all_rank ? `#${stats.spots_all_rank}` : "—", accent: true },
        ] as const).map((cell, i) => (
          <div
            key={cell.label}
            className={`flex-1 px-3 py-3 text-center ${i < 2 ? "border-r border-paper-edge" : ""}`}
          >
            <div
              className={`font-display text-2xl font-bold leading-none ${
                cell.accent ? "text-brass" : "text-ink"
              }`}
            >
              {cell.value}
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-ink-soft">
              {cell.label}
            </div>
          </div>
        ))}
      </div>

      {/* home base luggage tag */}
      {profile.home_airport && (
        <div className="mt-4 flex items-center gap-2.5">
          <span className="relative rounded-[5px] bg-ink py-1.5 pl-5 pr-3.5 font-display text-base font-bold tracking-wide text-paper">
            <span
              aria-hidden
              className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-paper"
            />
            {profile.home_airport}
          </span>
          <span className="text-sm text-ink-soft">
            Home base{homeName ? ` · ${homeName}` : ""}
          </span>
        </div>
      )}

      {/* rarest catches */}
      {rarest.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-paper-edge pb-1.5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-ink-soft">
            Rarest catches
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {rarest.map((s) => (
              <RareCatch key={s.id} s={s} />
            ))}
          </div>
        </section>
      )}

      {/* favourites tray + medals/stats + paged history (pin state is client-side) */}
      <ProfileSightings
        initialSightings={sightings}
        featuredSightings={featured}
        isOwner={isOwner}
        userId={profile.id}
        total={totalCount ?? sightings.length}
      >
        {/* medals (placeholder until achievements ship) */}
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink-soft">
            Medals
          </h2>
          <div className="mt-3 rounded-lg border border-dashed border-paper-edge px-4 py-6 text-center font-mono text-xs text-ink-faint">
            Medals are coming soon — earn them by topping the boards and hitting milestones.
          </div>
        </section>

        {/* stats */}
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink-soft">
            Stats <span className="font-mono text-xs normal-case text-ink-faint">· value · rank</span>
          </h2>
          {stats ? (
            <>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-ink-faint">Spots</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label="All time" value={stats.spots_all} rank={stats.spots_all_rank} />
                <StatTile label="This month" value={stats.spots_month} rank={stats.spots_month_rank} />
                <StatTile label="This week" value={stats.spots_week} rank={stats.spots_week_rank} />
                <StatTile label="Today" value={stats.spots_today} rank={stats.spots_today_rank} />
              </div>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-wide text-ink-faint">Collection</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label="Types" value={stats.types} rank={stats.types_rank} />
                <StatTile label="Carriers" value={stats.airlines} rank={stats.airlines_rank} />
                <StatTile label="Airports" value={stats.airports} rank={stats.airports_rank} />
                <StatTile label="Rarity" value={stats.rarity} rank={stats.rarity_rank} />
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-faint">No verified sightings yet.</p>
          )}
        </section>
      </ProfileSightings>
    </main>
  );
}
