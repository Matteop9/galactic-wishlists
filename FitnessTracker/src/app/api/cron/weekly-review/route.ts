import { cronAuthorised, runScheduled } from "@/lib/scheduled";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!cronAuthorised(req)) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const r = await runScheduled("weekly_review");
  return Response.json(r, { status: r.ok ? 200 : 500 });
}
