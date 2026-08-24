import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Sighting } from "@/components/SightingCard";
import { SightingCardZoom } from "@/components/SightingPhoto";

export const dynamic = "force-dynamic";

async function getSighting(id: string): Promise<Sighting | null> {
  const supabase = await createClient();
  // shared_sightings (not feed_sightings): unverified catches still unfurl as
  // cards when shared straight from the capture screen — same privacy posture.
  const { data } = await supabase
    .from("shared_sightings")
    .select(
      "id, captured_at, callsign, registration, aircraft_type, airline, altitude_m, rarity, verified, photo_path, handle, origin, destination, avatar_seed, is_admin, frequent_flyer, flight_no, painted_as, operating_as, eta, gspeed_kt, vspeed_fpm",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const r = data as { photo_path: string | null; aircraft_type: string | null } & Record<string, unknown>;
  // Type codes → display names, same as every other card surface.
  const { data: typeRow } = r.aircraft_type
    ? await supabase
        .from("aircraft_types")
        .select("display_name")
        .eq("code", r.aircraft_type)
        .maybeSingle()
    : { data: null };
  return {
    ...(r as unknown as Sighting),
    aircraft_type: typeRow?.display_name ?? r.aircraft_type,
    photo_url: r.photo_path
      ? supabase.storage.from("sightings").getPublicUrl(r.photo_path).data.publicUrl
      : null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const s = await getSighting(id);
  if (!s) return { title: "SkyDex" };
  const title = `${s.registration || s.callsign || "Aircraft"} · SkyDex`;
  const route = s.origin || s.destination ? `${s.origin ?? "—"} → ${s.destination ?? "—"}` : null;
  const description = [s.aircraft_type, s.airline, route].filter(Boolean).join(" · ");
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSighting(id);
  if (!s) notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-12">
      <div className="mx-auto max-w-xs">
        <SightingCardZoom s={s} />
      </div>
      <p className="mt-6 text-center text-sm text-ink-soft">
        A {s!.verified ? "verified " : ""}sighting on{" "}
        <Link href="/" className="font-semibold text-sky underline">
          SkyDex
        </Link>{" "}
        — real planes, real photos, really verified.
      </p>
    </main>
  );
}
