import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAge, formatDate, outcomeLabel, triggerReasonLabel } from "@/lib/format";
import { domainLabel } from "@/lib/compass/ui-copy";
import { SCORED_DOMAINS, type DomainScores } from "@/lib/compass/types";
import { phaseName } from "@/lib/compass/contract";
import { VocalPlayback } from "@/components/slp/vocal-playback";
import { NoteComposer } from "@/components/slp/note-composer";

/**
 * SLP clinical view — read-only, RLS-scoped (every query returns rows only
 * while the caregiver's link stands). Tabs are plain links (?tab=) so the
 * whole page stays a server component.
 */

const TABS = ["compass", "progression", "vocalizations", "notes"] as const;
type Tab = (typeof TABS)[number];

const prettyCode = (code: string) => code.replaceAll("_", " ");

export default async function SlpChildPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const tabParam = (await searchParams).tab;
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "compass";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: slp } = await supabase.from("slps").select("id").eq("id", user.id).maybeSingle();
  if (!slp) redirect("/dashboard");

  // RLS: returns the child only while linked.
  const { data: child } = await supabase
    .from("children")
    .select("id, name, dob, age_bracket, current_phase_id")
    .eq("id", id)
    .maybeSingle();
  if (!child) notFound();

  const { data: currentPhase } = child.current_phase_id
    ? await supabase
        .schema("curriculum_content")
        .from("phases")
        .select("phase_number, name")
        .eq("id", child.current_phase_id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/slp">← Caseload</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{child.name}</h1>
          {currentPhase ? (
            <Badge variant="secondary">
              Phase {currentPhase.phase_number} — {currentPhase.name}
            </Badge>
          ) : (
            <Badge variant="outline">Not placed yet</Badge>
          )}
        </div>
        {child.dob ? <p className="mt-1 text-sm text-muted-foreground">{formatAge(child.dob)}</p> : null}
      </div>

      <nav aria-label="Sections" className="flex gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/slp/children/${id}?tab=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className={
              "-mb-px border-b-2 px-3 py-2 text-sm capitalize transition-colors " +
              (tab === t
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {t}
          </Link>
        ))}
      </nav>

      {tab === "compass" ? <CompassTab childId={id} /> : null}
      {tab === "progression" ? <ProgressionTab childId={id} /> : null}
      {tab === "vocalizations" ? <VocalizationsTab childId={id} /> : null}
      {tab === "notes" ? <NotesTab childId={id} childName={child.name} slpId={user.id} /> : null}

      <p className="text-xs text-muted-foreground">
        The Communication Compass and session scores are screening and placement signals, not validated clinical
        measures.
      </p>
    </div>
  );
}

// ── Compass ──────────────────────────────────────────────────────────────────

async function CompassTab({ childId }: { childId: string }) {
  const supabase = await createClient();
  const { data: a } = await supabase
    .from("assessments")
    .select(
      "id, completed_at, age_months_at_assessment, age_bracket, compass_overall_score, confidence, compass_domain_scores, recommended_phase, starting_phase, placement_source, placement_mode, start_in_simplified, two_adult_advisory, second_adult_available, red_flags, referral_recommended, concern_text, suggested_reassessment_interval, schema_version, curriculum_version",
    )
    .eq("child_id", childId)
    .eq("status", "scored")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!a) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          No completed Communication Compass assessment yet.
        </CardContent>
      </Card>
    );
  }

  const { data: readiness } = await supabase
    .from("readiness_check_results")
    .select("passed, yes_count, hard_item_flagged, flag_phrase, phase_number, created_at")
    .eq("assessment_id", a.id)
    .maybeSingle();

  const domains = (a.compass_domain_scores ?? {}) as Partial<DomainScores>;
  const redFlags = (a.red_flags ?? { hard: [], soft: [] }) as { hard: string[]; soft: string[] };
  const ageY = Math.floor((a.age_months_at_assessment ?? 0) / 12);
  const ageM = (a.age_months_at_assessment ?? 0) % 12;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Placement</CardTitle>
          <CardDescription>
            Assessed {formatDate(a.completed_at)} at age {ageY};{ageM} · schema {a.schema_version} · curriculum{" "}
            {a.curriculum_version}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">Engine recommendation:</span>{" "}
            <span className="font-medium">
              Phase {a.recommended_phase} — {phaseName(a.recommended_phase)}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Starting phase:</span>{" "}
            <span className="font-medium">
              Phase {a.starting_phase} — {phaseName(a.starting_phase)}
            </span>{" "}
            {a.placement_source === "caregiver_override" ? (
              <Badge variant="outline">caregiver override</Badge>
            ) : (
              <Badge variant="secondary">engine</Badge>
            )}
          </p>
          <p className="text-muted-foreground">
            Overall {a.compass_overall_score}/100 · confidence {a.confidence} · {a.placement_mode} ·{" "}
            {a.start_in_simplified ? "simplified entry" : "standard entry"} · second adult:{" "}
            {a.second_adult_available ?? "—"}
            {a.two_adult_advisory ? " (two-adult advisory shown)" : ""}
          </p>
          {readiness ? (
            <p className="text-muted-foreground">
              Readiness check (Phase {readiness.phase_number}, {formatDate(readiness.created_at)}):{" "}
              {readiness.yes_count}/5 — {readiness.passed ? "passed" : "did not pass (Simplified entry)"}
              {readiness.hard_item_flagged ? ` · flag: keep an eye on ${readiness.flag_phrase}` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Domain scores (age-adjusted)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {SCORED_DOMAINS.map((d) => {
            const v = Number(domains[d] ?? 0);
            return (
              <div key={d} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm">{domainLabel(d)}</span>
                <div className="bg-primary/15 h-2 flex-1 overflow-hidden rounded-full">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, v)}%` }} />
                </div>
                <span className="w-8 text-right text-sm tabular-nums">{v}</span>
              </div>
            );
          })}
          <p className="mt-1 text-xs text-muted-foreground">
            Domain keys: {SCORED_DOMAINS.map((d) => `${domainLabel(d)} = ${d}`).join(" · ")}
          </p>
        </CardContent>
      </Card>

      {redFlags.hard.length > 0 || redFlags.soft.length > 0 || a.concern_text ? (
        <Card className="border-amber-300/70">
          <CardHeader>
            <CardTitle className="text-base">Flags & caregiver concern</CardTitle>
            {a.referral_recommended ? <CardDescription>Referral recommended to the family.</CardDescription> : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {redFlags.hard.length > 0 ? (
              <p>
                <span className="text-muted-foreground">Hard:</span> {redFlags.hard.map(prettyCode).join(", ")}
              </p>
            ) : null}
            {redFlags.soft.length > 0 ? (
              <p>
                <span className="text-muted-foreground">Soft:</span> {redFlags.soft.map(prettyCode).join(", ")}
              </p>
            ) : null}
            {a.concern_text ? (
              <blockquote className="border-l-2 pl-3 text-foreground/90 italic">“{a.concern_text}”</blockquote>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// ── Progression ──────────────────────────────────────────────────────────────

async function ProgressionTab({ childId }: { childId: string }) {
  const supabase = await createClient();
  const [{ data: history }, { data: instances }] = await Promise.all([
    supabase
      .from("phase_history")
      .select("id, phase_id, trigger_reason, entered_at, age_bracket")
      .eq("child_id", childId)
      .order("entered_at", { ascending: false }),
    supabase
      .from("session_instances")
      .select("id, session_id, score_percent, outcome, ran_simplified, completed_at, downward_advisory")
      .eq("child_id", childId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(30),
  ]);

  const phaseIds = [...new Set((history ?? []).map((h) => h.phase_id))];
  const phaseNumById = new Map<string, number>();
  if (phaseIds.length > 0) {
    const { data } = await supabase
      .schema("curriculum_content")
      .from("phases")
      .select("id, phase_number")
      .in("id", phaseIds);
    for (const p of data ?? []) phaseNumById.set(p.id, p.phase_number);
  }
  const sessionIds = [...new Set((instances ?? []).map((s) => s.session_id))];
  const sessionMeta = new Map<string, { phase_number: number; session_number: number }>();
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .schema("curriculum_content")
      .from("sessions")
      .select("id, phase_number, session_number")
      .in("id", sessionIds);
    for (const s of data ?? []) sessionMeta.set(s.id, s);
  }

  const advisories = (instances ?? []).filter(
    (i) => (i.downward_advisory as { advise?: boolean } | null)?.advise === true,
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessions (latest 30)</CardTitle>
        </CardHeader>
        <CardContent>
          {(instances ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Variant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(instances ?? []).map((s) => {
                  const meta = sessionMeta.get(s.session_id);
                  const adv = (s.downward_advisory as { advise?: boolean } | null)?.advise === true;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(s.completed_at)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {meta ? `P${meta.phase_number} · S${meta.session_number}` : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {s.score_percent !== null ? `${s.score_percent}%` : "—"}
                        {adv ? <span title="Downward advisory fired"> ⚑</span> : null}
                      </TableCell>
                      <TableCell>{outcomeLabel(s.outcome).text}</TableCell>
                      <TableCell>{s.ran_simplified ? "Simplified" : "Standard"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {advisories.length > 0 ? (
        <Card className="border-amber-300/70">
          <CardHeader>
            <CardTitle className="text-base">Downward advisories</CardTitle>
            <CardDescription>
              Advisory-only: a persistent activity-specific drop below the child&apos;s own baseline. Never changes the
              variant automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {advisories.map((s) => {
              const d = s.downward_advisory as { baseline?: number; recent?: number[] };
              const meta = sessionMeta.get(s.session_id);
              return (
                <p key={s.id} className="text-muted-foreground">
                  {formatDate(s.completed_at)} — {meta ? `P${meta.phase_number} S${meta.session_number}` : "activity"}:
                  baseline {d.baseline}, recent [{(d.recent ?? []).join(", ")}]
                </p>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phase history (single audit trail)</CardTitle>
        </CardHeader>
        <CardContent>
          {(history ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No phase transitions recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(history ?? []).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    Phase {phaseNumById.get(h.phase_id) ?? "—"}
                    {h.age_bracket ? ` · bracket ${h.age_bracket}` : ""}
                    <span className="block text-xs text-muted-foreground">{formatDate(h.entered_at)}</span>
                  </span>
                  <Badge variant="outline">{triggerReasonLabel(h.trigger_reason)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Vocalizations ────────────────────────────────────────────────────────────

async function VocalizationsTab({ childId }: { childId: string }) {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("vocalization_logs")
    .select("id, sound_produced, spontaneity, target_sound, context_tag, storage_path, recorded_at")
    .eq("child_id", childId)
    .order("recorded_at", { ascending: false })
    .limit(50);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vocalization log</CardTitle>
        <CardDescription>
          Captured by the caregiver mid-session. Audio is optional and served via short-lived signed URLs only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(logs ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No vocalizations recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Heard</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Audio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(l.recorded_at)}</TableCell>
                  <TableCell>
                    <span className="font-medium">{l.sound_produced ?? "—"}</span>
                    {l.target_sound ? <span className="text-muted-foreground"> (target: {l.target_sound})</span> : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {l.spontaneity ?? l.context_tag ?? "—"}
                  </TableCell>
                  <TableCell>{l.storage_path ? <VocalPlayback logId={l.id} /> : <span className="text-xs text-muted-foreground">none</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Notes ────────────────────────────────────────────────────────────────────

async function NotesTab({ childId, childName, slpId }: { childId: string; childName: string; slpId: string }) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: notes }, { data: recentSessions }, { data: assessment }] = await Promise.all([
    supabase
      .from("slp_notes")
      .select("id, slp_id, body, session_instance_id, assessment_id, created_at")
      .eq("child_id", childId)
      .order("created_at", { ascending: false }),
    supabase
      .from("session_instances")
      .select("id, session_id, completed_at, score_percent")
      .eq("child_id", childId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(5),
    supabase
      .from("assessments")
      .select("id, completed_at")
      .eq("child_id", childId)
      .eq("status", "scored")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Author names (self-read RLS on slps → admin lookup for display only).
  const authorIds = [...new Set((notes ?? []).map((n) => n.slp_id))];
  const authorName = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: authors } = await admin.from("slps").select("id, full_name").in("id", authorIds);
    for (const a of authors ?? []) authorName.set(a.id, a.full_name ?? "SLP");
  }

  const sessionIds = [...new Set((recentSessions ?? []).map((s) => s.session_id))];
  const sessionMeta = new Map<string, { phase_number: number; session_number: number }>();
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .schema("curriculum_content")
      .from("sessions")
      .select("id, phase_number, session_number")
      .in("id", sessionIds);
    for (const s of data ?? []) sessionMeta.set(s.id, s);
  }

  const anchors = [
    ...(recentSessions ?? []).map((s) => {
      const meta = sessionMeta.get(s.session_id);
      return {
        value: `session:${s.id}`,
        label: `Session ${meta ? `P${meta.phase_number}·S${meta.session_number}` : ""} — ${formatDate(s.completed_at)}${s.score_percent !== null ? ` (${s.score_percent}%)` : ""}`,
      };
    }),
    ...(assessment ? [{ value: `assessment:${assessment.id}`, label: `Compass assessment — ${formatDate(assessment.completed_at)}` }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <NoteComposer childId={childId} childName={childName} anchors={anchors} />

      {(notes ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet — yours will appear here and on the family&apos;s page.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(notes ?? []).map((n) => (
            <li key={n.id} className="rounded-lg border px-3 py-2">
              <p className="text-sm whitespace-pre-line">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {n.slp_id === slpId ? "You" : (authorName.get(n.slp_id) ?? "SLP")} · {formatDate(n.created_at)}
                {n.session_instance_id ? " · attached to a session" : n.assessment_id ? " · attached to the assessment" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
