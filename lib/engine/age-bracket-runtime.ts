import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AGE_BRACKETS,
  AGE_FLOOR_NEXT_BRACKET_MONTHS,
  type AgeBracket,
} from "@/lib/compass/contract";
import {
  AGE_GATE_WINDOW,
  AGE_COOLDOWN_SESSIONS,
  evaluateAgeBracketTransition,
  type AgeWindowSession,
} from "./age-bracket";

/** Top, unprompted tier = base credit 100 (Independent/Spontaneous). */
const TOP_TIER_CREDIT = 100;

export interface AgeBracketResult {
  evaluated: boolean;
  transitioned: boolean;
  toAgeBracket?: AgeBracket;
  blockedByAgeFloor?: boolean;
  /** §13.5 instrumentation: the three gate outcomes + cooldown state for this
   *  evaluation, persisted by the caller so the threshold-validation trigger
   *  can be computed over real data. */
  gates?: { g1Mean: boolean; g2TopTier: boolean; g3NoRetakes: boolean };
  blockedByCooldown?: boolean;
  windowSize?: number;
  reason: string;
}

function ageInMonths(dob: string, now: Date): number {
  const d = new Date(dob);
  let months = (now.getUTCFullYear() - d.getUTCFullYear()) * 12 + (now.getUTCMonth() - d.getUTCMonth());
  if (now.getUTCDate() < d.getUTCDate()) months -= 1;
  return months;
}

function isBracket(value: unknown): value is AgeBracket {
  return typeof value === "string" && (AGE_BRACKETS as readonly string[]).includes(value);
}

/**
 * Assemble the facts the pure Age-Bracket engine needs (current bracket, next
 * bracket + floor, the last-3 in-bracket window, cooldown), evaluate, and —
 * only when it fires — move the child up one bracket and write the single
 * audit-trail row (trigger_reason age_bracket_transition, with age_bracket).
 *
 * Post-unification (§13.3): the bracket is a child-level varchar
 * (children.age_bracket), the same single scheme the Compass and curriculum use.
 * The in-bracket window is a plain column filter on session_instances.age_bracket
 * — no lookup table. `phaseId` is still passed so the resulting phase_history row
 * records the phase the child was on (an age-bracket move does not change the
 * phase). Pure decision logic lives in age-bracket.ts; this does only DB assembly
 * and the writes (service role). Caller passes `now` for tests.
 */
export async function runAgeBracketEvaluation(
  admin: SupabaseClient,
  params: { childId: string; phaseId: string; now?: Date },
): Promise<AgeBracketResult> {
  const now = params.now ?? new Date();
  const { childId, phaseId } = params;

  // Batch 1 — all keyed on childId alone, so they run in parallel: the child
  // row, the recent completed sessions, and the most recent bracket transition.
  // The window wants "last AGE_GATE_WINDOW completed sessions IN the current
  // bracket", whose filter value comes from the child row — to keep the reads
  // parallel we over-fetch (3× the window) unfiltered and filter in memory.
  // Safe because instances are stamped with the child's bracket at /start and
  // the single-active-session rule means at most ONE in-flight session can
  // straddle a bracket transition, so the window's rows always sit within the
  // last 3×AGE_GATE_WINDOW completions.
  const [childRes, recentRes, lastTRes] = await Promise.all([
    admin.from("children").select("dob, age_bracket").eq("id", childId).single(),
    admin
      .from("session_instances")
      .select("id, score_percent, outcome, completed_at, age_bracket")
      .eq("child_id", childId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(AGE_GATE_WINDOW * 3),
    admin
      .from("phase_history")
      .select("entered_at")
      .eq("child_id", childId)
      .eq("trigger_reason", "age_bracket_transition")
      .order("entered_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const { data: child, error: childErr } = childRes;
  if (childErr) throw new Error(`age-bracket: child read failed: ${childErr.message}`);
  if (!isBracket(child.age_bracket)) {
    return { evaluated: false, transitioned: false, reason: "No age bracket assigned yet (child not onboarded through the Compass)." };
  }
  if (!child.dob) {
    return { evaluated: false, transitioned: false, reason: "No date of birth — cannot enforce the chronological age floor." };
  }

  const currentBracket = child.age_bracket;
  const currentIdx = AGE_BRACKETS.indexOf(currentBracket);
  const nextBracket = AGE_BRACKETS[currentIdx + 1] as AgeBracket | undefined;
  const nextVariantFloorMonths = AGE_FLOOR_NEXT_BRACKET_MONTHS[currentBracket];
  if (!nextBracket || nextVariantFloorMonths === null) {
    return { evaluated: false, transitioned: false, reason: "Already at the oldest age bracket — nothing to transition to." };
  }

  // Window: last AGE_GATE_WINDOW completed sessions in the CURRENT bracket
  // (filtered in memory from the over-fetched Batch 1 read — see note above).
  const { data: recent, error: rErr } = recentRes;
  if (rErr) throw new Error(`age-bracket: window read failed: ${rErr.message}`);
  const windowInstances = (recent ?? [])
    .filter((r) => r.age_bracket === currentBracket)
    .slice(0, AGE_GATE_WINDOW)
    .reverse(); // chronological

  const lastT = lastTRes.data;

  // Batch 2 — independent of each other: the window's check-ins (top-tier
  // share) and the cooldown count (sessions completed since the last bracket
  // transition; skipped when there is none — cooldown satisfied by default).
  const instanceIds = windowInstances.map((r) => r.id);
  const [cksRes, cooldownRes] = await Promise.all([
    instanceIds.length > 0
      ? admin
          .from("session_checkins")
          .select("session_instance_id, credit_value")
          .in("session_instance_id", instanceIds)
      : Promise.resolve({ data: null, error: null }),
    lastT?.entered_at
      ? admin
          .from("session_instances")
          .select("id", { count: "exact", head: true })
          .eq("child_id", childId)
          .not("completed_at", "is", null)
          .gt("completed_at", lastT.entered_at)
      : Promise.resolve({ count: null }),
  ]);

  // Top-tier share per session (fraction of check-ins at base credit 100).
  const shareByInstance = new Map<string, number>();
  if (instanceIds.length > 0) {
    const { data: cks, error: cErr } = cksRes as { data: { session_instance_id: string; credit_value: number }[] | null; error: { message: string } | null };
    if (cErr) throw new Error(`age-bracket: check-ins read failed: ${cErr.message}`);
    const totals = new Map<string, { top: number; all: number }>();
    for (const c of cks ?? []) {
      const t = totals.get(c.session_instance_id) ?? { top: 0, all: 0 };
      t.all += 1;
      if (Number(c.credit_value) === TOP_TIER_CREDIT) t.top += 1;
      totals.set(c.session_instance_id, t);
    }
    for (const [id, t] of totals) shareByInstance.set(id, t.all > 0 ? t.top / t.all : 0);
  }

  const windowSessions: AgeWindowSession[] = windowInstances.map((r) => ({
    scorePercent: Number(r.score_percent ?? 0),
    topTierShare: shareByInstance.get(r.id) ?? 0,
    triggeredRetake: r.outcome !== "advance", // any non-advance outcome = Repeat Condition
  }));

  // Cooldown: sessions completed since the last age-bracket transition.
  let sessionsSinceLastTransition = AGE_COOLDOWN_SESSIONS; // default: no prior transition → cooldown satisfied
  if (lastT?.entered_at) {
    sessionsSinceLastTransition = cooldownRes.count ?? 0;
  }

  const decision = evaluateAgeBracketTransition({
    window: windowSessions,
    childAgeMonths: ageInMonths(child.dob, now),
    nextVariantFloorMonths,
    sessionsSinceLastTransition,
  });

  if (!decision.transition) {
    return {
      evaluated: true,
      transitioned: false,
      blockedByAgeFloor: decision.blockedByAgeFloor,
      gates: decision.gates,
      blockedByCooldown: decision.blockedByCooldown,
      windowSize: windowSessions.length,
      reason: decision.reason,
    };
  }

  // Fire: move up one bracket and write the single audit-trail row. The phase is
  // unchanged; we record it with the current phase_id + its content_version.
  const { data: phase, error: pErr } = await admin
    .schema("curriculum_content")
    .from("phases")
    .select("content_version")
    .eq("id", phaseId)
    .single();
  if (pErr) throw new Error(`age-bracket: phase read failed: ${pErr.message}`);

  const { error: insErr } = await admin.from("phase_history").insert({
    child_id: childId,
    phase_id: phaseId,
    trigger_reason: "age_bracket_transition",
    content_version: phase.content_version,
    age_bracket: nextBracket,
  });
  if (insErr) throw new Error(`age-bracket: phase_history insert failed: ${insErr.message}`);

  const { error: updErr } = await admin
    .from("children")
    .update({ age_bracket: nextBracket })
    .eq("id", childId);
  if (updErr) throw new Error(`age-bracket: child update failed: ${updErr.message}`);

  return {
    evaluated: true,
    transitioned: true,
    toAgeBracket: nextBracket,
    gates: decision.gates,
    blockedByCooldown: false,
    windowSize: windowSessions.length,
    reason: decision.reason,
  };
}
