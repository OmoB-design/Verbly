import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. BYPASSES Row-Level Security — use ONLY inside
 * trusted server code (route handlers) for server-authoritative operations
 * that RLS deliberately forbids the client from doing (writing score_percent /
 * outcome / phase_history, cascade deletes, seeding).
 *
 * The `server-only` import makes the build fail if this module is ever pulled
 * into a Client Component, so the service-role key can never reach the browser.
 * Callers MUST authorize the request against the user's own session (via the
 * cookie-bound server client) BEFORE using this client to act on their behalf.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
