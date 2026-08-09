import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Uses the anon (publishable) key only — never the
 * service-role key. The session lives in httpOnly cookies managed by
 * @supabase/ssr, not in localStorage/sessionStorage, so it is not readable by
 * injected scripts (XSS). See ARCHITECTURE.md → Data Access & Security.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
