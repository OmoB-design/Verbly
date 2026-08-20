import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { PASS_MARK, REQUIRED_CONSECUTIVE_PASSES, nextRetakeSessionId } from "@/lib/engine/advancement";
import { calculateProgressionState } from "@/lib/engine/progression";
import { ReadinessCheck } from "@/components/readiness/readiness-check";
import { PhaseIconBubble, PhaseSticker, phaseIdentity } from "@/components/phase-identity";
import { GrowthMeter } from "@/components/growth-meter";
import { twoAdultCopy } from "@/lib/compass/ui-copy";
import type { ReadinessContent } from "@/content/readiness/readiness-checks";

/**
 * Practice picker: the current phase's sessions, each with its best attempt so
 * far, plus a "start here" recommendation — retake the lowest-scoring failed
 * session first (locked rule), otherwise the next session without a pass.
 * Read-only assembly; all decisions happen server-side at start/complete.
 */
export default async function PracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: child } = await supabase
    .from("children")
    .select("id, name, current_phase_id, age_bracket, second_adult_available, programme_completed_at")
    .eq("id", id)
    .maybeSingle();
  if (!child) notFound();

  const backLink = (
    <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
      <Link href={`/children/${id}`}>← Back to {child.name}</Link>
    </Button>
  );

  if (!child.current_phase_id) {
    return (
      <div className="flex flex-col gap-2">
        {backLink}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">No starting point yet</CardTitle>
            <CardDescription>
              Complete the Communication Compass first — it picks where {child.name}&apos;s activities begin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href={`/children/${id}/compass`}>Start the Communication Compass</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: phase } = await supabase
    .schema("curriculum_content")
    .from("phases")
    .select("id, phase_number, name, phase_guidance")
    .eq("id", child.current_phase_id)
    .maybeSingle();

  const { data: allSessions } = await supabase
    .schema("curriculum_content")
    .from("sessions")
    .select("id, session_number, age_bracket, content_json")
    .eq("phase_id", child.current_phase_id)
    .order("session_number", { ascending: true });

  // §13.3: show only the variants for this child's bracket (bracket-specific
  // rows) plus the not-age-variant rows (null). A child with no bracket yet
  // sees everything — better than hiding content.
  const sessions = (allSessions ?? []).filter(
    (s) => s.age_bracket === null || !child.age_bracket || s.age_bracket === child.age_bracket,
  );

  const { data: attempts } = await supabase
    .from("session_instances")
    .select("session_id, score_percent, outcome, completed_at, ran_simplified")
    .eq("child_id", id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: true });

  // ── Phase goal + progress (owner feedback: the caregiver must always know
  // the target and what happens next).
  //
  // This does NOT recompute the rule — it calls the same authoritative function
  // /api/sessions/complete uses (lib/engine/progression.ts), so the screen and
  // the server cannot report different runs.
  //
  // Phase membership is resolved by phase_number rather than by the card list's
  // phase_id: `curriculum_content.phases` is versioned, so attempts recorded
  // under an earlier content version of this phase must still count. This is
  // also how /api/sessions/start scopes the phase.
  const { data: phaseNumberSessions } = phase
    ? await supabase
        .schema("curriculum_content")
        .from("sessions")
        .select("id")
        .eq("phase_number", phase.phase_number)
    : { data: null };

  const progression = calculateProgressionState({
    attempts: attempts ?? [],
    phaseSessionIds: (phaseNumberSessions ?? []).map((s) => s.id as string),
  });
  const { consecutivePasses, graduationAwaitingStandardPass } = progression;
  const phaseAttempts = progression.inPhaseAttempts;
  const { data: nextPhase } = phase
    ? await supabase
        .schema("curriculum_content")
        .from("phases")
        .select("phase_number, name")
        .eq("phase_number", phase.phase_number + 1)
        .maybeSingle()
    : { data: null };

  // ── Readiness check gate (§6.3, owner-approved v1.0.0) ─────────────────────
  // Before the FIRST session of the Compass-placed phase, a readiness-routed
  // child gets the one-shot 5-question check. /sessions/start enforces this
  // server-side too (409); here we put the check itself in the caregiver's
  // path. After it's done: a hard-item flag shows as a keep-an-eye note for
  // the first few sessions; a fail silently serves Simplified at start.
  let readinessKeepAnEye: string | null = null;
  if (phase && phaseAttempts.length === 0) {
    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, starting_phase, placement_mode")
      .eq("child_id", id)
      .eq("status", "scored")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assessment?.placement_mode === "readiness_module_first" && assessment.starting_phase === phase.phase_number) {
      const { data: readinessResult } = await supabase
        .from("readiness_check_results")
        .select("passed, hard_item_flagged, flag_phrase")
        .eq("assessment_id", assessment.id)
        .maybeSingle();
      if (!readinessResult) {
        const { data: contentRow } = await supabase
          .from("readiness_content")
          .select("content_json")
          .order("schema_version", { ascending: false })
          .limit(1)
          .maybeSingle();
        const check = (contentRow?.content_json as ReadinessContent | undefined)?.phases.find(
          (p) => p.phase_number === phase.phase_number,
        );
        if (check) {
          return (
            <div className="flex flex-col gap-4">
              <div>
                {backLink}
                <h1 className="text-2xl font-semibold tracking-tight">Practice with {child.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Phase {phase.phase_number} — {phase.name}
                </p>
              </div>
              <ReadinessCheck
                assessmentId={assessment.id}
                childName={child.name}
                items={check.items.map((i) => ({ id: i.id, prompt: i.prompt }))}
              />
            </div>
          );
        }
      } else if (readinessResult.hard_item_flagged && readinessResult.flag_phrase) {
        readinessKeepAnEye = readinessResult.flag_phrase;
      }
    }
  }

  // ── Variant resolution: ONE card per session_number ────────────────────────
  // A bracket-specific variant and an "all ages" variant of the same
  // session_number are the SAME session, not two sessions. The bracket match
  // wins as the card's primary activity; the all-ages variant is a fallback
  // surfaced inside the same card, never as its own row. Applies uniformly to
  // every phase. Purely resolver/UI logic — no numbering, schema, seed, or
  // scoring change.
  interface VariantRow {
    id: string;
    session_number: number;
    age_bracket: string | null;
    content_json: unknown;
  }
  const groups = new Map<number, VariantRow[]>();
  for (const s of sessions as VariantRow[]) {
    const g = groups.get(s.session_number) ?? [];
    g.push(s);
    groups.set(s.session_number, g);
  }
  const groupNumbers = [...groups.keys()].sort((a, b) => a - b);
  const groupOf = new Map<string, number>();
  for (const s of sessions as VariantRow[]) groupOf.set(s.id, s.session_number);

  // Per-VARIANT stats. These stay variant-keyed because the retake→simplify
  // chain is per variant (priorFailedAttemptsThisSession counts attempts at
  // one session_id) — a retake must return to the variant that failed, or the
  // Simplified Session would never trigger. Cards aggregate across variants.
  const byVariant = new Map<string, { best: number | null; attempts: number }>();
  const lastOutcomeByGroup = new Map<number, string>();
  const failedForRetake: { session_id: string; score: number; attempted_at: string }[] = [];
  for (const a of attempts ?? []) {
    const groupNumber = groupOf.get(a.session_id);
    if (groupNumber === undefined) continue; // other phases / hidden variants
    const cur = byVariant.get(a.session_id) ?? { best: null, attempts: 0 };
    cur.attempts += 1;
    const score = a.score_percent === null ? null : Number(a.score_percent);
    if (score !== null && (cur.best === null || score > cur.best)) cur.best = score;
    byVariant.set(a.session_id, cur);
    lastOutcomeByGroup.set(groupNumber, a.outcome as string); // chronological → last wins
    if (score !== null && score < PASS_MARK) {
      failedForRetake.push({ session_id: a.session_id, score, attempted_at: a.completed_at as string });
    }
  }

  const groupStats = (n: number) => {
    const rows = groups.get(n) ?? [];
    let attemptsTotal = 0;
    let best: number | null = null;
    for (const r of rows) {
      const st = byVariant.get(r.id);
      if (!st) continue;
      attemptsTotal += st.attempts;
      if (st.best !== null && (best === null || st.best > best)) best = st.best;
    }
    return { attemptsTotal, best, lastOutcome: lastOutcomeByGroup.get(n) ?? null };
  };

  // Recommendation: lowest-scoring failed VARIANT first (locked rule, keyed to
  // the exact variant so its retake chain continues); otherwise the first
  // session (group) without a passing attempt on any variant.
  const stillFailing = failedForRetake.filter((f) => {
    const best = byVariant.get(f.session_id)?.best;
    return best === null || best === undefined || best < PASS_MARK;
  });
  const retakeId = nextRetakeSessionId(stillFailing);
  const recommendedGroup =
    retakeId !== null
      ? (groupOf.get(retakeId) ?? null)
      : (groupNumbers.find((n) => {
          const { best } = groupStats(n);
          return best === null || best < PASS_MARK;
        }) ?? null);

  const titleOf = (contentJson: unknown): string | null => {
    if (typeof contentJson === "object" && contentJson !== null && typeof (contentJson as { title?: unknown }).title === "string") {
      return (contentJson as { title: string }).title;
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {backLink}
          <h1 className="text-2xl font-semibold tracking-tight">Practice with {child.name}</h1>
          {phase ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <PhaseIconBubble phase={phase.phase_number} />
              <span>
                Phase {phase.phase_number} — {phase.name}
              </span>
            </p>
          ) : null}
        </div>
        {phase ? (
          <PhaseSticker phase={phase.phase_number} className="hidden max-h-32 w-auto sm:block" />
        ) : null}
      </div>

      {child.programme_completed_at ? (
        <Card className="border-2 border-emerald-300/80 dark:border-emerald-700/60">
          <CardHeader>
            <CardTitle className="text-base">All twelve phases complete 🎉</CardTitle>
            <CardDescription>
              {child.name} finished the whole programme. Every activity below stays open for revisiting whenever
              practice feels good — and retaking the Communication Compass is a lovely way to see how far they&apos;ve
              come.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : phase ? (
        <Card className={cn("border-2", phaseIdentity(phase.phase_number).cardAccent)}>
          <CardHeader>
            <CardTitle className="text-base">The goal for this phase</CardTitle>
            <CardDescription>
              {child.name} moves on when a session scores {PASS_MARK}% or higher, {REQUIRED_CONSECUTIVE_PASSES} sessions
              in a row.
              {nextPhase ? ` Next up: Phase ${nextPhase.phase_number} — ${nextPhase.name}.` : " This is the final phase of the programme."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <GrowthMeter value={Math.min(consecutivePasses, REQUIRED_CONSECUTIVE_PASSES)} phase={phase.phase_number} />
            <p className="text-xs text-muted-foreground">
              {consecutivePasses === 0
                ? `No passing sessions in a row yet — the "Start here" activity below is the place to begin.`
                : `${Math.min(consecutivePasses, REQUIRED_CONSECUTIVE_PASSES)} of ${REQUIRED_CONSECUTIVE_PASSES} passing sessions in a row — ${
                    // A run completed by a Simplified pass holds: the graduating
                    // pass must be a standard session, so say which one counts
                    // rather than promising a move that will not happen.
                    graduationAwaitingStandardPass
                      ? nextPhase
                        ? `one more full session (not a Simplified one) and ${child.name} moves to Phase ${nextPhase.phase_number}!`
                        : "one more full session (not a Simplified one) to finish the programme!"
                      : consecutivePasses >= REQUIRED_CONSECUTIVE_PASSES - 1 && nextPhase
                        ? `one more and ${child.name} moves to Phase ${nextPhase.phase_number}!`
                        : "keep going!"
                  }`}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* §6.7 two-adult advisory, re-evaluated LIVE from the child's current
          second-adult setting (updatable in settings) — not the frozen
          assessment value. Phases 4–5 only. */}
      {phase && (phase.phase_number === 4 || phase.phase_number === 5) && child.second_adult_available === "no" ? (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground/80">{twoAdultCopy()}</p>
      ) : null}

      {readinessKeepAnEye ? (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground/80">
          From the readiness check: keep an eye on {readinessKeepAnEye} during the first few sessions.
        </p>
      ) : null}

      {phase?.phase_guidance ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About this phase</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Display-only phase guidance (F6): simple markdown-ish rendering —
                bold section headers + bullet lines. Never consumed by the RL. */}
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              {(phase.phase_guidance as string).split("\n").map((line: string, i: number) => {
                if (line.startsWith("**") && line.endsWith("**")) {
                  return (
                    <p key={i} className="mt-2 font-medium text-foreground first:mt-0">
                      {line.slice(2, -2)}
                    </p>
                  );
                }
                if (line.startsWith("- ")) {
                  return (
                    <p key={i} className="pl-4">
                      • {line.slice(2)}
                    </p>
                  );
                }
                return line.trim() === "" ? null : <p key={i}>{line}</p>;
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {groupNumbers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            This phase&apos;s activities aren&apos;t available yet. Check back soon.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {groupNumbers.map((n) => {
            const rows = groups.get(n)!;
            // Bracket match wins as primary; the all-ages row is the fallback.
            // (Visible rows only ever contain the child's own bracket or null.)
            const bracketPrimary =
              (child.age_bracket ? rows.find((r) => r.age_bracket === child.age_bracket) : undefined) ??
              rows.find((r) => r.age_bracket === null) ??
              rows[0];
            // If this card holds the retake target, THAT variant is what the
            // caregiver should run (its failure chain must continue).
            const display =
              retakeId !== null && groupOf.get(retakeId) === n
                ? (rows.find((r) => r.id === retakeId) ?? bracketPrimary)
                : bracketPrimary;
            const alternates = rows.filter((r) => r.id !== display.id);
            const { attemptsTotal, best, lastOutcome } = groupStats(n);
            const passed = best !== null && best >= PASS_MARK;
            const recommended = n === recommendedGroup;
            return (
              <li key={n}>
                <Card
                  className={
                    recommended && phase ? cn("border-2", phaseIdentity(phase.phase_number).cardAccent) : undefined
                  }
                >
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          Session {n}
                          {titleOf(display.content_json) ? ` — ${titleOf(display.content_json)}` : ""}
                        </span>
                        {recommended ? <Badge>Start here</Badge> : null}
                        {passed ? <Badge variant="secondary">Passed</Badge> : null}
                        {!passed && lastOutcome === "retake" ? <Badge variant="outline">Retake</Badge> : null}
                        {!passed && lastOutcome === "simplify_triggered" ? (
                          <Badge variant="outline">Gentler version next</Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {attemptsTotal > 0 ? `${attemptsTotal} attempt${attemptsTotal === 1 ? "" : "s"}` : "Not tried yet"}
                        {best !== null ? ` · best ${best}%` : ""}
                      </p>
                    </div>
                    <Button asChild size="sm" variant={recommended ? "default" : "outline"}>
                      <Link href={`/children/${id}/practice/${display.id}`}>
                        {attemptsTotal > 0 ? "Practice again" : "Start"}
                      </Link>
                    </Button>
                    {alternates.length > 0 ? (
                      <div className="w-full border-t pt-2">
                        {alternates.map((a) => (
                          <Link
                            key={a.id}
                            href={`/children/${id}/practice/${a.id}`}
                            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                          >
                            Try a different version: {titleOf(a.content_json) ?? `Session ${n} alternative`}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
