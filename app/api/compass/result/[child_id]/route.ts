import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/compass/result/[child_id]
 *
 * Returns the child's most recent FINALIZED Compass result (the stored §8
 * payload). RLS-scoped: the caller only sees a child they own or an SLP is
 * linked to. A read, so it's a direct query — no decision logic.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ child_id: string }> }) {
  const { child_id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("assessments")
    .select("id, raw_payload, starting_phase, placement_source, completed_at")
    .eq("child_id", child_id)
    .eq("status", "scored")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No finalized assessment for this child" }, { status: 404 });

  // raw_payload is the engine's §8 result; starting_phase/placement_source may
  // have been updated by a later caregiver override, so surface those too.
  // assessment_id lets the caregiver override the placement from a revisit.
  return NextResponse.json({
    ...(data.raw_payload as Record<string, unknown>),
    assessment_id: data.id,
    starting_phase: data.starting_phase,
    placement_source: data.placement_source,
  });
}
