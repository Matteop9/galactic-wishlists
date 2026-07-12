import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://skydex-two.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/feed`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/leaderboards`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/attributions`, changeFrequency: "yearly", priority: 0.1 },
  ];

  // Public spotter profiles (handles are public reads under RLS). Bare anon
  // client — no request cookies exist in this context. Best-effort.
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
      .from("profiles")
      .select("handle")
      .not("handle", "is", null)
      .limit(1000);
    for (const p of data ?? []) {
      if (p.handle) {
        entries.push({
          url: `${SITE_URL}/u/${encodeURIComponent(p.handle)}`,
          changeFrequency: "daily",
          priority: 0.5,
        });
      }
    }
  } catch {
    /* profiles are a nice-to-have in the sitemap */
  }

  return entries;
}
