"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/format";

/**
 * Settings → reassessment: when the next Compass check-in is suggested, an
 * early-retake path (confirm-gated — it re-places the child), and a
 * resume-link re-send for an assessment left half-done.
 */
export function CompassSettingsCard({
  childId,
  childName,
  lastCompletedAt,
  dueAt,
  inProgressAssessmentId,
}: {
  childId: string;
  childName: string;
  lastCompletedAt: string | null;
  dueAt: string | null;
  inProgressAssessmentId: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [resendStatus, setResendStatus] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const due = dueAt ? new Date(dueAt) : null;
  const dueSoon = due !== null && due.getTime() <= Date.now();

  async function resend() {
    if (!inProgressAssessmentId) return;
    setBusy(true);
    setResendStatus(null);
    try {
      const res = await fetch(`/api/compass/${inProgressAssessmentId}/resume-link`, { method: "POST" });
      const data = await res.json();
      setResendStatus(
        !res.ok
          ? (data.error ?? "Couldn't send the link.")
          : data.dry_run
            ? "Email sending isn't switched on yet — you can continue any time from this child's Compass page."
            : "Sent — check your inbox.",
      );
    } catch {
      setResendStatus("Couldn't send the link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Reassessment</CardTitle>
        <CardDescription>
          {lastCompletedAt
            ? `Last assessed ${formatDate(lastCompletedAt)}.` +
              (due
                ? dueSoon
                  ? ` A check-in is suggested — children change quickly.`
                  : ` The next check-in is suggested around ${formatDate(due.toISOString())}.`
                : "")
            : `${childName} hasn't completed the Communication Compass yet.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {lastCompletedAt ? (
          <div>
            <Button variant={dueSoon ? "default" : "outline"} size="sm" onClick={() => setConfirming(true)}>
              Retake the Compass{dueSoon ? "" : " early"}
            </Button>
          </div>
        ) : null}

        {inProgressAssessmentId ? (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={resend}
              disabled={busy}
              className="text-muted-foreground hover:text-foreground self-start text-sm underline underline-offset-4 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Re-send my continue-later link"}
            </button>
            {resendStatus ? <p className="text-muted-foreground text-xs">{resendStatus}</p> : null}
          </div>
        ) : null}

        <Modal
          open={confirming}
          onClose={() => setConfirming(false)}
          title="Retake the Communication Compass?"
          description={`A fresh assessment looks at how ${childName} communicates now, and its result becomes the new starting point — the current placement and history stay on record. About ten minutes.`}
        >
          <div className="flex gap-2">
            <Button onClick={() => router.push(`/children/${childId}/compass?retake=1`)}>Start the reassessment</Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Not now
            </Button>
          </div>
        </Modal>
      </CardContent>
    </Card>
  );
}
