import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCompassConfig } from "@/lib/compass/load-config";
import { assess } from "@/lib/compass/assess";
import type { AgeBracket, AssessmentInput, SecondAdult } from "@/lib/compass/types";

/**
 * POST /api/compass/[assessment_id]/score
 * Body: { responses, benchmarkAnswers?, redFlagAnswers?, secondAdultAvailable?, freeTextConcern? }
 *
 * Server-authoritative scoring. Runs the deterministic engine, then:
 *  - confidence < 0.60 → 202, supplemental questions needed, assessment stays open;
 *  - otherwise → persists the §8 result, moves the child to the starting phase,
 *    and seeds phase_history (trigger_reason 'assessment_placement').
 * Immutable once scored (409). The client never submits a phase or a score.
 */
export async function POST(request: Request, { params }: { params: Promise<{ assessment_id: string }> }) {
  const { assessment_id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Authorize via RLS (assessment is child-scoped).
  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .select("id, child_id, status, age_bracket, age_months_at_assessment")
    .eq("id", assessment_id)
    .maybeSingle();
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  if (!assessment) return NextResponse.json({ error: "Assessment not found or not accessible" }, { status: 403 });
  if (assessment.status === "scored") {
    return NextResponse.json({ error: "Assessment already scored" }, { status: 409 });
  }

  const { data: child } = await supabase.from("children").select("name").eq("id", assessment.child_id).maybeSingle();

  let body: {
    responses?: Record<string, string>;
    benchmarkAnswers?: Record<string, boolean>;
    redFlagAnswers?: Record<string, boolean>;
    secondAdultAvailable?: SecondAdult;
    freeTextConcern?: boolean;
    concernText?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const config = await loadCompassConfig(admin);
  if (!config) return NextResponse.json({ error: "Assessment content not available" }, { status: 500 });

  const bracket = assessment.age_bracket as AgeBracket;
  const responses = body.responses ?? {};
  const itemsTotal = config.items.filter((i) => i.brackets.includes(bracket) || i.brackets.includes("ALL")).length;

  const input: AssessmentInput = {
    childId: assessment.child_id,
    ageMonths: assessment.age_months_at_assessment,
    ageBracket: bracket,
    responses,
    itemsTotal,
    benchmarkAnswers: body.benchmarkAnswers,
    redFlagAnswers: body.redFlagAnswers,
    secondAdultAvailable: body.secondAdultAvailable,
    freeTextConcern: body.freeTextConcern,
  };

  const result = assess(input, config, child?.name ?? "your child");

  // §5.4 / §6.3: below the supplemental threshold → don't finalize yet (202).
  if (result.confidence < config.phaseThresholds.confidenceSupplementMin) {
    return NextResponse.json(
      {
        status: "supplemental_needed",
        confidence: result.confidence,
        message: "We'd like a bit more information to personalize this confidently.",
      },
      { status: 202 },
    );
  }

  // Resolve the starting phase's row (needed to move the child + seed history).
  const { data: phase } = await admin
    .schema("curriculum_content")
    .from("phases")
    .select("id, content_version")
    .eq("phase_number", result.starting_phase)
    .order("content_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: updErr } = await admin
    .from("assessments")
    .update({
      status: "scored",
      completed_at: new Date().toISOString(),
      second_adult_available: result.second_adult_available,
      compass_overall_score: result.compass_overall_score,
      confidence: result.confidence,
      compass_domain_scores: result.compass_domain_scores,
      recommended_phase: result.recommended_phase,
      starting_phase: result.starting_phase,
      placement_source: result.placement_source,
      placement_mode: result.placement_mode,
      start_in_simplified: result.start_in_simplified,
      two_adult_advisory: result.two_adult_advisory,
      age_floor_next_bracket_months: result.age_floor_next_bracket_months,
      red_flags: result.red_flags,
      referral_recommended: result.referral_recommended,
      suggested_reassessment_interval: result.suggested_reassessment_interval,
      // §7.1: the concern TEXT is part of the record (routed to human review
      // via the SLP surface), not just the boolean the engine consumes.
      concern_text:
        body.freeTextConcern === true && typeof body.concernText === "string" && body.concernText.trim()
          ? body.concernText.trim()
          : null,
      raw_payload: result,
    })
    .eq("id", assessment_id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Set the child's onboarding bracket + move to the starting phase.
  await admin
    .from("children")
    .update({
      age_bracket: result.age_bracket,
      bracket_assigned_at_months: result.age_months_at_assessment,
      age_floor_next_bracket_months: result.age_floor_next_bracket_months,
      second_adult_available: result.second_adult_available,
      ...(phase ? { current_phase_id: phase.id } : {}),
    })
    .eq("id", assessment.child_id);

  // Seed the single audit trail (assessment_placement) — only if the curriculum
  // phase exists (it may not be seeded yet in a content-incomplete environment).
  let placementRecorded = false;
  if (phase) {
    const { error: phErr } = await admin.from("phase_history").insert({
      child_id: assessment.child_id,
      phase_id: phase.id,
      trigger_reason: "assessment_placement",
      content_version: phase.content_version,
    });
    placementRecorded = !phErr;
  }

  return NextResponse.json({ ...result, placement_recorded: placementRecorded });
}
