import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignBracket, SUPPORTED_AGE_MIN_MONTHS } from "@/lib/compass/contract";
import { loadCompassConfig, ageInMonths } from "@/lib/compass/load-config";

/**
 * POST /api/compass/start  { child_id }
 *
 * Creates an in-progress `assessments` row pinned to the current Compass
 * content, assigns the child's bracket from chronological age (§13.3), and
 * returns the bracket's item set for the UI to render. Out-of-range ages
 * (< 3;0 or ≥ 15;0) get the dignified §1 exit (HTTP 400, caregiver copy) with
 * no placement generated.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { child_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.child_id) return NextResponse.json({ error: "child_id is required" }, { status: 400 });

  // Authorize via RLS.
  const { data: child, error: childErr } = await supabase
    .from("children")
    .select("id, name, dob")
    .eq("id", body.child_id)
    .maybeSingle();
  if (childErr) return NextResponse.json({ error: childErr.message }, { status: 500 });
  if (!child) return NextResponse.json({ error: "Child not found or not accessible" }, { status: 403 });
  if (!child.dob) {
    return NextResponse.json(
      { error: "A date of birth is needed before the assessment — you can add it on the child's profile." },
      { status: 400 },
    );
  }

  const months = ageInMonths(child.dob);
  const bracket = assignBracket(months);
  if (bracket === null) {
    const tooYoung = months < SUPPORTED_AGE_MIN_MONTHS;
    return NextResponse.json(
      {
        out_of_range: true,
        age_months: months,
        message: tooYoung
          ? "Verbly's activities begin at age 3. For a child this young, the best next step is a conversation with a speech-language pathologist or your paediatrician."
          : "Verbly's activities are built for children up to age 14. We'd suggest talking with a speech-language pathologist about options.",
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const config = await loadCompassConfig(admin);
  if (!config) return NextResponse.json({ error: "Assessment content not available" }, { status: 500 });

  // Save-and-resume (§11): reuse the child's existing in-progress assessment
  // instead of creating a duplicate, so a revisit resumes where they left off.
  // The reused row's pinned bracket drives the item set, keeping any saved
  // draft answers aligned with the questions they were given.
  const { data: existing } = await admin
    .from("assessments")
    .select("id, age_bracket, age_months_at_assessment, draft_state")
    .eq("child_id", child.id)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let assessmentId: string;
  let bracketUsed = bracket;
  let ageMonthsUsed = months;
  let draftState: unknown = null;

  if (existing) {
    assessmentId = existing.id;
    bracketUsed = (existing.age_bracket as typeof bracket) ?? bracket;
    ageMonthsUsed = existing.age_months_at_assessment ?? months;
    draftState = existing.draft_state ?? null;
  } else {
    const { data: assessment, error: insErr } = await admin
      .from("assessments")
      .insert({
        child_id: child.id,
        status: "in_progress",
        age_bracket: bracket,
        age_months_at_assessment: months,
        schema_version: config.schemaVersion,
        curriculum_version: config.curriculumVersion,
      })
      .select("id")
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    assessmentId = assessment.id;
  }

  const forBracket = <T extends { brackets: string[] }>(arr: T[]) =>
    arr.filter((x) => x.brackets.includes(bracketUsed) || x.brackets.includes("ALL"));

  return NextResponse.json({
    assessment_id: assessmentId,
    age_bracket: bracketUsed,
    age_months: ageMonthsUsed,
    resumed: !!existing,
    draft_state: draftState,
    items: forBracket(config.items),
    benchmark_items: forBracket(config.benchmarkItems),
    red_flags: config.redFlagDefs.filter((f) => f.brackets.includes(bracketUsed) || f.brackets.includes("ALL")),
  });
}
