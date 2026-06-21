import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@slicedlabs/supabase";

/**
 * Runs on every matched request: refreshes the auth token (getUser → cookie rotation
 * via setAll) and gates the cockpit. This is the ONLY place tokens are written on a
 * normal navigation, because Server Components can't set cookies.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerSupabase({
    getAll: () => request.cookies.getAll(),
    setAll: (cookiesToSet) => {
      // 1) write to the request so downstream reads see fresh values
      for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
      // 2) rebuild the response and write Set-Cookie (domain/secure/sameSite from cookieOptions)
      response = NextResponse.next({ request });
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options);
      }
    },
  });

  // Do NOT put logic between createServerSupabase and getUser (it can desync the refresh).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === "/login" || pathname.startsWith("/auth");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Everything except Next internals, the auth callback, and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
