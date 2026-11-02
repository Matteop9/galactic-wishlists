import { cronAuthorised, runScheduled } from "@/lib/scheduled";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!cronAuthorised(req)) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const r = await runScheduled("morning_brief");
  return Response.json(r, { status: r.ok ? 200 : 500 });
}
