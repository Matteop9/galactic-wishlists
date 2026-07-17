import { cookies } from "next/headers";
import Link from "next/link";
import SectionShell from "@/components/SectionShell";
import SightingBrowser from "@/components/SightingBrowser";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { type Sighting } from "@/components/SightingCard";
import { type ReactionState } from "@/lib/reactions";

export const dynamic = "force-dynamic";

const COLS =
  "id, captured_at, callsign, registration, aircraft_type, airline, altitude_m, rarity, verified, photo_path, handle, origin, destination, avatar_seed, is_admin, flight_no, painted_as, operating_as, eta, gspeed_kt, vspeed_fpm";

// Popular window: sightings from the last 30 days, so old winners age out.
// (Module-level helper — the page is force-dynamic, so this runs per request.)
function popularCutoff(): string {
  return new Date(Date.now() - 30 * 86400_000).toISOString();
}

type FeedRow = {
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
  flight_no: string | null;
  painted_as: string | null;
  operating_as: string | null;
  eta: string | null;
  gspeed_kt: number | null;
  vspeed_fpm: number | null;
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const sort = (await searchParams).sort === "popular" ? "popular" : "recent";
  const { user, isAdmin } = await getViewer();
  const devMode = isAdmin && (await cookies()).get("skydex_dev")?.value === "1";

  const supabase = await createClient();
  // Dev mode (admin only) reads the RLS-respecting view that includes unverified
  // sightings; everyone else reads the privacy-safe verified-only feed view.
  // Popular = last 30 days ordered by reaction count (view column).
  let query = supabase.from(devMode ? "all_sightings" : "feed_sightings").select(COLS);
  query =
    sort === "popular"
      ? query
          .gte("created_at", popularCutoff())
          .order("reaction_count", { ascending: false })
          .order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });
  const [{ data }, { data: typeData }] = await Promise.all([
    query.limit(devMode ? 100 : 50),
    supabase.from("aircraft_types").select("code, display_name"),
  ]);

  const typeName = new Map(
    ((typeData ?? []) as { code: string; display_name: string | null }[]).map((t) => [
      t.code,
      t.display_name ?? t.code,
    ]),
  );
  const rows = (data ?? []) as FeedRow[];
  const sightings: Sighting[] = rows.map((r) => ({
    ...r,
    aircraft_type: r.aircraft_type ? typeName.get(r.aircraft_type) ?? r.aircraft_type : null,
    photo_url: r.photo_path
      ? supabase.storage.from("sightings").getPublicUrl(r.photo_path).data.publicUrl
      : null,
  }));

  // Comment counts + reactions for the listed sightings.
  const commentCounts: Record<string, number> = {};
  const reactions: Record<string, ReactionState> = {};
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    const [{ data: cs }, { data: rx }] = await Promise.all([
      supabase.from("comments").select("sighting_id").in("sighting_id", ids),
      supabase.from("reactions").select("sighting_id, emoji, user_id").in("sighting_id", ids),
    ]);
    for (const c of (cs ?? []) as { sighting_id: string }[]) {
      commentCounts[c.sighting_id] = (commentCounts[c.sighting_id] ?? 0) + 1;
    }
    for (const r of (rx ?? []) as { sighting_id: string; emoji: string; user_id: string }[]) {
      const st = (reactions[r.sighting_id] ??= { counts: {}, mine: [] });
      st.counts[r.emoji] = (st.counts[r.emoji] ?? 0) + 1;
      if (user && r.user_id === user.id) st.mine.push(r.emoji);
    }
  }

  return (
    <SectionShell
      title="Global feed"
      subtitle={
        sort === "popular"
          ? "Most-loved sightings from the last 30 days. Tap Comments to join in."
          : "Verified sightings from spotters around the world. Tap Comments to join in."
      }
    >
      {/* feed scope chips — Latest/Popular sort; Following/Nearby are upcoming */}
      <div className="-mt-3 mb-6 flex gap-2">
        {(
          [
            ["Latest", "recent", "/feed"],
            ["Popular", "popular", "/feed?sort=popular"],
          ] as const
        ).map(([label, key, href]) => (
          <Link
            key={key}
            href={href}
            className={`rounded-full border px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-wide ${
              sort === key
                ? "border-ink bg-ink text-paper"
                : "border-paper-edge text-ink-soft hover:border-ink"
            }`}
          >
            {label}
          </Link>
        ))}
        {["Following", "Nearby"].map((c) => (
          <span
            key={c}
            title="Coming soon"
            className="cursor-default rounded-full border border-paper-edge px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-wide text-ink-faint"
          >
            {c}
          </span>
        ))}
      </div>

      {devMode && (
        <p className="mb-5 font-mono text-xs text-stamp">
          Dev mode — showing unverified sightings; delete controls enabled.{" "}
          <a href="/reports" className="underline">
            Reports
          </a>{" "}
          ·{" "}
          <a href="/feedback" className="underline">
            Feedback
          </a>
        </p>
      )}

      {sightings.length === 0 ? (
        <p className="text-sm text-ink-faint">
          No sightings yet — be the first to capture one.
        </p>
      ) : (
        <SightingBrowser
          sightings={sightings}
          showComments
          currentUserId={user?.id ?? null}
          isAdmin={devMode}
          canDelete={devMode}
          showVerifiedToggle={devMode}
          commentCounts={commentCounts}
          reactions={reactions}
        />
      )}
    </SectionShell>
  );
}
