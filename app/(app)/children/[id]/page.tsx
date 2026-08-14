import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAge, formatDate, outcomeLabel, triggerReasonLabel } from "@/lib/format";
import { SlpShareCard } from "@/components/slp/share-card";
import { RegressControl } from "@/components/children/regress-control";
import { VocalPlayback } from "@/components/slp/vocal-playback";

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

  // SLP sharing state: linked SLPs (RLS lets the caregiver see the links; the
  // SLP names come via the admin client — slps rows are self-read-only),
  // pending invites, and caregiver-visible SLP notes.
  const { data: links } = await supabase.from("slp_child_links").select("slp_id").eq("child_id", id);
  const admin = createAdminClient();
  const linkedSlps: { id: string; name: string }[] = [];
  if ((links ?? []).length > 0) {
    const { data: slpRows } = await admin
      .from("slps")
      .select("id, full_name")
      .in("id", (links ?? []).map((l) => l.slp_id));
    for (const s of slpRows ?? []) linkedSlps.push({ id: s.id, name: s.full_name ?? "Your SLP" });
  }
  const { data: invites } = await supabase
    .from("slp_invites")
    .select("id, token, expires_at, redeemed_at, revoked_at")
    .eq("child_id", id)
    .order("created_at", { ascending: false });
  const pendingInvites = (invites ?? []).filter(
    (i) => !i.redeemed_at && !i.revoked_at && new Date(i.expires_at).getTime() > Date.now(),
  );
  const { data: slpNotes } = await supabase
    .from("slp_notes")
    .select("id, slp_id, body, created_at")
    .eq("child_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Sounds captured in sessions — the caregiver's own record (playback via
  // the same signed-URL route the SLP view uses).
  const { data: vocalLogs } = await supabase
    .from("vocalization_logs")
    .select("id, sound_produced, spontaneity, storage_path, recorded_at")
    .eq("child_id", id)
    .order("recorded_at", { ascending: false })
    .limit(8);
  const noteAuthor = new Map(linkedSlps.map((s) => [s.id, s.name]));

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
  const phaseNameById = new Map<string, string>();
  if (historyPhaseIds.length > 0) {
    const { data } = await supabase
      .schema("curriculum_content")
      .from("phases")
      .select("id, phase_number, name")
      .in("id", historyPhaseIds);
    for (const p of data ?? []) {
      phaseNumById.set(p.id, p.phase_number);
      phaseNameById.set(p.id, p.name);
    }
  }

  // Earlier phases this child has actually REACHED (the regress endpoint
  // enforces the same rule server-side) — offered as move-back targets.
  const currentPhaseNumber = currentPhase?.phase_number ?? null;
  const regressOptions =
    currentPhaseNumber !== null
      ? [
          ...new Map(
            (history ?? [])
              .filter((h) => {
                const n = phaseNumById.get(h.phase_id);
                return n !== undefined && n < currentPhaseNumber;
              })
              .map((h) => [
                phaseNumById.get(h.phase_id)!,
                {
                  phaseId: h.phase_id,
                  phaseNumber: phaseNumById.get(h.phase_id)!,
                  name: phaseNameById.get(h.phase_id) ?? `Phase ${phaseNumById.get(h.phase_id)}`,
                },
              ]),
          ).values(),
        ].sort((a, b) => b.phaseNumber - a.phaseNumber)
      : [];
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{child.name}</h1>
            {currentPhase ? (
              <Badge variant="secondary">Phase {currentPhase.phase_number}</Badge>
            ) : (
              <Badge variant="outline">Not started</Badge>
            )}
          </div>
          <Button asChild>
            <Link href={`/children/${id}/edit`}>Edit profile</Link>
          </Button>
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
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
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
          </div>
          <RegressControl childId={id} childName={child.name} options={regressOptions} />
        </CardContent>
      </Card>

      {(slpNotes ?? []).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes from your SLP</CardTitle>
            <CardDescription>Professional observations shared with you — always visible, never hidden.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {(slpNotes ?? []).map((n) => (
                <li key={n.id} className="rounded-lg border px-3 py-2">
                  <p className="text-sm whitespace-pre-line">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {noteAuthor.get(n.slp_id) ?? "Your SLP"} · {formatDate(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

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

      {(vocalLogs ?? []).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sounds you&apos;ve captured</CardTitle>
            <CardDescription>Vocalizations noted during sessions — with recordings where you made one.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {(vocalLogs ?? []).map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="text-sm">
                    <span className="font-medium">&ldquo;{v.sound_produced ?? "—"}&rdquo;</span>
                    <span className="block text-xs text-muted-foreground">
                      {v.spontaneity === "imitated" ? "copying you" : "on their own"} · {formatDate(v.recorded_at)}
                    </span>
                  </div>
                  {v.storage_path ? <VocalPlayback logId={v.id} /> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

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

      <SlpShareCard
        childId={id}
        childName={child.name}
        linkedSlps={linkedSlps}
        pendingInvites={pendingInvites.map((i) => ({ id: i.id, token: i.token, expires_at: i.expires_at }))}
      />
    </div>
  );
}
