import { createSessionCookie, verifyPasscode } from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { passcode?: string } | null;
  const passcode = body?.passcode ?? "";
  if (!passcode || !(await verifyPasscode(passcode))) {
    // Small fixed delay blunts brute force on a 1-user app without extra infra.
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "Wrong passcode" }, { status: 401 });
  }
  await createSessionCookie();
  return Response.json({ ok: true });
}
