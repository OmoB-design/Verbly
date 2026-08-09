import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client for Server Components, Server Actions, and Route
 * Handlers. Reads/writes the auth session from httpOnly cookies. Access
 * control is still enforced by Row-Level Security at the database layer — this
 * client uses the anon key and the caller's session, NOT the service-role key.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies can't be set.
            // Safe to ignore when middleware is refreshing the session.
          }
        },
      },
    },
  );
}
