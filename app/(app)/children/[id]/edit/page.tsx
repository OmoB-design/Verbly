import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DeleteChildCard, EditChildForm } from "@/components/children/edit-child-form";
import { PlacementSettings } from "@/components/children/placement-settings";
import { ParticipantsRoster } from "@/components/children/participants-roster";
import { SlpAccessList } from "@/components/children/slp-access-list";
import { CompassSettingsCard } from "@/components/children/compass-settings-card";

/** Parse the stored reassessment interval ("6 weeks") into days; default 42. */
function intervalDays(interval: string | null): number {
  const m = /^(\d+)\s*(day|week|month)s?$/.exec((interval ?? "").trim());
  if (!m) return 42;
  const n = Number(m[1]);
  return m[2] === "day" ? n : m[2] === "week" ? n * 7 : n * 30;
}

/**
 * Per-child settings (owner spec 2026-08-14): profile + languages +
 * second-adult, placement change, reassessment/resume, session helpers, SLP
 * access transparency, and profile deletion. Caregiver-only.
 */
export default async function ChildSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: child } = await supabase
    .from("children")
    .select(
      "id, name, dob, age_bracket, primary_caregiver_id, current_phase_id, primary_language, additional_languages, second_adult_available",
    )
    .eq("id", id)
    .maybeSingle();
  if (!child) notFound();
  if (child.primary_caregiver_id !== user.id) redirect(`/children/${id}`);

  const [{ data: currentPhase }, { data: scored }, { data: inProgress }, { data: phases }, { data: links }, { data: roster }] =
    await Promise.all([
      child.current_phase_id
        ? supabase
            .schema("curriculum_content")
            .from("phases")
            .select("phase_number")
            .eq("id", child.current_phase_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("assessments")
        .select("id, recommended_phase, starting_phase, completed_at, suggested_reassessment_interval")
        .eq("child_id", id)
        .eq("status", "scored")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("assessments")
        .select("id")
        .eq("child_id", id)
        .eq("status", "in_progress")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .schema("curriculum_content")
        .from("phases")
        .select("phase_number, name, clinical_goal")
        .order("phase_number", { ascending: true }),
      supabase.from("slp_child_links").select("slp_id, linked_at").eq("child_id", id),
      supabase
        .from("saved_participants")
        .select("id, display_name, role")
        .eq("child_id", id)
        .order("created_at", { ascending: true }),
    ]);

  // SLP display names via admin (slps rows are self-read-only under RLS).
  const admin = createAdminClient();
  const linkedSlps: { id: string; name: string; linked_at: string | null }[] = [];
  if ((links ?? []).length > 0) {
    const { data: slpRows } = await admin
      .from("slps")
      .select("id, full_name")
      .in("id", (links ?? []).map((l) => l.slp_id));
    for (const l of links ?? []) {
      const row = (slpRows ?? []).find((s) => s.id === l.slp_id);
      linkedSlps.push({ id: l.slp_id, name: row?.full_name ?? "Your SLP", linked_at: l.linked_at });
    }
  }

  // Deduplicate phases by phase_number (multiple content versions may coexist).
  const phaseOptions = [...new Map((phases ?? []).map((p) => [p.phase_number, p])).values()];

  const dueAt = scored?.completed_at
    ? new Date(
        new Date(scored.completed_at).getTime() +
          intervalDays(scored.suggested_reassessment_interval) * 86400000,
      ).toISOString()
    : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href={`/children/${id}`}>← Back to {child.name}</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{child.name}&apos;s settings</h1>
      </div>

      <EditChildForm
        childId={child.id}
        initialName={child.name}
        initialDob={child.dob ?? ""}
        hasBracket={!!child.age_bracket}
        initialPrimaryLanguage={child.primary_language ?? ""}
        initialAdditionalLanguages={child.additional_languages ?? ""}
        initialSecondAdult={child.second_adult_available ?? ""}
      />

      {scored ? (
        <PlacementSettings
          assessmentId={scored.id}
          childName={child.name}
          currentPhase={currentPhase?.phase_number ?? null}
          enginePhase={scored.recommended_phase}
          phases={phaseOptions}
        />
      ) : null}

      <CompassSettingsCard
        childId={child.id}
        childName={child.name}
        lastCompletedAt={scored?.completed_at ?? null}
        dueAt={dueAt}
        inProgressAssessmentId={inProgress?.id ?? null}
      />

      <ParticipantsRoster childId={child.id} participants={roster ?? []} />

      <SlpAccessList childId={child.id} childName={child.name} linkedSlps={linkedSlps} />

      <DeleteChildCard childId={child.id} childName={child.name} />
    </div>
  );
}
