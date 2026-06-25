import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import ProfileSightings from "@/components/ProfileSightings";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { type Sighting } from "@/components/SightingCard";

export const dynamic = "force-dynamic";

const COLS =
  "id, captured_at, callsign, registration, aircraft_type, airline, altitude_m, rarity, verified, photo_path, handle, origin, destination, avatar_seed, is_admin, user_id";

type Row = {
  id: string;
  captured_at: string;
  callsign: string | null;
  registration: string | null;
  aircraft_type: string | null;
  airline: string | null;
  altitude_m: number | null;
  rarity: string;
  verified: boolean;
  photo_path: string | null;
  handle: string | null;
  origin: string | null;
  destination: string | null;
  avatar_seed: string | null;
  is_admin: boolean | null;
};

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
  return { title: `@${handle} — SkyDex` };
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

  const [{ data: rows }, { data: statRows }, { data: typeData }, { data: featRows }] =
    await Promise.all([
      supabase
        .from("feed_sightings")
        .select(COLS)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase.rpc("profile_stats", { p_user: profile.id }),
      supabase.from("aircraft_types").select("code, display_name"),
      featuredIds.length
        ? supabase.from("feed_sightings").select(COLS).in("id", featuredIds)
        : Promise.resolve({ data: [] as Row[] }),
    ]);

  const typeName = new Map(
    ((typeData ?? []) as { code: string; display_name: string | null }[]).map((t) => [
      t.code,
      t.display_name ?? t.code,
    ]),
  );
  const toSighting = (r: Row): Sighting => ({
    ...r,
    aircraft_type: r.aircraft_type ? typeName.get(r.aircraft_type) ?? r.aircraft_type : null,
    photo_url: r.photo_path
      ? supabase.storage.from("sightings").getPublicUrl(r.photo_path).data.publicUrl
      : null,
  });

  const sightings = ((rows ?? []) as Row[]).map(toSighting);
  const featById = new Map(((featRows ?? []) as Row[]).map((r) => [r.id, toSighting(r)]));
  const featured = featuredIds.map((id) => featById.get(id)).filter(Boolean) as Sighting[];

  const stats = (statRows as Stats[] | null)?.[0] ?? null;
  const since = new Date(profile.created_at).toLocaleString("en-GB", {
    month: "short",
    year: "numeric",
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
      {/* header */}
      <div className="flex items-center gap-4 border-b border-paper-edge pb-5">
        <Avatar seed={profile.avatar_seed ?? profile.handle} admin={Boolean(profile.is_admin)} size={64} />
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-bold tracking-tight text-ink">
            @{profile.handle}
          </h1>
          <p className="font-mono text-xs text-ink-soft">
            {profile.home_airport ? `Home ${profile.home_airport} · ` : ""}Spotter since {since}
          </p>
        </div>
        {isOwner && (
          <a href="/settings" className="ml-auto sd-btn sd-btn--log !px-3 !py-1.5 !text-xs">
            Settings
          </a>
        )}
      </div>

      {/* favourites */}
      {featured.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink-soft">
            Favourites
          </h2>
          <ProfileSightings sightings={featured} featuredIds={featuredIds} isOwner={false} />
        </section>
      )}

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

      {/* all sightings */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink-soft">
          {isOwner ? "Your sightings" : "Sightings"}
        </h2>
        {isOwner && featured.length < 3 && sightings.length > 0 && (
          <p className="mt-1 text-xs text-ink-faint">
            Tap the ☆ on a card to feature it on your profile (up to 3).
          </p>
        )}
        <div className="mt-3">
          {sightings.length === 0 ? (
            <p className="text-sm text-ink-faint">No sightings yet.</p>
          ) : (
            <ProfileSightings sightings={sightings} featuredIds={featuredIds} isOwner={isOwner} />
          )}
        </div>
      </section>
    </main>
  );
}
