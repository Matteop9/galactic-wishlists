import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Exchanges the OAuth (PKCE) code for a session, then redirects into the app. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only allow same-origin paths: a single leading slash (not "//" or "/\",
  // which browsers treat as protocol-relative → open redirect).
  const rawNext = searchParams.get("next") ?? "/scrapbook";
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : "/scrapbook";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Carry `next` (already validated same-origin) so a retry keeps its destination.
  return NextResponse.redirect(`${origin}/login?error=auth&next=${encodeURIComponent(next)}`);
}
