import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/compass/[assessment_id]/save  { draft_state }
 *
 * Persists the caregiver's in-progress answers for save-and-resume (§11). Only
 * writes while the assessment is still in_progress — a scored assessment is
 * immutable (409). The draft is an opaque jsonb blob owned by the client wizard;
 * the server never scores from it (scoring goes through /score with the final
 * answer set). RLS authorizes the read; the write uses the admin client.
 */
export async function POST(request: Request, { params }: { params: Promise<{ assessment_id: string }> }) {
  const { assessment_id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { draft_state?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (body.draft_state === undefined) {
    return NextResponse.json({ error: "draft_state is required" }, { status: 400 });
  }

  // Authorize via RLS (assessment is child-scoped).
  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .select("id, status")
    .eq("id", assessment_id)
    .maybeSingle();
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  if (!assessment) return NextResponse.json({ error: "Assessment not found or not accessible" }, { status: 403 });
  if (assessment.status !== "in_progress") {
    return NextResponse.json({ error: "Assessment is already completed" }, { status: 409 });
  }

  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from("assessments")
    .update({ draft_state: body.draft_state })
    .eq("id", assessment_id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
