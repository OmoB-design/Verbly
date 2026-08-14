import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and gates authenticated
 * routes. Runs in Next.js middleware so httpOnly session cookies stay fresh
 * without any client-side token handling.
 *
 * IMPORTANT (per @supabase/ssr guidance): do not run arbitrary logic between
 * createServerClient and getClaims/getUser, and always return the
 * supabaseResponse object so cookies propagate correctly.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated users are redirected to /login for everything except the
  // public routes below. API routes are EXCLUDED from the redirect: they
  // authenticate themselves (a Supabase session, or a Bearer secret for cron)
  // and return their own 401 JSON — redirecting them to an HTML login page
  // would be wrong for API clients and breaks the secret-authed cron route.
  // /invite is public: an SLP opening a caregiver's invite link may have no
  // account yet — the page itself walks them to signup/login and back.
  const publicPaths = ["/", "/login", "/signup", "/auth", "/invite", "/forgot-password"];
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api");
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`) || pathname === "/",
  );

  if (!user && !isPublic && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
