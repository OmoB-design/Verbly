"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/**
 * Caregiver-initiated regression (the endpoint has existed since the runtime
 * slice; this is its first UI). Quiet affordance + modal confirm: moving back
 * is a legitimate, logged decision — never framed as failure. Only phases the
 * child actually reached are offered; the server enforces the same rule.
 */

interface RegressOption {
  phaseId: string;
  phaseNumber: number;
  name: string;
}

export function RegressControl({
  childId,
  childName,
  options,
}: {
  childId: string;
  childName: string;
  options: RegressOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [target, setTarget] = React.useState<RegressOption | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (options.length === 0) return null;

  async function apply() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/phase-history/regress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_id: childId, target_phase_id: target.phaseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "We couldn't make that change.");
        return;
      }
      setOpen(false);
      setTarget(null);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Feeling like the current phase is too much? Move back a phase
      </button>

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        locked={busy}
        title="Move back to an earlier phase"
        description={`Sometimes stepping back is the right call — this is recorded as your decision, nothing is deleted, and ${childName} can climb back whenever they're ready.`}
      >
        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <button
              key={o.phaseId}
              type="button"
              aria-pressed={target?.phaseId === o.phaseId}
              onClick={() => setTarget(o)}
              className={
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors " +
                (target?.phaseId === o.phaseId
                  ? "border-primary bg-primary/5 ring-primary/30 ring-1"
                  : "border-input hover:bg-muted/50")
              }
            >
              Phase {o.phaseNumber} — {o.name}
            </button>
          ))}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button onClick={apply} disabled={!target || busy}>
            {busy ? "Moving…" : target ? `Move to Phase ${target.phaseNumber}` : "Choose a phase"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
