import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideAdvancement } from "@/lib/engine/advancement";
import { calculateProgressionState } from "@/lib/engine/progression";
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
import { evaluateDownwardAdvisory } from "@/lib/engine/age-bracket";

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
 * Round-trip discipline: reads that don't depend on each other's results run
 * in parallel batches (Supabase is cross-region from the function, so every
 * sequential await is a full network round trip). Write ORDER is preserved
 * exactly: outcome before the age-bracket evaluation (whose window includes
 * this session), and phase_history before children.current_phase_id (the
 * audit row must exist before the child moves).
 *
 * Depends on the `curriculum_content` schema being exposed to the API.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

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

  const admin = createAdminClient();

  // Batch A — independent: auth check, RLS-authorized instance read, and the
  // check-ins read (keyed on the id from the body; server-side only, nothing
  // is returned or written until the auth/authz checks below pass).
  const [userRes, instRes, ckRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("session_instances")
      .select("id, child_id, session_id, completed_at, ran_simplified")
      .eq("id", sessionInstanceId)
      .maybeSingle(),
    admin
      .from("session_checkins")
      .select("credit_value, bonus_kind, bonus_observation")
      .eq("session_instance_id", sessionInstanceId),
  ]);

  const user = userRes.data.user;
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Authorize via RLS: the caller only sees their own child's instance.
  let { data: instance, error: instErr } = instRes;
  if (instErr) {
    // Rare race: the parallel RLS read may have run on a token getUser() was
    // refreshing. One sequential retry with the fresh cookie before failing.
    ({ data: instance, error: instErr } = await supabase
      .from("session_instances")
      .select("id, child_id, session_id, completed_at, ran_simplified")
      .eq("id", sessionInstanceId)
      .maybeSingle());
  }
  if (instErr) return NextResponse.json({ error: instErr.message }, { status: 500 });
  if (!instance) {
    return NextResponse.json({ error: "Session not found or not accessible" }, { status: 403 });
  }
  if (instance.completed_at) {
    return NextResponse.json({ error: "Session already completed" }, { status: 409 });
  }

  const { data: checkins, error: ckErr } = ckRes;
  if (ckErr) return NextResponse.json({ error: ckErr.message }, { status: 500 });

  // Batch B — all keyed on the instance row: the session's content (for phase
  // + the minimum check-in rule), the child's full completed history (for the
  // advancement decision), and — only when this session recorded approximation
  // bonuses — the child's PRIOR approximation attempts (Phase 12 rolling
  // baseline; prior sessions only, not earlier trials within this session).
  const needsPriorApprox = (checkins ?? []).some((c) => c.bonus_kind === "approximation");
  const [curRes, histRes, paRes] = await Promise.all([
    admin
      .schema("curriculum_content")
      .from("sessions")
      .select("id, phase_number, phase_id, content_json")
      .eq("id", instance.session_id)
      .single(),
    admin
      .from("session_instances")
      .select("id, session_id, score_percent, completed_at, ran_simplified")
      .eq("child_id", instance.child_id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: true }),
    needsPriorApprox
      ? admin
          .from("session_checkins")
          .select("bonus_observation, created_at, session_instances!inner(child_id)")
          .eq("session_instances.child_id", instance.child_id)
          .eq("bonus_kind", "approximation")
          .neq("session_instance_id", sessionInstanceId)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: null, error: null }),
  ]);

  const priorStepsByTarget = new Map<string, number[]>();
  if (needsPriorApprox) {
    if (paRes.error) return NextResponse.json({ error: paRes.error.message }, { status: 500 });
    for (const r of paRes.data ?? []) {
      const obs = r.bonus_observation as { target?: string; step?: number } | null;
      if (obs && typeof obs.target === "string" && typeof obs.step === "number") {
        const arr = priorStepsByTarget.get(obs.target) ?? [];
        arr.push(obs.step);
        priorStepsByTarget.set(obs.target, arr);
      }
    }
  }

  // 1. Score from recorded check-ins, applying the Scoring-Appendix §3 bonuses
  //    server-side (base credit + per-trial bonus). See lib/engine/scoring.ts.
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

  // 2. The current session's phase (+ its script, for the minimum check-in rule).
  const { data: curSession, error: curErr } = curRes;
  if (curErr) return NextResponse.json({ error: curErr.message }, { status: 500 });
  const currentPhaseNumber = curSession.phase_number;

  // Owner ruling: a session can only be scored once at least HALF of its
  // planned check-ins are recorded — a single tap must never stand in for a
  // whole session. The runner hides "end early" until then; this is the
  // server-side guarantee. The instance simply stays unfinished (422).
  const plannedCount = (() => {
    const cj = curSession.content_json as { checkin?: { count?: number }; simplified?: { checkin?: { count?: number } } } | null;
    const variant = instance.ran_simplified ? cj?.simplified : cj;
    return typeof variant?.checkin?.count === "number" ? variant.checkin.count : 0;
  })();
  const minCheckins = Math.ceil(plannedCount / 2);
  if ((checkins ?? []).length < minCheckins) {
    return NextResponse.json(
      {
        error: `At least ${minCheckins} check-ins are needed before this session can be scored (${(checkins ?? []).length} so far).`,
        code: "insufficient_checkins",
      },
      { status: 422 },
    );
  }

  // 3. Assemble history for the decision.
  const { data: history, error: histErr } = histRes;
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

  // The ONE authoritative reading of where this child stands in the phase —
  // the same function the practice page renders from, so the screen and this
  // decision cannot disagree (lib/engine/progression.ts). Phase membership is
  // keyed by phase_number, not phase_id, so attempts recorded under an earlier
  // content version of the same phase still count.
  const phaseSessionIds = [...phaseBySession.entries()]
    .filter(([, phaseNumber]) => phaseNumber === currentPhaseNumber)
    .map(([sessionId]) => sessionId);

  const progression = calculateProgressionState({
    attempts: completed,
    phaseSessionIds,
    sessionId: instance.session_id,
  });

  const decision = decideAdvancement({
    score,
    priorConsecutivePasses: progression.consecutivePasses,
    priorFailedAttemptsThisSession: progression.priorFailedAttemptsThisSession,
    // Owner ruling 2026-08-09: a simplified pass counts in the run but cannot
    // be the graduating pass.
    ranSimplified: instance.ran_simplified === true,
  });

  // 4. Persist the outcome (service role — users cannot write these fields).
  //    Must land BEFORE the age-bracket evaluation: its window and cooldown
  //    count read completed sessions, which now include this one.
  const completedAt = new Date().toISOString();
  const { error: updErr } = await admin
    .from("session_instances")
    .update({ outcome: decision.outcome, score_percent: score, completed_at: completedAt })
    .eq("id", sessionInstanceId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // 5. On phase graduation, write the single audit trail row and move the
  //    child. Deliberately SEQUENTIAL: the phase_history row must exist before
  //    children.current_phase_id moves — never a moved child without the audit
  //    row.
  let advancedToPhaseNumber: number | null = null;
  let programmeComplete = false;
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
    if (!nextPhase) {
      // The final phase (12) is graduated: no phase transition exists, so no
      // phase_history row — the completion is recorded as a child-state fact
      // (set once) and celebrated by the runner.
      programmeComplete = true;
      await admin
        .from("children")
        .update({ programme_completed_at: completedAt })
        .eq("id", instance.child_id)
        .is("programme_completed_at", null);
    }
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

  // 7. Downward advisory (advisory-only — never moves the variant). Fires on a
  //    persistent, activity-specific drop clearly below the child's own
  //    baseline across the last 5–6 attempts at THIS activity.
  //    OPERATIONAL INTERPRETATION (launch default, flagged for sign-off):
  //    baseline = mean of this activity's completed attempts BEFORE the recent
  //    6-attempt window, requiring ≥3 baseline attempts to call it
  //    "established"; margin = engine default (15 pts).
  let downwardAdvisory: { advise: boolean; reason: string } | null = null;
  const instrumentation: Record<string, unknown> = {};
  const activityScores = completed
    .filter((r) => r.session_id === instance.session_id)
    .map((r) => Number(r.score_percent ?? 0));
  activityScores.push(score);
  const baselinePool = activityScores.slice(0, -6);
  if (baselinePool.length >= 3) {
    const baseline = Math.round((baselinePool.reduce((a, b) => a + b, 0) / baselinePool.length) * 100) / 100;
    const recent = activityScores.slice(-6);
    const adv = evaluateDownwardAdvisory({
      activityId: instance.session_id,
      recentScores: recent,
      baseline,
    });
    downwardAdvisory = { advise: adv.advise, reason: adv.reason };
    // Persist every computed evaluation (advise true OR false) on the instance:
    // the SLP progression view reads the history, and §12 validation work needs
    // the negatives too.
    instrumentation.downward_advisory = { advise: adv.advise, reason: adv.reason, baseline, recent };
  }

  // §13.5: persist the gate outcomes so the threshold-validation trigger
  // ("revisit if none of the first 50 children clear all 3 gates") can be
  // computed from data.
  if (ageBracket && "evaluated" in ageBracket && ageBracket.evaluated) {
    instrumentation.age_gate_evaluation = {
      gates: ageBracket.gates ?? null,
      transitioned: ageBracket.transitioned,
      blockedByCooldown: ageBracket.blockedByCooldown ?? false,
      blockedByAgeFloor: ageBracket.blockedByAgeFloor ?? false,
      windowSize: ageBracket.windowSize ?? 0,
    };
  }

  // Both instrumentation writes target the same row — ONE update, not two.
  // Non-fatal if it fails: the outcome is already saved.
  if (Object.keys(instrumentation).length > 0) {
    await admin.from("session_instances").update(instrumentation).eq("id", sessionInstanceId);
  }

  return NextResponse.json({
    outcome: decision.outcome,
    score_percent: score,
    advancesPhase: decision.advancesPhase,
    advancedToPhaseNumber,
    programmeComplete,
    consecutivePasses: decision.consecutivePasses,
    reason: decision.reason,
    ageBracket,
    downwardAdvisory,
  });
}
