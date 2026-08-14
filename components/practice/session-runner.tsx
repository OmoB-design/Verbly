"use client";

import * as React from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import type { ScriptVariant } from "@/lib/engine/session-script";
import { SoundCapture } from "@/components/practice/sound-capture";
import { Celebration } from "@/components/practice/celebration";
import { GrowthMeter } from "@/components/growth-meter";
import { PhaseIllustration, phaseIdentity } from "@/components/phase-identity";

/**
 * Session runtime. Executes the version-pinned RL behavior script locally:
 * timed check-ins at the script's trigger interval, options/credit values from
 * the script (never invented here), each answer recorded immediately as a
 * session_checkins row (a direct, RLS-scoped insert — recording a fact, per
 * API.md). Scoring + outcome happen server-side at /sessions/complete.
 */

interface StartPayload {
  session_instance_id: string;
  content_version: number;
  phase_number: number;
  session_number: number;
  simplified: boolean;
  simplified_reason?: "retake_support" | "readiness_ease_in" | null;
  script: ScriptVariant;
}

interface CompletePayload {
  outcome: "advance" | "retake" | "simplify_triggered";
  score_percent: number;
  advancesPhase: boolean;
  advancedToPhaseNumber: number | null;
  consecutivePasses: number;
  reason: string;
  ageBracket: { transitioned?: boolean } | null;
  downwardAdvisory: { advise: boolean; reason: string } | null;
}

type Stage = "setup" | "starting" | "brief" | "running" | "completing" | "done" | "error";

interface PendingBonus {
  optionIndex: number;
}

export function SessionRunner({
  childId,
  childName,
  sessionId,
  caregiverName,
}: {
  childId: string;
  childName: string;
  sessionId: string;
  caregiverName?: string | null;
}) {
  const supabase = React.useMemo(() => createClient(), []);

  const [stage, setStage] = React.useState<Stage>("setup");
  const [error, setError] = React.useState<string | null>(null);
  const [start, setStart] = React.useState<StartPayload | null>(null);
  const [result, setResult] = React.useState<CompletePayload | null>(null);

  // Setup: who's in the room (single logged-in caregiver + optional helper).
  const [helperPresent, setHelperPresent] = React.useState<boolean | undefined>();
  const [helperRole, setHelperRole] = React.useState<"secondary" | "peer">("secondary");
  const [helperName, setHelperName] = React.useState("");

  // Check-in loop state.
  const [checkinIdx, setCheckinIdx] = React.useState(0); // completed check-ins
  const [secondsLeft, setSecondsLeft] = React.useState(0);
  const [due, setDue] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [pendingBonus, setPendingBonus] = React.useState<PendingBonus | null>(null);
  const [bonusTarget, setBonusTarget] = React.useState<string | null>(null);
  const [bonusStep, setBonusStep] = React.useState<number | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [recordError, setRecordError] = React.useState<string | null>(null);

  const script = start?.script ?? null;
  const totalCheckins = script?.checkin.count ?? 0;

  // Display-time personalization of the script's role names (owner feedback
  // 2026-08-09): "Caregiver A" → the account holder's name (from signup),
  // "Caregiver B" → the helper named in setup. Content itself is untouched;
  // when no name exists, the role names stay as written.
  const helperDisplayName = helperPresent && helperRole === "secondary" ? helperName.trim() : "";
  const personalize = (text: string): string => {
    let t = text;
    if (caregiverName) t = t.replaceAll("Caregiver A", caregiverName);
    if (helperDisplayName) t = t.replaceAll("Caregiver B", helperDisplayName);
    return t;
  };

  // Countdown timer: ticks only while running, not paused, and no check-in is
  // awaiting an answer.
  React.useEffect(() => {
    if (stage !== "running" || paused || due) return;
    if (secondsLeft <= 0) {
      setDue(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, paused, due, secondsLeft]);

  async function begin() {
    setStage("starting");
    setError(null);
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_id: childId, session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "We couldn't start this session.");
        setStage("error");
        return;
      }
      const payload = data as StartPayload;
      setStart(payload);

      // Log who's present (facts, not decisions → direct RLS-scoped inserts).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const rows: { session_instance_id: string; participant_role: string; caregiver_id?: string; display_name?: string }[] = [
        { session_instance_id: payload.session_instance_id, participant_role: "primary", caregiver_id: user?.id },
      ];
      if (helperPresent) {
        rows.push({
          session_instance_id: payload.session_instance_id,
          participant_role: helperRole,
          display_name: helperName.trim() || undefined,
        });
      }
      await supabase.from("session_participants").insert(rows);

      setStage("brief");
    } catch {
      setError("Something went wrong reaching the server. Please try again.");
      setStage("error");
    }
  }

  function startActivity() {
    if (!script) return;
    setCheckinIdx(0);
    setSecondsLeft(script.checkin.interval_seconds);
    setDue(false);
    setPaused(false);
    setStage("running");
  }

  /** Record one check-in row; bonus fields only when the script captured one. */
  async function recordCheckin(
    optionIndex: number,
    bonus?: { kind: string; observation: Record<string, unknown> },
  ) {
    if (!start || !script) return;
    const opt = script.checkin.options[optionIndex];
    setRecording(true);
    setRecordError(null);
    const { error: insErr } = await supabase.from("session_checkins").insert({
      session_instance_id: start.session_instance_id,
      interval_index: checkinIdx,
      response_category: opt.response_category,
      credit_value: opt.credit_value,
      ...(bonus ? { bonus_kind: bonus.kind, bonus_observation: bonus.observation } : {}),
    });
    setRecording(false);
    if (insErr) {
      setRecordError("That check-in didn't save — please tap it again.");
      return;
    }
    setPendingBonus(null);
    setBonusTarget(null);
    setBonusStep(null);
    const done = checkinIdx + 1;
    setCheckinIdx(done);
    if (done >= totalCheckins) {
      void complete();
    } else {
      setDue(false);
      setSecondsLeft(script.checkin.interval_seconds);
    }
  }

  function onOptionChosen(optionIndex: number) {
    if (!script) return;
    const opt = script.checkin.options[optionIndex];
    // Bonus capture only when the script defines one and the trial scored > 0
    // (bonuses never apply to 0-credit trials).
    if (script.bonus && opt.credit_value > 0) {
      setPendingBonus({ optionIndex });
      return;
    }
    void recordCheckin(optionIndex);
  }

  function answerYesNoBonus(yes: boolean) {
    if (!script?.bonus || pendingBonus === null) return;
    const kind = script.bonus.kind;
    const observation = kind === "attribute" ? { added: yes } : { correct: yes };
    void recordCheckin(pendingBonus.optionIndex, { kind, observation });
  }

  function answerApproximationBonus() {
    if (!script?.bonus || pendingBonus === null || bonusTarget === null || bonusStep === null) return;
    void recordCheckin(pendingBonus.optionIndex, {
      kind: "approximation",
      observation: { target: bonusTarget, step: bonusStep },
    });
  }

  async function complete() {
    if (!start) return;
    setStage("completing");
    setError(null);
    try {
      const res = await fetch("/api/sessions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_instance_id: start.session_instance_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "We couldn't finish the session.");
        setStage("error");
        return;
      }
      setResult(data as CompletePayload);
      setStage("done");
    } catch {
      setError("Something went wrong finishing the session. Please try again.");
      setStage("error");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (stage === "setup" || stage === "starting") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Before you start</CardTitle>
          <CardDescription>
            One quick question — is anyone helping you today? A family member or friend is perfect; they don&apos;t
            need an account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <ChoiceButton selected={helperPresent === true} onClick={() => setHelperPresent(true)}>
              Yes, someone&apos;s helping
            </ChoiceButton>
            <ChoiceButton selected={helperPresent === false} onClick={() => setHelperPresent(false)}>
              It&apos;s just us
            </ChoiceButton>
          </div>

          {helperPresent ? (
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-3">
                <ChoiceButton selected={helperRole === "secondary"} onClick={() => setHelperRole("secondary")}>
                  An adult helper
                </ChoiceButton>
                <ChoiceButton selected={helperRole === "peer"} onClick={() => setHelperRole("peer")}>
                  Another child / peer
                </ChoiceButton>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="helper-name" className="text-sm text-muted-foreground">
                  Their name (optional)
                </label>
                <Input
                  id="helper-name"
                  value={helperName}
                  onChange={(e) => setHelperName(e.target.value)}
                  placeholder="e.g. Grandma, Tunde"
                />
              </div>
            </div>
          ) : null}

          <div>
            <Button onClick={begin} disabled={helperPresent === undefined || stage === "starting"}>
              {stage === "starting" ? "Getting ready…" : "Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stage === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">We hit a snag</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex gap-2">
            {start ? (
              <Button variant="outline" onClick={complete}>
                Try finishing again
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setStage("setup")}>
                Back
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link href={`/children/${childId}/practice`}>All activities</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!script) return null;

  if (stage === "brief") {
    return (
      <div className="flex flex-col gap-4">
        <PhaseIllustration phase={start!.phase_number} priority className="max-h-44 w-full" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{script.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Phase {start!.phase_number}, Session {start!.session_number}
            {start!.simplified
              ? start!.simplified_reason === "readiness_ease_in"
                ? " · a gentle introductory version to settle in"
                : " · a gentler version this time"
              : ""}
          </p>
        </div>

        {script.overview ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">{personalize(script.overview)}</CardContent>
          </Card>
        ) : null}

        {script.materials && script.materials.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Have ready</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {script.materials.map((m, i) => (
                  <li key={i}>{personalize(m)}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How it goes</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {script.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>
                    <span className="font-medium">{s.title}</span>
                    <span className="block text-muted-foreground">{personalize(s.instruction)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          While you play, we&apos;ll check in every {script.checkin.interval_seconds} seconds —{" "}
          {script.checkin.count} quick taps in total. Keep your attention on {childName}; the screen can wait.
        </p>

        <div>
          <Button onClick={startActivity}>Start the activity</Button>
        </div>
      </div>
    );
  }

  if (stage === "running") {
    const pct = totalCheckins > 0 ? (checkinIdx / totalCheckins) * 100 : 0;
    const bonusOpen = pendingBonus !== null && script.bonus;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{script.title}</h1>
            <p className="text-xs text-muted-foreground">
              Check-in {Math.min(checkinIdx + 1, totalCheckins)} of {totalCheckins}
            </p>
          </div>
          <Badge variant={due ? "default" : "secondary"}>
            {due ? "Check in now" : paused ? "Paused" : `Next in ${secondsLeft}s`}
          </Badge>
        </div>
        <Progress value={pct} label="Session progress" indicatorClassName={phaseIdentity(start!.phase_number).bar} />

        {!due ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Keep playing with {childName} — we&apos;ll prompt you when it&apos;s time.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)}>
                  {paused ? "Resume" : "Pause"}
                </Button>
                {/* F3 ruling: a real check-in trigger ALONGSIDE the timer — rounds
                    finish in 20s or 90s; the timer alone would create phantom
                    misses / stale data. */}
                <Button variant="outline" size="sm" onClick={() => setDue(true)}>
                  Check in now
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : bonusOpen ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{script.bonus!.prompt}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {script.bonus!.kind === "approximation" ? (
                <>
                  {script.bonus!.targets && script.bonus!.targets.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground">Which sound?</p>
                      <div className="flex flex-wrap gap-2">
                        {script.bonus!.targets.map((t) => (
                          <ChoiceButton key={t} small selected={bonusTarget === t} onClick={() => setBonusTarget(t)}>
                            {t}
                          </ChoiceButton>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">How close was the attempt?</p>
                    <div className="flex flex-col gap-2">
                      {(script.bonus!.step_labels ?? []).map((label, i) => (
                        <ChoiceButton key={i} small selected={bonusStep === i + 1} onClick={() => setBonusStep(i + 1)}>
                          {i + 1}. {label}
                        </ChoiceButton>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={answerApproximationBonus}
                    disabled={recording || bonusTarget === null || bonusStep === null}
                  >
                    {recording ? "Saving…" : "Save"}
                  </Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <ChoiceButton selected={false} onClick={() => answerYesNoBonus(true)}>
                    Yes
                  </ChoiceButton>
                  <ChoiceButton selected={false} onClick={() => answerYesNoBonus(false)}>
                    No
                  </ChoiceButton>
                </div>
              )}
              {recordError ? <p className="text-sm text-destructive">{recordError}</p> : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{personalize(script.checkin.question)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {script.checkin.options.map((opt, i) => (
                <ChoiceButton key={i} selected={false} onClick={() => !recording && onOptionChosen(i)}>
                  {opt.label}
                </ChoiceButton>
              ))}
              {recordError ? <p className="text-sm text-destructive">{recordError}</p> : null}
            </CardContent>
          </Card>
        )}

        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">Activity steps</summary>
          <ol className="mt-2 flex flex-col gap-2 pl-5">
            {script.steps.map((s, i) => (
              <li key={i}>
                <span className="font-medium text-foreground/80">{s.title}:</span> {personalize(s.instruction)}
              </li>
            ))}
          </ol>
        </details>

        {/* Vocalization capture — always available; the curriculum asks for
            sounds to be documented as they happen (esp. Phases 9–12). */}
        <SoundCapture childId={childId} childName={childName} sessionInstanceId={start!.session_instance_id} />

        {checkinIdx > 0 ? (
          <button
            type="button"
            onClick={complete}
            className="self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            End the session here
          </button>
        ) : null}
      </div>
    );
  }

  if (stage === "completing") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Wrapping up {childName}&apos;s session…
        </CardContent>
      </Card>
    );
  }

  // done
  const r = result!;
  const graduated = r.outcome === "advance" && r.advancesPhase && r.advancedToPhaseNumber !== null;
  const outcomeCopy =
    r.outcome === "advance"
      ? graduated
        ? `A lovely session — and a milestone: ${childName} is moving on to Phase ${r.advancedToPhaseNumber}! 🎉`
        : `A lovely session. Keep this rhythm going — every session builds on the last.`
      : r.outcome === "retake"
        ? `Good practice today. This one's worth another go soon — repetition is exactly how these skills grow.`
        : `Good effort today. Next time we'll use a gentler version of this activity so ${childName} can build up to it.`;

  return (
    <div className="flex flex-col gap-4">
      {graduated ? <Celebration /> : null}
      {graduated ? (
        <PhaseIllustration phase={r.advancedToPhaseNumber!} priority className="max-h-48 w-full" />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{graduated ? "A new phase begins!" : "Session complete"}</CardTitle>
          <CardDescription>{outcomeCopy}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {r.outcome === "advance" && !graduated ? (
            <GrowthMeter value={Math.min(r.consecutivePasses ?? 0, 3)} phase={start?.phase_number ?? 0} />
          ) : null}
          <p className="text-sm text-muted-foreground">
            Today&apos;s score: <span className="font-medium text-foreground">{r.score_percent}%</span>
          </p>
          {r.ageBracket && "transitioned" in (r.ageBracket ?? {}) && r.ageBracket.transitioned ? (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground/80">
              {childName} has been doing so well that we&apos;ll present activities in an older style from now on.
            </p>
          ) : null}
          {r.outcome === "advance" && !r.advancesPhase && start?.simplified ? (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground/80">
              A pass on the gentler version keeps the streak going — passing a standard session is what moves{" "}
              {childName} to the next phase.
            </p>
          ) : null}
          {r.downwardAdvisory?.advise ? (
            <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
              We&apos;ve noticed this particular activity has been tougher than usual over the last several sessions.
              It might land better framed for a slightly younger age — just for this activity, and only if it feels
              right to you. Nothing changes automatically.
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/children/${childId}/practice`}>All activities</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/children/${childId}`}>{childName}&apos;s page</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  small,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={
        `rounded-lg border text-left text-sm transition-colors ${small ? "px-3 py-2" : "w-full px-4 py-3"} ` +
        (selected ? "border-primary bg-primary/5 ring-primary/30 ring-1" : "border-input hover:bg-muted/50")
      }
    >
      {children}
    </button>
  );
}
