import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PASS_MARK, decideAdvancement } from "@/lib/engine/advancement";
import {
  scoreSessionPercent,
  rollingBaselineStep,
  type Bonus,
  type ScoredTrial,
} from "@/lib/engine/scoring";
import {
  runAgeBracketEvaluation,
  type AgeBracketResult,
} from "@/lib/engine/age-bracket-runtime";

/**
 * POST /api/sessions/complete
 * Body: { session_instance_id: string }
 *
 * Server-authoritative. Computes score_percent from the session's recorded
 * check-ins, applies the deterministic AdvancementDecisionEngine (75% / 3
 * consecutive / retake / simplify), writes the outcome, and — only on a phase
 * graduation — writes the `phase_history` row (`rl_advance`) and moves the
 * child's `current_phase_id`. The client can neither compute nor submit the
 * score or outcome (no user write policy exists for these fields).
 *
 * Depends on the `curriculum_content` schema being exposed to the API.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { session_instance_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const sessionInstanceId = body.session_instance_id;
  if (!sessionInstanceId) {
    return NextResponse.json({ error: "session_instance_id is required" }, { status: 400 });
  }

  // Authorize via RLS: the caller only sees their own child's instance.
  const { data: instance, error: instErr } = await supabase
    .from("session_instances")
    .select("id, child_id, session_id, completed_at")
    .eq("id", sessionInstanceId)
    .maybeSingle();
  if (instErr) return NextResponse.json({ error: instErr.message }, { status: 500 });
  if (!instance) {
    return NextResponse.json({ error: "Session not found or not accessible" }, { status: 403 });
  }
  if (instance.completed_at) {
    return NextResponse.json({ error: "Session already completed" }, { status: 409 });
  }

  const admin = createAdminClient();

  // 1. Score from recorded check-ins, applying the Scoring-Appendix §3 bonuses
  //    server-side (base credit + per-trial bonus). See lib/engine/scoring.ts.
  const { data: checkins, error: ckErr } = await admin
    .from("session_checkins")
    .select("credit_value, bonus_kind, bonus_observation")
    .eq("session_instance_id", sessionInstanceId);
  if (ckErr) return NextResponse.json({ error: ckErr.message }, { status: 500 });

  // Phase 12 (approximation) is history-dependent: gather this child's PRIOR
  // approximation attempts (excluding this session) to compute each target's
  // rolling baseline. Interpretation flagged: baseline uses prior sessions
  // only, not earlier trials within the current session.
  const priorStepsByTarget = new Map<string, number[]>();
  if ((checkins ?? []).some((c) => c.bonus_kind === "approximation")) {
    const { data: priorApprox, error: paErr } = await admin
      .from("session_checkins")
      .select("bonus_observation, created_at, session_instances!inner(child_id)")
      .eq("session_instances.child_id", instance.child_id)
      .eq("bonus_kind", "approximation")
      .neq("session_instance_id", sessionInstanceId)
      .order("created_at", { ascending: true });
    if (paErr) return NextResponse.json({ error: paErr.message }, { status: 500 });
    for (const r of priorApprox ?? []) {
      const obs = r.bonus_observation as { target?: string; step?: number } | null;
      if (obs && typeof obs.target === "string" && typeof obs.step === "number") {
        const arr = priorStepsByTarget.get(obs.target) ?? [];
        arr.push(obs.step);
        priorStepsByTarget.set(obs.target, arr);
      }
    }
  }

  const trials: ScoredTrial[] = (checkins ?? []).map((c) => {
    const baseCredit = Number(c.credit_value);
    if (!c.bonus_kind) return { baseCredit };
    const obs = (c.bonus_observation ?? {}) as Record<string, unknown>;
    let bonus: Bonus;
    if (c.bonus_kind === "attribute") {
      bonus = { kind: "attribute", added: obs.added === true };
    } else if (c.bonus_kind === "stem") {
      bonus = { kind: "stem", correct: obs.correct === true };
    } else {
      const target = typeof obs.target === "string" ? obs.target : "";
      const step = typeof obs.step === "number" ? obs.step : 0;
      const baseline = rollingBaselineStep(priorStepsByTarget.get(target) ?? []);
      bonus = { kind: "approximation", exceededBaseline: step > baseline };
    }
    return { baseCredit, bonus };
  });
  const score = scoreSessionPercent(trials);

  // 2. Resolve the current session's phase.
  const { data: curSession, error: curErr } = await admin
    .schema("curriculum_content")
    .from("sessions")
    .select("id, phase_number, phase_id")
    .eq("id", instance.session_id)
    .single();
  if (curErr) return NextResponse.json({ error: curErr.message }, { status: 500 });
  const currentPhaseNumber = curSession.phase_number;

  // 3. Assemble history for the decision.
  const { data: history, error: histErr } = await admin
    .from("session_instances")
    .select("id, session_id, score_percent, completed_at")
    .eq("child_id", instance.child_id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: true });
  if (histErr) return NextResponse.json({ error: histErr.message }, { status: 500 });

  const completed = history ?? [];
  const sessionIds = [...new Set(completed.map((r) => r.session_id))];
  const phaseBySession = new Map<string, number>();
  if (sessionIds.length > 0) {
    const { data: sess, error: sErr } = await admin
      .schema("curriculum_content")
      .from("sessions")
      .select("id, phase_number")
      .in("id", sessionIds);
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
    for (const s of sess ?? []) phaseBySession.set(s.id, s.phase_number);
  }

  // Consecutive passing attempts within the current phase, immediately before
  // this attempt (trailing run of passes over completed instances in-phase).
  const inPhase = completed.filter(
    (r) => phaseBySession.get(r.session_id) === currentPhaseNumber,
  );
  let priorConsecutivePasses = 0;
  for (let i = inPhase.length - 1; i >= 0; i--) {
    if ((inPhase[i].score_percent ?? 0) >= PASS_MARK) priorConsecutivePasses++;
    else break;
  }

  // Prior failed attempts at THIS same curriculum session.
  const priorFailedAttemptsThisSession = completed.filter(
    (r) => r.session_id === instance.session_id && (r.score_percent ?? 0) < PASS_MARK,
  ).length;

  const decision = decideAdvancement({
    score,
    priorConsecutivePasses,
    priorFailedAttemptsThisSession,
  });

  // 4. Persist the outcome (service role — users cannot write these fields).
  const completedAt = new Date().toISOString();
  const { error: updErr } = await admin
    .from("session_instances")
    .update({ outcome: decision.outcome, score_percent: score, completed_at: completedAt })
    .eq("id", sessionInstanceId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // 5. On phase graduation, write the single audit trail row and move the child.
  let advancedToPhaseNumber: number | null = null;
  if (decision.advancesPhase) {
    const { data: nextPhase } = await admin
      .schema("curriculum_content")
      .from("phases")
      .select("id, phase_number, content_version")
      .eq("phase_number", currentPhaseNumber + 1)
      .order("content_version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (nextPhase) {
      const { error: phErr } = await admin.from("phase_history").insert({
        child_id: instance.child_id,
        phase_id: nextPhase.id,
        trigger_reason: "rl_advance",
        content_version: nextPhase.content_version,
      });
      if (phErr) return NextResponse.json({ error: phErr.message }, { status: 500 });

      await admin
        .from("children")
        .update({ current_phase_id: nextPhase.id })
        .eq("id", instance.child_id);
      advancedToPhaseNumber = nextPhase.phase_number;
    }
    // If there is no next phase, the child has completed the final phase (12);
    // no phase_history row is written and the child stays put.
  }

  // 6. Age-Bracket Transition — evaluate only when the child is NOT graduating
  //    the phase (graduation supersedes an in-phase variant move). A failure
  //    here must not fail the session, whose outcome is already persisted.
  let ageBracket: AgeBracketResult | { evaluated: false; transitioned: false; error: string } | null = null;
  if (!decision.advancesPhase) {
    try {
      ageBracket = await runAgeBracketEvaluation(admin, {
        childId: instance.child_id,
        phaseId: curSession.phase_id,
      });
    } catch (e) {
      ageBracket = { evaluated: false, transitioned: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  return NextResponse.json({
    outcome: decision.outcome,
    score_percent: score,
    advancesPhase: decision.advancesPhase,
    advancedToPhaseNumber,
    reason: decision.reason,
    ageBracket,
  });
}
