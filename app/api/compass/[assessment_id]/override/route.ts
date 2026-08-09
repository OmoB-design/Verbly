import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/compass/[assessment_id]/override  { caregiver_phase, confirmed }
 *
 * §6.5 caregiver override of the initial placement. The confirmation gate is
 * enforced SERVER-SIDE (not just in the UI): `confirmed` must be exactly true.
 * Records both phases in `placement_overrides`, sets starting_phase +
 * placement_source = caregiver_override, moves the child, and writes a distinct
 * `caregiver_override` phase_history row. Never suppresses a red flag.
 */
export async function POST(request: Request, { params }: { params: Promise<{ assessment_id: string }> }) {
  const { assessment_id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { caregiver_phase?: number; confirmed?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (body.confirmed !== true) {
    return NextResponse.json({ error: "Override requires explicit confirmation" }, { status: 400 });
  }
  const caregiverPhase = body.caregiver_phase;
  if (!Number.isInteger(caregiverPhase) || caregiverPhase! < 1 || caregiverPhase! > 12) {
    return NextResponse.json({ error: "caregiver_phase must be an integer 1–12" }, { status: 400 });
  }

  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .select("id, child_id, status, recommended_phase")
    .eq("id", assessment_id)
    .maybeSingle();
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  if (!assessment) return NextResponse.json({ error: "Assessment not found or not accessible" }, { status: 403 });
  if (assessment.status !== "scored") {
    return NextResponse.json({ error: "Assessment must be scored before it can be overridden" }, { status: 409 });
  }

  const admin = createAdminClient();

  const { error: ovErr } = await admin.from("placement_overrides").insert({
    assessment_id,
    child_id: assessment.child_id,
    engine_phase: assessment.recommended_phase,
    caregiver_phase: caregiverPhase,
  });
  if (ovErr) return NextResponse.json({ error: ovErr.message }, { status: 500 });

  await admin
    .from("assessments")
    .update({ starting_phase: caregiverPhase, placement_source: "caregiver_override" })
    .eq("id", assessment_id);

  const { data: phase } = await admin
    .schema("curriculum_content")
    .from("phases")
    .select("id, content_version")
    .eq("phase_number", caregiverPhase)
    .order("content_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (phase) {
    await admin.from("children").update({ current_phase_id: phase.id }).eq("id", assessment.child_id);
    await admin.from("phase_history").insert({
      child_id: assessment.child_id,
      phase_id: phase.id,
      trigger_reason: "caregiver_override",
      content_version: phase.content_version,
    });
  }

  return NextResponse.json({
    starting_phase: caregiverPhase,
    placement_source: "caregiver_override",
    engine_phase: assessment.recommended_phase,
  });
}
