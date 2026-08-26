import { NextResponse } from "next/server";
import { captureServerError } from "@/lib/monitor";

// Intake for the client error boundaries. Unauthenticated by design (errors
// happen signed-out too), so it is strictly capped: tiny payload, hard field
// limits, and a per-IP limiter so it can't be used to spam the monitor.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { n: number; t: number }>();

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const now = Date.now();
  const h = hits.get(ip);
  if (h && now - h.t < WINDOW_MS) {
    if (h.n >= MAX_PER_WINDOW) return new NextResponse(null, { status: 429 });
    h.n += 1;
  } else {
    hits.set(ip, { n: 1, t: now });
  }
  if (hits.size > 1000) hits.clear();

  let body: { message?: unknown; stack?: unknown; digest?: unknown; url?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.slice(0, 500) : "";
  if (!message) return new NextResponse(null, { status: 400 });

  const err = new Error(message);
  err.name = "ClientError";
  if (typeof body.stack === "string") err.stack = body.stack.slice(0, 4000);
  await captureServerError(err, {
    source: "client",
    digest: typeof body.digest === "string" ? body.digest.slice(0, 100) : undefined,
    url: typeof body.url === "string" ? body.url.slice(0, 300) : undefined,
  });
  return new NextResponse(null, { status: 204 });
}
