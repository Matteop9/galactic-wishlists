import { NextResponse } from "next/server";
import { fetch as undiciFetch, Agent } from "undici";

export const runtime = "nodejs";

const dispatcher = new Agent({
  connect: { family: 4, timeout: 10_000 },
  headersTimeout: 10_000,
  bodyTimeout: 10_000,
});
const UA = "SkyDex (+https://sky-dex.com)";

// Airframe photos change rarely and Planespotters is a rate-limited courtesy
// API — let Vercel's edge cache absorb repeat card renders.
const CACHE_HIT = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };
const CACHE_MISS = { "Cache-Control": "public, s-maxage=300" };

/**
 * GET /api/aircraft-photo?reg=G-XWBA
 * Reference photo of the actual airframe (correct livery) from Planespotters.
 * Non-commercial use with attribution + link-back; UA required.
 */
export async function GET(request: Request) {
  const reg = (new URL(request.url).searchParams.get("reg") ?? "").trim();
  if (!/^[A-Za-z0-9-]{3,12}$/.test(reg)) {
    return NextResponse.json({ photo: null }, { headers: CACHE_MISS });
  }

  try {
    const res = await undiciFetch(
      `https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`,
      { headers: { "User-Agent": UA }, dispatcher },
    );
    if (!res.ok) return NextResponse.json({ photo: null }, { headers: CACHE_MISS });
    const json = (await res.json()) as {
      photos?: {
        thumbnail_large?: { src: string };
        thumbnail?: { src: string };
        link?: string;
        photographer?: string;
      }[];
    };
    const p = json.photos?.[0];
    if (!p) return NextResponse.json({ photo: null }, { headers: CACHE_HIT });
    return NextResponse.json(
      {
        photo: {
          src: p.thumbnail_large?.src ?? p.thumbnail?.src ?? null,
          link: p.link ?? null,
          photographer: p.photographer ?? null,
        },
      },
      { headers: CACHE_HIT },
    );
  } catch {
    return NextResponse.json({ photo: null }, { headers: CACHE_MISS });
  }
}
