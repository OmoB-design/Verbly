import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { phaseName } from "@/lib/compass/contract";

/**
 * GET /api/ask-verbly/[child_id] — the data-fetch layer for "Ask Verbly".
 *
 * Returns FACTS only (RLS-scoped); answer assembly happens in
 * lib/ask-verbly.ts from fixed sentence templates. The separation is
 * deliberate (owner spec): an LLM could replace the assembler later without
 * touching this endpoint or the UI. No language model is involved anywhere.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ child_id: string }> }) {
  const { child_id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: child } = await supabase
    .from("children")
    .select("id, name, current_phase_id")
    .eq("id", child_id)
    .maybeSingle();
  if (!child) return NextResponse.json({ error: "Child not found or not accessible" }, { status: 403 });

  let phase: { phase_number: number; clinical_goal: string | null; phase_guidance: string | null } | null = null;
  if (child.current_phase_id) {
    const { data } = await supabase
      .schema("curriculum_content")
      .from("phases")
      .select("phase_number, clinical_goal, phase_guidance")
      .eq("id", child.current_phase_id)
      .maybeSingle();
    phase = data ?? null;
  }

  // Sessions in the current phase (phase membership by phase_number, matching
  // the engine's own scoping).
  let sessionsInPhase: { score: number | null; outcome: string | null; completed_at: string }[] = [];
  if (phase) {
    const { data: phaseSessions } = await supabase
      .schema("curriculum_content")
      .from("sessions")
      .select("id")
      .eq("phase_number", phase.phase_number);
    const ids = (phaseSessions ?? []).map((s) => s.id);
    if (ids.length > 0) {
      const { data: attempts } = await supabase
        .from("session_instances")
        .select("score_percent, outcome, completed_at")
        .eq("child_id", child_id)
        .in("session_id", ids)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: true });
      sessionsInPhase = (attempts ?? []).map((a) => ({
        score: a.score_percent === null ? null : Number(a.score_percent),
        outcome: a.outcome,
        completed_at: a.completed_at as string,
      }));
    }
  }

  const scores = sessionsInPhase.map((s) => s.score).filter((s): s is number => s !== null);
  const last = sessionsInPhase[sessionsInPhase.length - 1] ?? null;

  // clinical_goal's first sentence serves as the phase one-liner (the guidance
  // blob is bullet-lists with no prose summary — flagged in the spec mapping).
  const goal = phase?.clinical_goal ?? "";
  const goalBreak = goal.search(/(?<=[.!?])\s/);

  return NextResponse.json({
    child_name: child.name,
    phase_number: phase?.phase_number ?? null,
    phase_name: phase ? phaseName(phase.phase_number) : null,
    phase_one_liner: phase ? (goalBreak > 0 ? goal.slice(0, goalBreak) : goal) : null,
    phase_guidance: phase?.phase_guidance ?? null,
    sessions_completed: sessionsInPhase.length,
    first_score: scores.length > 0 ? scores[0] : null,
    latest_score: scores.length > 0 ? scores[scores.length - 1] : null,
    best_score: scores.length > 0 ? Math.max(...scores) : null,
    last_outcome: last?.outcome ?? null,
  });
}
