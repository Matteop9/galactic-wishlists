import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A SkyDex spotter's collection book";

// Social card for a shared book: progress headline + a strip of recent covers.
export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle")
    .eq("handle", handle)
    .maybeSingle();

  let collected = 0;
  let total = 0;
  let photos: string[] = [];
  if (profile) {
    const [{ data: rows }, { data: types }] = await Promise.all([
      supabase
        .from("feed_sightings")
        .select("aircraft_type, photo_path")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("aircraft_types").select("code"),
    ]);
    const typed = (rows ?? []) as { aircraft_type: string | null; photo_path: string | null }[];
    collected = new Set(typed.map((r) => r.aircraft_type).filter(Boolean)).size;
    total = (types ?? []).length;
    photos = typed
      .filter((r) => r.photo_path)
      .slice(0, 3)
      .map((r) => supabase.storage.from("sightings").getPublicUrl(r.photo_path!).data.publicUrl);
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#F2EBDC",
          padding: "56px 60px",
        }}
      >
        <div style={{ fontSize: 32, color: "#B5402E", letterSpacing: 4 }}>COLLECTION BOOK</div>
        <div style={{ fontSize: 88, fontWeight: 700, color: "#20262B", marginTop: 6 }}>
          {`@${handle}`}
        </div>
        <div style={{ fontSize: 44, color: "#4A5560", marginTop: 6 }}>
          {`${collected} of ${total} aircraft types collected`}
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 36 }}>
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p}
              src={p}
              alt=""
              style={{ width: 340, height: 220, objectFit: "cover", borderRadius: 12 }}
            />
          ))}
          {photos.length === 0 && (
            <div style={{ width: 340, height: 220, background: "#9FC0D4", borderRadius: 12 }} />
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "auto",
            fontSize: 36,
          }}
        >
          <span style={{ color: "#0E7C86", fontWeight: 700 }}>SkyDex</span>
          <span style={{ color: "#B98A2E", letterSpacing: 3 }}>REAL PLANES · REALLY VERIFIED</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
