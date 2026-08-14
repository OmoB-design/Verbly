"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PHASE_NAMES, phaseName } from "@/lib/compass/contract";
import {
  domainLabel,
  placementModeCopy,
  referralMessage,
  simplifiedCopy,
  startingPhaseHeadline,
  twoAdultCopy,
} from "@/lib/compass/ui-copy";
import type { CompassResult } from "@/lib/compass/types";

type ResultProps = {
  result: CompassResult;
  assessmentId: string;
  childId: string;
  childName: string;
  onOverridden?: () => void;
};

export function CompassResults({ result, assessmentId, childId, childName, onOverridden }: ResultProps) {
  // Locally track the overridable placement so the screen updates immediately.
  const [startingPhase, setStartingPhase] = React.useState(result.starting_phase);
  const [placementSource, setPlacementSource] = React.useState(result.placement_source);
  const [enginePhase] = React.useState(result.recommended_phase);

  const hasReferral = result.referral_recommended || (result.red_flags?.hard?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Warm headline — "where we'll start", never "your child's level". */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{startingPhaseHeadline(childName, startingPhase)}</h1>
        {placementSource === "caregiver_override" ? (
          <p className="mt-1 text-sm text-muted-foreground">
            You chose to start here. Our suggestion was Phase {enginePhase} — {phaseName(enginePhase)}.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            A personalized starting point based on what you shared — a place to begin, not a label.
          </p>
        )}
      </div>

      {/* Strengths FIRST (§11). */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What&apos;s already working</CardTitle>
        </CardHeader>
        <CardContent>
          {result.strengths.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {result.strengths.map((s) => (
                <li key={s}>
                  <Badge variant="secondary" className="text-sm font-normal">
                    {domainLabel(s)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Every child has strengths that grow with practice — we&apos;ll build on {childName}&apos;s as you go.
            </p>
          )}
        </CardContent>
      </Card>

      {/* How we'll begin. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How we&apos;ll begin</CardTitle>
          <CardDescription>{placementModeCopy(result.placement_mode, childName)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          {result.reasoning.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          {result.start_in_simplified ? <p>{simplifiedCopy(childName)}</p> : null}
          {result.two_adult_advisory ? (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-foreground/80">{twoAdultCopy()}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* What we'll focus on (needs, framed as focus). */}
      {result.needs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What we&apos;ll focus on next</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {result.needs.map((n) => (
                <li key={n}>
                  <Badge variant="outline" className="text-sm font-normal">
                    {domainLabel(n)}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Forward movement: straight into practice from here — the caregiver
          should never have to navigate backwards to move on (owner feedback). */}
      <div>
        <Button asChild size="lg">
          <Link href={`/children/${childId}/practice`}>Start Phase {startingPhase} practice →</Link>
        </Button>
      </div>

      {/* Red-flag / referral — visually SEPARATED, framed as care, not a grade (§11). */}
      {hasReferral ? (
        <div className="rounded-lg border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="mb-1 font-medium">A note worth sharing with a professional</p>
          <p>{referralMessage(childName)}</p>
        </div>
      ) : null}

      {/* Clinical-framing reminder (stays visible, not just at onboarding). */}
      <p className="text-xs text-muted-foreground">
        The Communication Compass is a screening and placement tool, not a validated clinical measure or a diagnosis.
        It isn&apos;t a substitute for a professional evaluation.
      </p>

      <Separator />

      {/* Quiet override affordance (§6.5 / §11 — present but understated). */}
      <OverrideControl
        assessmentId={assessmentId}
        childName={childName}
        currentPhase={startingPhase}
        onApplied={(phase) => {
          setStartingPhase(phase);
          setPlacementSource("caregiver_override");
          onOverridden?.();
        }}
      />

      <RetakeControl childId={childId} childName={childName} />
    </div>
  );
}

/** Re-assessment entry (the /start endpoint always supported it — this is its
 *  first UI). A fresh Compass re-places the child, so it gets a modal that
 *  says exactly that before anything starts. */
function RetakeControl({ childId, childName }: { childId: string; childName: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Things have changed — retake the assessment
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Retake the Communication Compass?"
        description={`A fresh assessment looks at how ${childName} communicates now, and its result becomes the new starting point — the current placement and history stay on record. It takes about ten minutes.`}
      >
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/children/${childId}/compass?retake=1`)}>Start the reassessment</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Not now
          </Button>
        </div>
      </Modal>
    </>
  );
}

function OverrideControl({
  assessmentId,
  childName,
  currentPhase,
  onApplied,
}: {
  assessmentId: string;
  childName: string;
  currentPhase: number;
  onApplied: (phase: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [phase, setPhase] = React.useState<number>(currentPhase);
  const [confirmed, setConfirmed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/compass/${assessmentId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caregiver_phase: phase, confirmed: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "We couldn't apply that change.");
        return;
      }
      onApplied(data.starting_phase ?? phase);
      setOpen(false);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        This doesn&apos;t match what I see — choose a different starting point
      </button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Choose a different starting point</CardTitle>
        <CardDescription>
          You know {childName} best. If our suggestion doesn&apos;t fit, you can start somewhere else — you can always
          revisit this later.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="override-phase" className="text-sm font-medium">
            Start at
          </label>
          <select
            id="override-phase"
            value={phase}
            onChange={(e) => setPhase(Number(e.target.value))}
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
          >
            {Object.entries(PHASE_NAMES).map(([num, name]) => (
              <option key={num} value={num}>
                Phase {num} — {name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          <span>I understand this replaces our recommended starting point.</span>
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex items-center gap-2">
          <Button onClick={apply} disabled={!confirmed || busy}>
            {busy ? "Applying…" : "Use this starting point"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
