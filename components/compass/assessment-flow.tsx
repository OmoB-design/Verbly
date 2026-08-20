"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { DOMAIN_UI, INTRO_COPY } from "@/lib/compass/ui-copy";
import { SCORED_DOMAINS, type CompassResult, type ScoredDomain, type SecondAdult } from "@/lib/compass/types";
import { CompassResults } from "@/components/compass/compass-results";

// Shapes returned by POST /api/compass/start (mirrors the server payload).
interface StartItem {
  id: string;
  domain: ScoredDomain | "oral_motor";
  brackets: string[];
  prompt: string;
  points: Record<string, number>;
}
interface StartBenchmark {
  id: string;
  brackets: string[];
  prompt: string;
  predictedDomain: ScoredDomain;
  threshold: number;
}
interface StartRedFlag {
  code: string;
  class: "age_invariant" | "developmental_history" | "older_child";
  brackets: string[];
  prompt: string;
}
interface DraftState {
  responses?: Record<string, string>;
  benchmarkAnswers?: Record<string, boolean>;
  redFlagAnswers?: Record<string, boolean>;
  secondAdult?: SecondAdult;
  concernYes?: boolean;
  concernText?: string;
  idx?: number;
}
interface StartResponse {
  assessment_id: string;
  age_bracket: string;
  age_months: number;
  resumed?: boolean;
  draft_state?: DraftState | null;
  items: StartItem[];
  benchmark_items: StartBenchmark[];
  red_flags: StartRedFlag[];
}

type Step =
  | { kind: "item"; section: string; item: StartItem }
  | { kind: "benchmark"; section: string; item: StartBenchmark }
  | { kind: "secondAdult"; section: string }
  | { kind: "redflag"; section: string; def: StartRedFlag }
  | { kind: "concern"; section: string };

const CHECKLIST_SECTION = "A quick checklist";
const SETUP_SECTION = "Getting set up";
const HEALTH_SECTION = "A few health & history questions";
const ORAL_SECTION = DOMAIN_UI.oral_motor.label;

/** Assemble the ordered step list from a /start payload. One question per step. */
function buildSteps(start: StartResponse): Step[] {
  const steps: Step[] = [];
  // Scored domains, in a fixed, gentle order (everyday observation first).
  for (const domain of SCORED_DOMAINS) {
    const label = DOMAIN_UI[domain].label;
    for (const item of start.items.filter((i) => i.domain === domain)) {
      steps.push({ kind: "item", section: label, item });
    }
  }
  // Oral-motor (its own small section).
  for (const item of start.items.filter((i) => i.domain === "oral_motor")) {
    steps.push({ kind: "item", section: ORAL_SECTION, item });
  }
  // Benchmark checklist.
  for (const item of start.benchmark_items) {
    steps.push({ kind: "benchmark", section: CHECKLIST_SECTION, item });
  }
  // Setup: second-adult availability.
  steps.push({ kind: "secondAdult", section: SETUP_SECTION });
  // Health & history: red-flag questions (free_text_concern handled by the concern step).
  for (const def of start.red_flags.filter((f) => f.code !== "free_text_concern")) {
    steps.push({ kind: "redflag", section: HEALTH_SECTION, def });
  }
  steps.push({ kind: "concern", section: HEALTH_SECTION });
  return steps;
}

type Phase =
  | "intro"
  | "starting"
  | "questions"
  | "submitting"
  | "supplemental"
  | "result"
  | "error"
  | "saved"
  | "outOfRange";

export function AssessmentFlow({ childId, childName }: { childId: string; childName: string }) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("intro");
  const [error, setError] = React.useState<string | null>(null);
  const [start, setStart] = React.useState<StartResponse | null>(null);
  const [steps, setSteps] = React.useState<Step[]>([]);
  const [idx, setIdx] = React.useState(0);

  const [responses, setResponses] = React.useState<Record<string, string>>({});
  const [benchmarkAnswers, setBenchmarkAnswers] = React.useState<Record<string, boolean>>({});
  const [redFlagAnswers, setRedFlagAnswers] = React.useState<Record<string, boolean>>({});
  const [secondAdult, setSecondAdult] = React.useState<SecondAdult | undefined>();
  const [concernYes, setConcernYes] = React.useState<boolean | undefined>();
  const [concernText, setConcernText] = React.useState("");

  const [result, setResult] = React.useState<(CompassResult & { assessment_id: string }) | null>(null);
  const [emailDryRun, setEmailDryRun] = React.useState(true);
  const [savingExit, setSavingExit] = React.useState(false);

  async function begin() {
    setPhase("starting");
    setError(null);
    try {
      const res = await fetch("/api/compass/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_id: childId }),
      });
      const data: StartResponse & { message?: string; error?: string; out_of_range?: boolean } = await res.json();
      if (!res.ok) {
        // §1 dignified out-of-range exit: caring guidance, NOT an error frame.
        if (data.out_of_range) {
          setError(data.message ?? null);
          setPhase("outOfRange");
          return;
        }
        setError(data.message ?? data.error ?? "We couldn't start the assessment.");
        setPhase("error");
        return;
      }
      const built = buildSteps(data);
      setStart(data);
      setSteps(built);
      // Resume from a saved draft, if any (§11).
      const d = data.draft_state;
      let resumeIdx = 0;
      if (d && typeof d === "object") {
        if (d.responses) setResponses(d.responses);
        if (d.benchmarkAnswers) setBenchmarkAnswers(d.benchmarkAnswers);
        if (d.redFlagAnswers) setRedFlagAnswers(d.redFlagAnswers);
        if (d.secondAdult) setSecondAdult(d.secondAdult);
        if (typeof d.concernYes === "boolean") setConcernYes(d.concernYes);
        if (typeof d.concernText === "string") setConcernText(d.concernText);
        if (typeof d.idx === "number" && d.idx >= 0 && d.idx < built.length) resumeIdx = d.idx;
      }
      setIdx(resumeIdx);
      setPhase("questions");
    } catch {
      setError("Something went wrong reaching the server. Please try again.");
      setPhase("error");
    }
  }

  function buildDraft(targetIdx: number): DraftState {
    return { responses, benchmarkAnswers, redFlagAnswers, secondAdult, concernYes, concernText, idx: targetIdx };
  }

  // Persist progress as the caregiver moves through the flow (fire-and-forget).
  async function saveDraft(targetIdx: number) {
    if (!start) return;
    try {
      await fetch(`/api/compass/${start.assessment_id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_state: buildDraft(targetIdx) }),
      });
    } catch {
      /* non-blocking: a failed save just means this step isn't persisted yet */
    }
  }

  // Auto-save on EVERY selection (debounced), not only on next/back — a closed
  // tab mid-question loses nothing (owner feedback 2026-08-09).
  React.useEffect(() => {
    if (phase !== "questions" || !start) return;
    const t = setTimeout(() => void saveDraft(idx), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses, benchmarkAnswers, redFlagAnswers, secondAdult, concernYes, concernText]);

  async function saveAndExit() {
    if (!start) return;
    setSavingExit(true);
    await saveDraft(idx);
    try {
      const r = await fetch(`/api/compass/${start.assessment_id}/resume-link`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      setEmailDryRun(j?.dry_run ?? true);
    } catch {
      setEmailDryRun(true);
    } finally {
      setSavingExit(false);
      setPhase("saved");
    }
  }

  const step = steps[idx];

  function answered(s: Step): boolean {
    if (s.kind === "item") return responses[s.item.id] !== undefined;
    if (s.kind === "benchmark") return benchmarkAnswers[s.item.id] !== undefined;
    if (s.kind === "redflag") return redFlagAnswers[s.def.code] !== undefined;
    if (s.kind === "secondAdult") return secondAdult !== undefined;
    return concernYes !== undefined; // concern
  }

  function next() {
    if (idx < steps.length - 1) {
      const target = idx + 1;
      setIdx(target);
      void saveDraft(target);
    } else {
      void submit();
    }
  }
  function back() {
    if (idx > 0) {
      const target = idx - 1;
      setIdx(target);
      void saveDraft(target);
    }
  }

  async function submit() {
    setPhase("submitting");
    setError(null);
    if (!start) return;
    try {
      const res = await fetch(`/api/compass/${start.assessment_id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses,
          benchmarkAnswers,
          redFlagAnswers,
          secondAdultAvailable: secondAdult,
          freeTextConcern: concernYes === true,
          concernText: concernYes === true ? concernText.trim() : "",
        }),
      });
      const data = await res.json();
      if (res.status === 202) {
        setPhase("supplemental");
        return;
      }
      if (res.status === 409) {
        // Already scored — surface the stored result.
        const r = await fetch(`/api/compass/result/${childId}`);
        if (r.ok) {
          setResult(await r.json());
          setPhase("result");
        } else {
          setError("This assessment was already completed.");
          setPhase("error");
        }
        return;
      }
      if (!res.ok) {
        setError(data.message ?? data.error ?? "We couldn't score the assessment.");
        setPhase("error");
        return;
      }
      setResult({ ...data, assessment_id: start.assessment_id });
      setPhase("result");
    } catch {
      setError("Something went wrong submitting the assessment. Please try again.");
      setPhase("error");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    return (
      <CompassResults
        result={result}
        assessmentId={result.assessment_id}
        childId={childId}
        childName={childName}
        onOverridden={() => router.refresh()}
      />
    );
  }

  if (phase === "intro" || phase === "starting") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{INTRO_COPY.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{INTRO_COPY.lede}</p>
          <p className="text-sm text-muted-foreground">{INTRO_COPY.reassurance}</p>
          <div>
            <Button onClick={begin} disabled={phase === "starting"}>
              {phase === "starting" ? "Starting…" : `Begin with ${childName}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "outOfRange") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">A better next step for now</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Nothing is wrong — {childName}&apos;s profile is saved, and you can come back any time.
          </p>
          <div>
            <Button asChild variant="outline">
              <Link href={`/children/${childId}`}>Back to {childName}&apos;s page</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">We hit a snag</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <div>
            <Button variant="outline" onClick={() => setPhase("intro")}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "supplemental") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">A few more details would help</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            We&apos;d like a little more information to personalize this confidently. You can revisit any answers and
            complete the remaining questions.
          </p>
          <div>
            <Button variant="outline" onClick={() => setPhase("questions")}>
              Review my answers
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "saved") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your place is saved</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {emailDryRun
              ? `We've saved your answers for ${childName}. You can pick up right where you left off any time from ${childName}'s page.`
              : `We've emailed you a link so you can finish ${childName}'s assessment later. Your answers so far are saved.`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPhase("questions")}>
              Keep going now
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/children/${childId}`)}>
              Back to {childName}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "submitting") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Putting {childName}&apos;s starting point together…
        </CardContent>
      </Card>
    );
  }

  // phase === "questions"
  if (!step) return null;
  const sections = [...new Set(steps.map((s) => s.section))];
  const sectionIdx = sections.indexOf(step.section);
  const inSection = steps.filter((s) => s.section === step.section);
  const posInSection = inSection.indexOf(step) + 1;
  const overallPct = ((idx + 1) / steps.length) * 100;
  const canProceed = answered(step);
  const isLast = idx === steps.length - 1;

  return (
    <div className="flex flex-col gap-5">
      {/* Progress by section (never a raw "x of N" over the whole survey). */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {sections.map((s, i) => (
            <span
              key={s}
              className={
                i === sectionIdx
                  ? "font-medium text-foreground"
                  : i < sectionIdx
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50"
              }
            >
              {s}
              {i < sections.length - 1 ? <span className="mx-1 text-muted-foreground/30">·</span> : null}
            </span>
          ))}
        </div>
        <Progress value={overallPct} label={`${step.section} section`} />
        <p className="text-xs text-muted-foreground">
          {step.section} — question {posInSection} of {inSection.length}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-5 py-6">
          <StepBody
            step={step}
            childName={childName}
            responses={responses}
            setResponse={(id, v) => setResponses((r) => ({ ...r, [id]: v }))}
            benchmarkAnswers={benchmarkAnswers}
            setBenchmark={(id, v) => setBenchmarkAnswers((r) => ({ ...r, [id]: v }))}
            redFlagAnswers={redFlagAnswers}
            setRedFlag={(code, v) => setRedFlagAnswers((r) => ({ ...r, [code]: v }))}
            secondAdult={secondAdult}
            setSecondAdult={setSecondAdult}
            concernYes={concernYes}
            setConcernYes={setConcernYes}
            concernText={concernText}
            setConcernText={setConcernText}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={back} disabled={idx === 0}>
          ← Back
        </Button>
        <Button onClick={next} disabled={!canProceed}>
          {isLast ? "See where we'll start" : "Continue"}
        </Button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={saveAndExit}
          disabled={savingExit}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
        >
          {savingExit ? "Saving…" : "Save & finish later"}
        </button>
      </div>
    </div>
  );
}

// ── One-question renderers ────────────────────────────────────────────────────

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={
        "w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors " +
        (selected
          ? "border-primary bg-primary/5 ring-primary/30 ring-1"
          : "border-input hover:bg-muted/50")
      }
    >
      {children}
    </button>
  );
}

function QuestionText({ hint, children }: { hint?: string; children: React.ReactNode }) {
  // Hint sits ABOVE the question as context, so it never reads as part of the
  // question itself (owner feedback 2026-08-09).
  return (
    <div className="flex flex-col gap-1">
      {hint ? <p className="text-xs italic text-muted-foreground">{hint}</p> : null}
      <h2 className="text-lg font-medium leading-snug">{children}</h2>
    </div>
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <OptionButton selected={value === true} onClick={() => onChange(true)}>
        Yes
      </OptionButton>
      <OptionButton selected={value === false} onClick={() => onChange(false)}>
        No
      </OptionButton>
    </div>
  );
}

function StepBody(props: {
  step: Step;
  childName: string;
  responses: Record<string, string>;
  setResponse: (id: string, v: string) => void;
  benchmarkAnswers: Record<string, boolean>;
  setBenchmark: (id: string, v: boolean) => void;
  redFlagAnswers: Record<string, boolean>;
  setRedFlag: (code: string, v: boolean) => void;
  secondAdult: SecondAdult | undefined;
  setSecondAdult: (v: SecondAdult) => void;
  concernYes: boolean | undefined;
  setConcernYes: (v: boolean) => void;
  concernText: string;
  setConcernText: (v: string) => void;
}) {
  const { step, childName } = props;

  if (step.kind === "item") {
    // Text-reduction ruling: no domain descriptions in the question flow — the
    // questions themselves make the domain obvious.
    const selected = props.responses[step.item.id];
    return (
      <>
        <QuestionText>{step.item.prompt}</QuestionText>
        <div className="flex flex-col gap-2">
          {Object.keys(step.item.points).map((opt) => (
            <OptionButton key={opt} selected={selected === opt} onClick={() => props.setResponse(step.item.id, opt)}>
              {opt}
            </OptionButton>
          ))}
        </div>
      </>
    );
  }

  if (step.kind === "benchmark") {
    return (
      <>
        <QuestionText hint="Just a yes or no — whichever is usually true.">
          Does {childName} do this yet? “{step.item.prompt}”
        </QuestionText>
        <YesNo value={props.benchmarkAnswers[step.item.id]} onChange={(v) => props.setBenchmark(step.item.id, v)} />
      </>
    );
  }

  if (step.kind === "secondAdult") {
    const opts: { v: SecondAdult; label: string }[] = [
      { v: "usually", label: "Usually — there's often another adult around" },
      { v: "sometimes", label: "Sometimes" },
      { v: "no", label: "No — it's usually just me" },
    ];
    return (
      <>
        <QuestionText hint="Some activities work best with a second person to help. This just helps us plan.">
          When you practice with {childName}, is another adult usually available to help?
        </QuestionText>
        <div className="flex flex-col gap-2">
          {opts.map((o) => (
            <OptionButton key={o.v} selected={props.secondAdult === o.v} onClick={() => props.setSecondAdult(o.v)}>
              {o.label}
            </OptionButton>
          ))}
        </div>
      </>
    );
  }

  if (step.kind === "redflag") {
    return (
      <>
        <QuestionText hint="It's okay if you're not sure — answer as best you can.">{step.def.prompt}</QuestionText>
        <YesNo value={props.redFlagAnswers[step.def.code]} onChange={(v) => props.setRedFlag(step.def.code, v)} />
      </>
    );
  }

  // concern
  return (
    <>
      <QuestionText hint="Anything at all — this goes to a person, not just the scoring.">
        Is there something specific about {childName}&apos;s communication you&apos;re worried about?
      </QuestionText>
      <YesNo value={props.concernYes} onChange={props.setConcernYes} />
      {props.concernYes ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="concern" className="text-sm text-muted-foreground">
            Tell us a little more (optional)
          </label>
          <Textarea
            id="concern"
            value={props.concernText}
            onChange={(e) => props.setConcernText(e.target.value)}
            placeholder="What have you noticed?"
          />
        </div>
      ) : null}
    </>
  );
}
