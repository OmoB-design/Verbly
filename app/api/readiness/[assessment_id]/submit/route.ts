import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreReadiness } from "@/lib/readiness/score";
import type { ReadinessContent } from "@/content/readiness/readiness-checks";

/**
 * POST /api/readiness/[assessment_id]/submit  { answers: { "R5.1": true, … } }
 *
 * Scores the one-shot pre-session readiness check (owner rulings 2026-08-09):
 * server-authoritative — the client submits raw yes/no facts, never a verdict.
 * Pass = ≥4 yes; lone NO on the hard item → keep-an-eye flag (never blocks);
 * ≤3 yes → /sessions/start serves the placed phase's first session Simplified.
 * One result per assessment, immutable (409 on repeat) — decision 5.
 */
export async function POST(request: Request, { params }: { params: Promise<{ assessment_id: string }> }) {
  const { assessment_id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { answers?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const rawAnswers = body.answers;
  if (!rawAnswers || typeof rawAnswers !== "object") {
    return NextResponse.json({ error: "answers is required" }, { status: 400 });
  }

  // Authorize via RLS (assessment is child-scoped).
  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .select("id, child_id, status, starting_phase, placement_mode")
    .eq("id", assessment_id)
    .maybeSingle();
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  if (!assessment) return NextResponse.json({ error: "Assessment not found or not accessible" }, { status: 403 });
  if (assessment.status !== "scored" || !assessment.starting_phase) {
    return NextResponse.json({ error: "The Compass must be completed before the readiness check" }, { status: 409 });
  }
  if (assessment.placement_mode !== "readiness_module_first") {
    return NextResponse.json({ error: "No readiness check is needed for this placement" }, { status: 409 });
  }

  const admin = createAdminClient();

  // One-shot (decision 5).
  const { data: existing } = await admin
    .from("readiness_check_results")
    .select("id")
    .eq("assessment_id", assessment_id)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "Readiness check already completed" }, { status: 409 });

  // Load the versioned content and this phase's item set.
  const { data: contentRow } = await admin
    .from("readiness_content")
    .select("content_json")
    .order("schema_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const content = contentRow?.content_json as ReadinessContent | undefined;
  const check = content?.phases.find((p) => p.phase_number === assessment.starting_phase);
  if (!content || !check) {
    return NextResponse.json({ error: "Readiness content not available" }, { status: 500 });
  }

  // Only booleans keyed by this phase's item ids count.
  const answers: Record<string, boolean> = {};
  for (const item of check.items) {
    const v = rawAnswers[item.id];
    if (typeof v === "boolean") answers[item.id] = v;
  }
  if (Object.keys(answers).length < check.items.length) {
    return NextResponse.json({ error: "Please answer all five questions" }, { status: 400 });
  }

  const result = scoreReadiness(check, answers, content.passYesMin);

  const { error: insErr } = await admin.from("readiness_check_results").insert({
    assessment_id,
    child_id: assessment.child_id,
    phase_number: assessment.starting_phase,
    answers,
    yes_count: result.yesCount,
    passed: result.passed,
    hard_item_flagged: result.hardItemFlagged,
    flag_phrase: result.flagPhrase,
    schema_version: content.schemaVersion,
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({
    passed: result.passed,
    yes_count: result.yesCount,
    hard_item_flagged: result.hardItemFlagged,
    flag_phrase: result.flagPhrase,
  });
}
