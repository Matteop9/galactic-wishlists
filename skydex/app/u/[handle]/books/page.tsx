import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { buildBook, type BookKind, type TypeRow, type CoverRow } from "@/lib/bookBuilder";
import BookView from "@/components/BookView";
import { SIGHTING_COLS, type SightingRow } from "@/lib/profileSightings";
import { type Sighting } from "@/components/SightingCard";

export const dynamic = "force-dynamic";

// Public, read-only view of a spotter's book — same builder and chrome as the
// owner's /books, sourced from the privacy-safe feed_sightings view (verified
// catches only, like the public profile). Cover choices come from book_covers,
// which is public-read (choices only — the photos are already public).

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const title = `@${handle}'s book — SkyDex`;
  const description = `Browse @${handle}'s aircraft collection — types, airlines and rarities spotted and verified on SkyDex.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ book?: string; view?: string }>;
}) {
  const [{ handle }, sp] = await Promise.all([params, searchParams]);
  const kind: BookKind =
    sp.book === "airline" || sp.book === "rarity" ? sp.book : "type";
  const missingOnly = sp.view === "missing";

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle")
    .eq("handle", handle)
    .maybeSingle();
  if (!profile) notFound();

  const viewer = await getViewer();
  const isOwner = viewer.user?.id === profile.id;

  const [{ data: rowData }, { data: typeData }, { data: airlineData }, { data: coverData }] =
    await Promise.all([
      supabase
        .from("feed_sightings")
        .select(SIGHTING_COLS)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase.from("aircraft_types").select("code, display_name, name, rarity"),
      supabase.from("airlines").select("name"),
      supabase.from("book_covers").select("kind, key, sighting_id").eq("user_id", profile.id),
    ]);

  const rows: Sighting[] = ((rowData ?? []) as SightingRow[]).map((r) => ({
    ...r,
    photo_url: r.photo_path
      ? supabase.storage.from("sightings").getPublicUrl(r.photo_path).data.publicUrl
      : null,
  }));

  const { title, sections } = buildBook({
    kind,
    rows,
    types: (typeData ?? []) as TypeRow[],
    airlines: (airlineData ?? []) as { name: string }[],
    covers: (coverData ?? []) as CoverRow[],
  });

  return (
    <BookView
      title={`@${profile.handle} · ${title}`}
      kind={kind}
      missingOnly={missingOnly}
      sections={sections}
      basePath={`/u/${profile.handle}/books`}
      readOnly={!isOwner}
      backHref={`/u/${profile.handle}`}
      backLabel="← profile"
      note="Verified catches only — the public book shows what the community can see."
    />
  );
}
