import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { AssessmentFlow } from "@/components/compass/assessment-flow";
import { CompassResults } from "@/components/compass/compass-results";
import type { CompassResult } from "@/lib/compass/types";

export default async function CompassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ retake?: string }>;
}) {
  const { id } = await params;
  const retake = (await searchParams).retake === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: child } = await supabase.from("children").select("id, name, dob").eq("id", id).maybeSingle();
  if (!child) notFound();

  // Already completed? Surface the stored result (RLS-scoped to this
  // caregiver) — unless the caregiver explicitly chose to retake (?retake=1,
  // confirmed via modal on the results screen): then run a fresh assessment
  // (the /start endpoint creates a new in-progress row once one is scored).
  const { data: scored } = await supabase
    .from("assessments")
    .select("id, raw_payload, starting_phase, placement_source")
    .eq("child_id", id)
    .eq("status", "scored")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const backLink = (
    <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
      <Link href={`/children/${id}`}>← Back to {child.name}</Link>
    </Button>
  );

  if (scored?.raw_payload && !retake) {
    const result = {
      ...(scored.raw_payload as CompassResult),
      starting_phase: scored.starting_phase,
      placement_source: scored.placement_source,
    } as CompassResult;
    return (
      <div className="flex flex-col gap-2">
        {backLink}
        <CompassResults result={result} assessmentId={scored.id} childId={id} childName={child.name} />
      </div>
    );
  }

  if (!child.dob) {
    return (
      <div className="flex flex-col gap-2">
        {backLink}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add a date of birth first</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The Communication Compass tailors its questions to {child.name}&apos;s age, so we need a date of birth on
            their profile before starting.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {backLink}
      <AssessmentFlow childId={id} childName={child.name} />
    </div>
  );
}
