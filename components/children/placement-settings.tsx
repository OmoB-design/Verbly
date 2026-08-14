"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { PhaseChip } from "@/components/phase-identity";
import { phaseName } from "@/lib/compass/contract";

/**
 * Settings → placement: view the current phase and the engine's original
 * recommendation; request a change. Identical behaviour to the results-screen
 * override (same endpoint → placement_overrides + caregiver_override history,
 * recommended_phase retained) — this is the one genuinely consequential action
 * in settings, so it alone gets a firm confirmation gate.
 */

interface PhaseOption {
  phase_number: number;
  name: string;
  clinical_goal: string | null;
}

export function PlacementSettings({
  assessmentId,
  childName,
  currentPhase,
  enginePhase,
  phases,
}: {
  assessmentId: string;
  childName: string;
  currentPhase: number | null;
  enginePhase: number | null;
  phases: PhaseOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<number | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function apply() {
    if (selected === null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/compass/${assessmentId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caregiver_phase: selected, confirmed: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "We couldn't change the phase.");
        return;
      }
      setConfirming(false);
      setSelected(null);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Starting phase</CardTitle>
        <CardDescription>
          {currentPhase !== null
            ? `${childName} is currently on Phase ${currentPhase} — ${phaseName(currentPhase)}.`
            : `${childName} hasn't been placed yet.`}
          {enginePhase !== null && enginePhase !== currentPhase
            ? ` The assessment originally suggested Phase ${enginePhase}.`
            : ""}{" "}
          If the current phase feels too hard or already outgrown, you can move {childName} — you know them best.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {phases.map((p) => {
          const isCurrent = p.phase_number === currentPhase;
          return (
            <button
              key={p.phase_number}
              type="button"
              disabled={isCurrent}
              aria-pressed={selected === p.phase_number}
              onClick={() => setSelected(p.phase_number)}
              className={
                "flex items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors " +
                (isCurrent
                  ? "bg-muted/60 cursor-default"
                  : selected === p.phase_number
                    ? "border-primary bg-primary/5 ring-primary/30 ring-1"
                    : "border-input hover:bg-muted/50")
              }
            >
              <PhaseChip phase={p.phase_number} className="mt-0.5 shrink-0" />
              <span className="min-w-0 text-sm">
                <span className="font-medium">
                  {p.name}
                  {isCurrent ? <span className="text-muted-foreground font-normal"> · current</span> : null}
                  {p.phase_number === enginePhase ? (
                    <span className="text-muted-foreground font-normal"> · suggested by the assessment</span>
                  ) : null}
                </span>
                {p.clinical_goal ? (
                  <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs">{p.clinical_goal}</span>
                ) : null}
              </span>
            </button>
          );
        })}

        {selected !== null ? (
          <div className="pt-1">
            <Button onClick={() => setConfirming(true)}>Move to Phase {selected}…</Button>
          </div>
        ) : null}

        <Modal
          open={confirming}
          onClose={() => !busy && setConfirming(false)}
          locked={busy}
          title={`Move ${childName} to Phase ${selected}?`}
          description={`Practice switches to ${selected !== null ? phaseName(selected) : ""} straight away. This is recorded as your decision, the assessment's suggestion stays on file, and you can change it again any time.`}
        >
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button onClick={apply} disabled={busy}>
              {busy ? "Moving…" : "Yes, move phases"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </Modal>
      </CardContent>
    </Card>
  );
}
