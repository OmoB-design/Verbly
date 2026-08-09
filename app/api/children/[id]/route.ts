import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Storage bucket holding vocalization audio. Must exist in Supabase Storage;
 *  audio is only ever served via signed, time-limited URLs, never public. */
const VOCALIZATION_BUCKET = "vocalizations";

/**
 * DELETE /api/children/[id]
 *
 * Cascade-deletes a child and everything under it. An Edge/route function
 * rather than a direct client delete (API.md) because the cascade must also
 * remove Storage objects, which foreign keys cannot do: FKs cascade the DB rows
 * (session_instances → check-ins / extension tables → phase_history →
 * assessments), but the audio files in Storage must be deleted explicitly.
 *
 * Authorization: only the child's PRIMARY caregiver may delete (delete rights
 * are not held by secondary caregivers — see the two-tier model in
 * DATABASE.md). We verify ownership against the caller's own session first,
 * then use the service-role client to perform the privileged cascade.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: childId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Ownership check under the caller's own session/RLS.
  const { data: child, error: childErr } = await supabase
    .from("children")
    .select("id, primary_caregiver_id")
    .eq("id", childId)
    .maybeSingle();
  if (childErr) return NextResponse.json({ error: childErr.message }, { status: 500 });
  if (!child) {
    return NextResponse.json({ error: "Child not found or not accessible" }, { status: 403 });
  }
  if (child.primary_caregiver_id !== user.id) {
    return NextResponse.json(
      { error: "Only the primary caregiver can delete a child profile" },
      { status: 403 },
    );
  }

  const admin = createAdminClient();

  // 1. Remove Storage audio objects (FKs won't cascade these).
  const { data: logs, error: logsErr } = await admin
    .from("vocalization_logs")
    .select("storage_path")
    .eq("child_id", childId);
  if (logsErr) return NextResponse.json({ error: logsErr.message }, { status: 500 });

  const paths = (logs ?? []).map((l) => l.storage_path).filter(Boolean);
  if (paths.length > 0) {
    const { error: rmErr } = await admin.storage.from(VOCALIZATION_BUCKET).remove(paths);
    if (rmErr) {
      // Do not delete DB rows if audio couldn't be removed — that would orphan
      // the files. Surface the error instead.
      return NextResponse.json(
        { error: `Failed to remove audio objects: ${rmErr.message}` },
        { status: 500 },
      );
    }
  }

  // 2. Delete the child row; FK ON DELETE CASCADE removes all dependent rows.
  const { error: delErr } = await admin.from("children").delete().eq("id", childId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ deleted: childId, audio_objects_removed: paths.length });
}
