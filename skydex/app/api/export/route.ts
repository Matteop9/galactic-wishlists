import { createClient } from "@/lib/supabase/server";

/** GET /api/export — downloads all of the signed-in user's data as JSON. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const [
    { data: profile },
    { data: sightings },
    { data: comments },
    { data: reactions },
    { data: ticketLedger },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("sightings").select("*").eq("user_id", user.id),
    supabase.from("comments").select("*").eq("user_id", user.id),
    supabase.from("reactions").select("*").eq("user_id", user.id),
    // RLS already scopes this to the caller's own rows.
    supabase.from("ticket_ledger").select("*").order("created_at", { ascending: true }),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile,
    sightings: sightings ?? [],
    comments: comments ?? [],
    reactions: reactions ?? [],
    ticket_ledger: ticketLedger ?? [],
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="skydex-export.json"',
    },
  });
}
