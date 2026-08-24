import { createClient } from "@/lib/supabase/server";
import type { Sighting } from "@/components/SightingCard";

/** Page size for a profile's sighting history (initial load and each Load more). */
export const PROFILE_PAGE_SIZE = 24;

export const SIGHTING_COLS =
  "id, captured_at, callsign, registration, aircraft_type, airline, altitude_m, rarity, verified, photo_path, handle, origin, destination, avatar_seed, is_admin, frequent_flyer, user_id";

export type SightingRow = {
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
  frequent_flyer: boolean | null;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;
type TypeRow = { code: string; display_name: string | null };

/** Build a row → Sighting mapper that resolves type display names and photo URLs. */
export function makeSightingMapper(supabase: Supabase, typeData: TypeRow[] | null) {
  const typeName = new Map((typeData ?? []).map((t) => [t.code, t.display_name ?? t.code]));
  return (r: SightingRow): Sighting => ({
    ...r,
    aircraft_type: r.aircraft_type ? typeName.get(r.aircraft_type) ?? r.aircraft_type : null,
    photo_url: r.photo_path
      ? supabase.storage.from("sightings").getPublicUrl(r.photo_path).data.publicUrl
      : null,
  });
}

/** One page of a user's sighting history, newest first. */
export async function fetchUserSightings(
  supabase: Supabase,
  userId: string,
  offset: number,
  limit: number,
): Promise<{ sightings: Sighting[]; hasMore: boolean }> {
  const [{ data: rows }, { data: typeData }] = await Promise.all([
    supabase
      .from("feed_sightings")
      .select(SIGHTING_COLS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      // one extra row so we know whether another page exists
      .range(offset, offset + limit),
    supabase.from("aircraft_types").select("code, display_name"),
  ]);
  const toSighting = makeSightingMapper(supabase, (typeData ?? []) as TypeRow[]);
  const page = (rows ?? []) as SightingRow[];
  return {
    sightings: page.slice(0, limit).map(toSighting),
    hasMore: page.length > limit,
  };
}
