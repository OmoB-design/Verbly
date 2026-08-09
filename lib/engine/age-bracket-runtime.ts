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

  const { data: child, error: childErr } = await admin
    .from("children")
    .select("dob, age_bracket")
    .eq("id", childId)
    .single();
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

  // Window: last AGE_GATE_WINDOW completed sessions in the CURRENT bracket.
  const { data: recent, error: rErr } = await admin
    .from("session_instances")
    .select("id, score_percent, outcome, completed_at")
    .eq("child_id", childId)
    .eq("age_bracket", currentBracket)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(AGE_GATE_WINDOW);
  if (rErr) throw new Error(`age-bracket: window read failed: ${rErr.message}`);
  const windowInstances = (recent ?? []).slice().reverse(); // chronological

  // Top-tier share per session (fraction of check-ins at base credit 100).
  const instanceIds = windowInstances.map((r) => r.id);
  const shareByInstance = new Map<string, number>();
  if (instanceIds.length > 0) {
    const { data: cks, error: cErr } = await admin
      .from("session_checkins")
      .select("session_instance_id, credit_value")
      .in("session_instance_id", instanceIds);
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
  const { data: lastT } = await admin
    .from("phase_history")
    .select("entered_at")
    .eq("child_id", childId)
    .eq("trigger_reason", "age_bracket_transition")
    .order("entered_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastT?.entered_at) {
    const { count } = await admin
      .from("session_instances")
      .select("id", { count: "exact", head: true })
      .eq("child_id", childId)
      .not("completed_at", "is", null)
      .gt("completed_at", lastT.entered_at);
    sessionsSinceLastTransition = count ?? 0;
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
    reason: decision.reason,
  };
}
