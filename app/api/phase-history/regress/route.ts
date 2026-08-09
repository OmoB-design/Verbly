import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/phase-history/regress
 * Body: { child_id: string, target_phase_id: string }
 *
 * Caregiver-initiated regression to an EARLIER phase the child has actually
 * reached. A server route (not a direct insert) because it must validate the
 * target against the child's real history — "can't regress to a phase never
 * reached" (API.md) — and because `phase_history` is server-authoritative
 * (users have no write policy on it).
 *
 * Writes one `phase_history` row with `trigger_reason: caregiver_regression`
 * (kept analytically separable from algorithmic `rl_advance` placements) and
 * moves `children.current_phase_id`.
 *
 * Only the PRIMARY caregiver may regress a child (an account-level action, per
 * the two-tier model in DATABASE.md).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { child_id?: string; target_phase_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { child_id, target_phase_id } = body;
  if (!child_id || !target_phase_id) {
    return NextResponse.json(
      { error: "child_id and target_phase_id are required" },
      { status: 400 },
    );
  }

  // Authorize: must be the primary caregiver of this child.
  const { data: child, error: childErr } = await supabase
    .from("children")
    .select("id, primary_caregiver_id, current_phase_id")
    .eq("id", child_id)
    .maybeSingle();
  if (childErr) return NextResponse.json({ error: childErr.message }, { status: 500 });
  if (!child) {
    return NextResponse.json({ error: "Child not found or not accessible" }, { status: 403 });
  }
  if (child.primary_caregiver_id !== user.id) {
    return NextResponse.json(
      { error: "Only the primary caregiver can change a child's phase" },
      { status: 403 },
    );
  }

  const admin = createAdminClient();

  // The target must be a phase the child has actually entered.
  const { data: reached, error: reachedErr } = await admin
    .from("phase_history")
    .select("phase_id")
    .eq("child_id", child_id);
  if (reachedErr) return NextResponse.json({ error: reachedErr.message }, { status: 500 });
  const reachedIds = new Set((reached ?? []).map((r) => r.phase_id));
  if (!reachedIds.has(target_phase_id)) {
    return NextResponse.json(
      { error: "Cannot regress to a phase this child has never reached" },
      { status: 400 },
    );
  }

  // Resolve phase numbers to ensure this is actually a regression (earlier
  // than the current phase) and to pin the target's content_version.
  const phaseIdsToLookup = [target_phase_id];
  if (child.current_phase_id) phaseIdsToLookup.push(child.current_phase_id);
  const { data: phases, error: phasesErr } = await admin
    .schema("curriculum_content")
    .from("phases")
    .select("id, phase_number, content_version")
    .in("id", phaseIdsToLookup);
  if (phasesErr) return NextResponse.json({ error: phasesErr.message }, { status: 500 });

  const target = (phases ?? []).find((p) => p.id === target_phase_id);
  if (!target) {
    return NextResponse.json({ error: "Target phase not found" }, { status: 404 });
  }
  const current = child.current_phase_id
    ? (phases ?? []).find((p) => p.id === child.current_phase_id)
    : null;
  if (current && target.phase_number >= current.phase_number) {
    return NextResponse.json(
      { error: "Target phase is not earlier than the child's current phase" },
      { status: 400 },
    );
  }

  const { error: insErr } = await admin.from("phase_history").insert({
    child_id,
    phase_id: target_phase_id,
    trigger_reason: "caregiver_regression",
    content_version: target.content_version,
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  const { error: updErr } = await admin
    .from("children")
    .update({ current_phase_id: target_phase_id })
    .eq("id", child_id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({
    child_id,
    regressed_to_phase_number: target.phase_number,
    trigger_reason: "caregiver_regression",
  });
}
