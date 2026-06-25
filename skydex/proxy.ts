import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require an authenticated user. `/feed` is intentionally public.
const PROTECTED = ["/spot", "/scrapbook", "/books", "/liveries", "/profile", "/settings"];
// Routes that additionally require a chosen username before use.
const NEEDS_HANDLE = ["/spot", "/scrapbook", "/books", "/liveries"];

/**
 * Next.js 16 renamed Middleware to "Proxy" (same functionality). This refreshes
 * the Supabase auth session on every request and redirects unauthenticated
 * users away from protected routes.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touch the session so cookies refresh (do not run logic between this and the response).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Require a username before using the core app.
  if (user && NEEDS_HANDLE.some((p) => path === p || path.startsWith(p + "/"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.handle) {
      const url = request.nextUrl.clone();
      url.pathname = "/settings";
      url.searchParams.set("setup", "1");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Run on everything except static assets and image files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
