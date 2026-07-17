import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { buildBook, type BookKind, type TypeRow, type CoverRow } from "@/lib/bookBuilder";
import BookView from "@/components/BookView";
import ShareButton from "@/components/ShareButton";
import { type Sighting } from "@/components/SightingCard";

export const dynamic = "force-dynamic";

// Full card column set so every slot's cover can open the standard Lightbox
// (own rows — the base table is readable for the owner under RLS).
const COLS =
  "id, captured_at, callsign, registration, aircraft_type, airline, altitude_m, rarity, verified, photo_path, origin, destination, flight_no, eta, gspeed_kt, vspeed_fpm, painted_as, operating_as";

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const kind: BookKind =
    sp.book === "airline" || sp.book === "rarity" ? sp.book : "type";
  const missingOnly = sp.view === "missing";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { handle } = await getViewer();

  const [{ data: sightingData }, { data: typeData }, { data: airlineData }, { data: coverData }] =
    await Promise.all([
      supabase
        .from("sightings")
        .select(COLS)
        .eq("user_id", user!.id)
        .order("captured_at", { ascending: false }),
      supabase.from("aircraft_types").select("code, display_name, name, rarity"),
      supabase.from("airlines").select("name"),
      supabase.from("book_covers").select("kind, key, sighting_id").eq("user_id", user!.id),
    ]);

  const rows: Sighting[] = ((sightingData ?? []) as ({ photo_path: string | null } & Sighting)[]).map(
    (r) => ({
      ...r,
      photo_url: r.photo_path
        ? supabase.storage.from("sightings").getPublicUrl(r.photo_path).data.publicUrl
        : null,
    }),
  );

  const { title, sections } = buildBook({
    kind,
    rows,
    types: (typeData ?? []) as TypeRow[],
    airlines: (airlineData ?? []) as { name: string }[],
    covers: (coverData ?? []) as CoverRow[],
  });

  return (
    <BookView
      title={title}
      kind={kind}
      missingOnly={missingOnly}
      sections={sections}
      basePath="/books"
      backHref="/scrapbook"
      backLabel="← list view"
      actions={
        handle ? (
          <ShareButton
            path={`/u/${handle}/books?book=${kind}`}
            title="My SkyDex book"
            label="Share book"
            className="font-mono text-xs text-sky hover:underline"
          />
        ) : null
      }
    />
  );
}
