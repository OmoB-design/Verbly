import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Private bucket for vocalization audio (must match the other routes). */
const BUCKET = "vocalizations";

/**
 * DELETE /api/account — full account deletion (settings → Account).
 *
 * A caregiver in a research context must be able to withdraw without penalty
 * (ethics requirement). Removes: the auth user, caregiver profile, every child
 * and everything under them (FK cascades verified end-to-end), outstanding SLP
 * invites, and the children's audio recordings in Storage (FKs can't cascade
 * those, so they're removed explicitly first). SLP-authored notes cascade away
 * with the children — they are part of the child's record, which is being
 * erased. The caller can only ever delete themself.
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  // Audio objects for all of this caregiver's children (Storage doesn't cascade).
  const { data: children } = await admin.from("children").select("id").eq("primary_caregiver_id", user.id);
  const childIds = (children ?? []).map((c) => c.id);
  if (childIds.length > 0) {
    const { data: logs } = await admin
      .from("vocalization_logs")
      .select("storage_path")
      .in("child_id", childIds)
      .not("storage_path", "is", null);
    const paths = (logs ?? []).map((l) => l.storage_path as string);
    if (paths.length > 0) await admin.storage.from(BUCKET).remove(paths);
  }

  // Auth-user delete cascades: caregivers → children → sessions/assessments/
  // readiness/notes/links/invites (FK behaviour verified in migrations 013/018).
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
