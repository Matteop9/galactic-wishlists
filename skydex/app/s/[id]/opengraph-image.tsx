import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SkyDex verified sighting";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("shared_sightings")
    .select(
      "registration, callsign, aircraft_type, airline, rarity, origin, destination, photo_path, verified",
    )
    .eq("id", id)
    .maybeSingle();

  const photo = data?.photo_path
    ? supabase.storage.from("sightings").getPublicUrl(data.photo_path).data.publicUrl
    : null;
  const reg = data?.registration || data?.callsign || "Aircraft";
  const sub = [data?.aircraft_type, data?.airline].filter(Boolean).join("  ·  ");
  const route =
    data?.origin || data?.destination ? `${data?.origin ?? "—"} → ${data?.destination ?? "—"}` : null;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#F2EBDC" }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" style={{ width: 630, height: 630, objectFit: "cover" }} />
        ) : (
          <div style={{ width: 630, height: 630, background: "#9FC0D4" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "64px 54px" }}>
          <div style={{ fontSize: 32, color: "#B5402E", letterSpacing: 4 }}>
            {data?.verified ? "VERIFIED SIGHTING" : "SIGHTING"}
          </div>
          <div style={{ fontSize: 104, fontWeight: 700, color: "#20262B", marginTop: 8 }}>{reg}</div>
          <div style={{ fontSize: 40, color: "#4A5560", marginTop: 8 }}>{sub}</div>
          {route ? (
            <div style={{ fontSize: 38, color: "#0E7C86", marginTop: 8, letterSpacing: 2 }}>
              {route}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "auto",
              fontSize: 36,
            }}
          >
            <span style={{ color: "#0E7C86", fontWeight: 700 }}>SkyDex</span>
            <span style={{ color: "#B98A2E", letterSpacing: 3 }}>
              {(data?.rarity ?? "").toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
