import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatAge, formatDate, outcomeLabel, triggerReasonLabel } from "@/lib/format";

export default async function ChildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: child } = await supabase
    .from("children")
    .select("id, name, dob, current_phase_id")
    .eq("id", id)
    .maybeSingle();
  if (!child) notFound();

  // Current phase.
  let currentPhase: { phase_number: number; name: string; clinical_goal: string | null } | null = null;
  if (child.current_phase_id) {
    const { data } = await supabase
      .schema("curriculum_content")
      .from("phases")
      .select("phase_number, name, clinical_goal")
      .eq("id", child.current_phase_id)
      .maybeSingle();
    currentPhase = data ?? null;
  }

  // Has this child completed the Communication Compass?
  const { data: scoredAssessment } = await supabase
    .from("assessments")
    .select("id")
    .eq("child_id", id)
    .eq("status", "scored")
    .limit(1)
    .maybeSingle();
  const hasCompass = !!scoredAssessment;

  // Phase history (the single audit trail), newest first.
  const { data: history } = await supabase
    .from("phase_history")
    .select("id, phase_id, trigger_reason, entered_at, age_bracket")
    .eq("child_id", id)
    .order("entered_at", { ascending: false });

  // Recent session attempts.
  const { data: sessions } = await supabase
    .from("session_instances")
    .select("id, session_id, score_percent, outcome, started_at, completed_at")
    .eq("child_id", id)
    .order("started_at", { ascending: false })
    .limit(8);

  // Resolve phase numbers (for history) and session numbers (for sessions).
  const historyPhaseIds = [...new Set((history ?? []).map((h) => h.phase_id))];
  const phaseNumById = new Map<string, number>();
  if (historyPhaseIds.length > 0) {
    const { data } = await supabase
      .schema("curriculum_content")
      .from("phases")
      .select("id, phase_number")
      .in("id", historyPhaseIds);
    for (const p of data ?? []) phaseNumById.set(p.id, p.phase_number);
  }
  const sessionIds = [...new Set((sessions ?? []).map((s) => s.session_id))];
  const sessionMeta = new Map<string, { phase_number: number; session_number: number }>();
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .schema("curriculum_content")
      .from("sessions")
      .select("id, phase_number, session_number")
      .in("id", sessionIds);
    for (const s of data ?? [])
      sessionMeta.set(s.id, { phase_number: s.phase_number, session_number: s.session_number });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/dashboard">← All children</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{child.name}</h1>
          {currentPhase ? (
            <Badge variant="secondary">Phase {currentPhase.phase_number}</Badge>
          ) : (
            <Badge variant="outline">Not started</Badge>
          )}
        </div>
        {child.dob ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Age: {formatAge(child.dob)} · Born {formatDate(child.dob)}
          </p>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current focus</CardTitle>
          {currentPhase ? (
            <CardDescription>
              Phase {currentPhase.phase_number} — {currentPhase.name}
            </CardDescription>
          ) : (
            <CardDescription>This child hasn&apos;t started a phase yet.</CardDescription>
          )}
        </CardHeader>
        {currentPhase?.clinical_goal ? (
          <CardContent className="text-sm text-muted-foreground">{currentPhase.clinical_goal}</CardContent>
        ) : null}
        <CardContent className="flex flex-wrap gap-2">
          {currentPhase ? (
            <Button asChild size="sm">
              <Link href={`/children/${id}/practice`}>Practice</Link>
            </Button>
          ) : null}
          <Button asChild variant={hasCompass ? "outline" : "default"} size="sm">
            <Link href={`/children/${id}/compass`}>
              {hasCompass ? "View Compass results" : "Start the Communication Compass"}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent sessions</CardTitle>
          <CardDescription>The last few practice sessions and how they went.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions && sessions.length > 0 ? (
            <ul className="divide-y">
              {sessions.map((s) => {
                const meta = sessionMeta.get(s.session_id);
                const o = outcomeLabel(s.outcome);
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="text-sm">
                      <span className="font-medium">
                        {meta ? `Phase ${meta.phase_number}, Session ${meta.session_number}` : "Session"}
                      </span>
                      <span className="block text-muted-foreground">
                        {formatDate(s.completed_at ?? s.started_at)}
                        {s.score_percent !== null ? ` · ${s.score_percent}%` : ""}
                      </span>
                    </div>
                    <Badge variant={o.variant}>{o.text}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No sessions yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progress history</CardTitle>
          <CardDescription>Every change to this child&apos;s phase, and why.</CardDescription>
        </CardHeader>
        <CardContent>
          {history && history.length > 0 ? (
            <ul className="divide-y">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="text-sm">
                    <span className="font-medium">Phase {phaseNumById.get(h.phase_id) ?? "—"}</span>
                    <span className="block text-muted-foreground">{formatDate(h.entered_at)}</span>
                  </div>
                  <Badge variant="outline">{triggerReasonLabel(h.trigger_reason)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No phase changes recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
