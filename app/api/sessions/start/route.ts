import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseSessionScript } from "@/lib/engine/session-script";

/**
 * POST /api/sessions/start
 * Body: { child_id: string, session_id: string }
 *
 * Creates a `session_instances` row pinned to the session's current
 * content_version, and returns the version-pinned RL behavior script for the
 * runtime to execute locally. Server-authoritative per API.md: the client must
 * not choose which content_version it runs under.
 *
 * NOTE: reads curriculum_content via PostgREST, so the `curriculum_content`
 * schema must be exposed in the Supabase API settings (Dashboard → API →
 * Exposed schemas) for this to succeed.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { child_id?: string; session_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { child_id, session_id } = body;
  if (!child_id || !session_id) {
    return NextResponse.json(
      { error: "child_id and session_id are required" },
      { status: 400 },
    );
  }

  // Authorize: RLS ensures this returns a row only if the caller may access
  // this child.
  const { data: child, error: childErr } = await supabase
    .from("children")
    .select("id, age_bracket")
    .eq("id", child_id)
    .maybeSingle();
  if (childErr) {
    return NextResponse.json({ error: childErr.message }, { status: 500 });
  }
  if (!child) {
    return NextResponse.json({ error: "Child not found or not accessible" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Resolve the session's pinned content_version + script (server-authoritative).
  const { data: session, error: sessErr } = await admin
    .schema("curriculum_content")
    .from("sessions")
    .select("id, phase_number, session_number, age_bracket, content_version, content_json")
    .eq("id", session_id)
    .maybeSingle();
  if (sessErr) {
    return NextResponse.json({ error: sessErr.message }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json({ error: "Session content not found" }, { status: 404 });
  }

  // §13.3 variant guard: a bracket-specific session variant must match the
  // child's bracket. Without this, session_instances.age_bracket (stamped from
  // the child) would contaminate the Age-Bracket Transition Rule's in-bracket
  // window with wrong-variant attempts. Null session bracket = all ages.
  if (session.age_bracket && child.age_bracket && session.age_bracket !== child.age_bracket) {
    return NextResponse.json(
      { error: "This activity variant is for a different age group — the activities list shows the right ones." },
      { status: 400 },
    );
  }

  const script = parseSessionScript(session.content_json);
  if (!script) {
    // Content problem, not a code problem: flag to content review, don't patch.
    return NextResponse.json(
      { error: "This session's content is not runnable yet (invalid or missing script). Flag to content review." },
      { status: 422 },
    );
  }

  // Variant decision (server-authoritative — the client never chooses): serve
  // the Simplified variant when the child's most recent completed attempt at
  // THIS session ended simplify_triggered and the script provides one.
  let runSimplified = false;
  let simplifiedReason: "retake_support" | "readiness_ease_in" | null = null;
  const { data: lastAttempt } = await admin
    .from("session_instances")
    .select("outcome")
    .eq("child_id", child_id)
    .eq("session_id", session_id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastAttempt?.outcome === "simplify_triggered" && script.simplified) {
    runSimplified = true;
    simplifiedReason = "retake_support";
  }

  // Readiness ease-in (owner ruling 2026-08-09, interim for §6.3): when the
  // Compass placed this child with placement_mode = readiness_module_first,
  // the very FIRST session they run in the placed phase is served as its
  // gentler Simplified variant.
  // TODO(readiness-modules): dedicated 5-item readiness checks per phase are to
  // be authored before the dissertation cohort; when they exist, this ease-in
  // is replaced by the real readiness module flow. Do not build a placeholder.
  if (!runSimplified && script.simplified) {
    const { data: assessment } = await admin
      .from("assessments")
      .select("starting_phase, placement_mode")
      .eq("child_id", child_id)
      .eq("status", "scored")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (
      assessment?.placement_mode === "readiness_module_first" &&
      assessment.starting_phase === session.phase_number
    ) {
      const { data: phaseSessions } = await admin
        .schema("curriculum_content")
        .from("sessions")
        .select("id")
        .eq("phase_number", session.phase_number);
      const phaseSessionIds = (phaseSessions ?? []).map((s) => s.id as string);
      if (phaseSessionIds.length > 0) {
        const { count } = await admin
          .from("session_instances")
          .select("id", { count: "exact", head: true })
          .eq("child_id", child_id)
          .not("completed_at", "is", null)
          .in("session_id", phaseSessionIds);
        if ((count ?? 0) === 0) {
          runSimplified = true;
          simplifiedReason = "readiness_ease_in";
        }
      }
    }
  }

  // Insert through the caller's own session so the RLS with-check
  // (ran_by_caregiver_id = auth.uid()) is enforced.
  const { data: instance, error: insErr } = await supabase
    .from("session_instances")
    .insert({
      child_id,
      session_id,
      content_version: session.content_version,
      ran_by_caregiver_id: user.id,
      // §13.3: stamp the child's current bracket so the Age-Bracket Transition
      // Rule's in-bracket window is a plain column filter (null if unassigned).
      age_bracket: child.age_bracket,
      ran_simplified: runSimplified,
    })
    .select("id")
    .single();
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const variant = runSimplified && script.simplified ? script.simplified : script;
  return NextResponse.json({
    session_instance_id: instance.id,
    content_version: session.content_version,
    phase_number: session.phase_number,
    session_number: session.session_number,
    simplified: runSimplified,
    simplified_reason: simplifiedReason,
    script: variant,
  });
}
