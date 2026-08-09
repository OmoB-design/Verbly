import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Private bucket holding vocalization audio. Objects are NEVER public — always
 *  served via a short-lived signed URL issued here. */
const VOCALIZATION_BUCKET = "vocalizations";
/** Signed URL lifetime (seconds). Short by design — the audio is Tier 1 data. */
const SIGNED_URL_TTL_SECONDS = 60;

/**
 * GET /api/vocalization-logs/[id]/audio-url
 *
 * Issues a signed, time-limited URL for a vocalization recording — never a
 * permanent public path (ARCHITECTURE.md / DATABASE.md). Access to the log row
 * is RLS-scoped to the caller under their own session; only if that succeeds do
 * we use the service role to mint the signed URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // RLS ensures this returns a row only for a child the caller may access
  // (owning caregiver or linked SLP).
  const { data: log, error: logErr } = await supabase
    .from("vocalization_logs")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });
  if (!log) {
    return NextResponse.json(
      { error: "Recording not found or not accessible" },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  const { data: signed, error: signErr } = await admin.storage
    .from(VOCALIZATION_BUCKET)
    .createSignedUrl(log.storage_path, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed) {
    return NextResponse.json(
      { error: `Could not sign URL: ${signErr?.message ?? "unknown error"}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    url: signed.signedUrl,
    expires_in: SIGNED_URL_TTL_SECONDS,
  });
}
