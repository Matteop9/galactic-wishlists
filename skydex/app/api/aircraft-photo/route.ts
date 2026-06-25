import { NextResponse } from "next/server";
import { fetch as undiciFetch, Agent } from "undici";

export const runtime = "nodejs";

const dispatcher = new Agent({ connect: { family: 4, timeout: 10_000 } });
const UA = "SkyDex/0.1 (+https://skydex-two.vercel.app)";

/**
 * GET /api/aircraft-photo?reg=G-XWBA
 * Reference photo of the actual airframe (correct livery) from Planespotters.
 * Non-commercial use with attribution + link-back; UA required.
 */
export async function GET(request: Request) {
  const reg = (new URL(request.url).searchParams.get("reg") ?? "").trim();
  if (!reg) return NextResponse.json({ photo: null });

  try {
    const res = await undiciFetch(
      `https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`,
      { headers: { "User-Agent": UA }, dispatcher },
    );
    if (!res.ok) return NextResponse.json({ photo: null });
    const json = (await res.json()) as {
      photos?: {
        thumbnail_large?: { src: string };
        thumbnail?: { src: string };
        link?: string;
        photographer?: string;
      }[];
    };
    const p = json.photos?.[0];
    if (!p) return NextResponse.json({ photo: null });
    return NextResponse.json({
      photo: {
        src: p.thumbnail_large?.src ?? p.thumbnail?.src ?? null,
        link: p.link ?? null,
        photographer: p.photographer ?? null,
      },
    });
  } catch {
    return NextResponse.json({ photo: null });
  }
}
