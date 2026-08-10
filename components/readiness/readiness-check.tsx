"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The one-shot pre-session readiness check (owner-approved content v1.0.0).
 * Five caregiver-report yes/no questions, ~90 seconds. Scoring is
 * server-authoritative (/api/readiness/[id]/submit) — this component only
 * collects facts and shows the server's verdict with warm framing. Whatever
 * the result, the child proceeds at the same phase (a fail only means the
 * first session runs as its gentler Simplified variant).
 */

interface CheckItem {
  id: string;
  prompt: string;
}

type Result = {
  passed: boolean;
  hard_item_flagged: boolean;
  flag_phrase: string | null;
};

export function ReadinessCheck({
  assessmentId,
  childName,
  items,
}: {
  assessmentId: string;
  childName: string;
  items: CheckItem[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = React.useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);

  const allAnswered = items.every((i) => typeof answers[i.id] === "boolean");

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/readiness/${assessmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "We couldn't save the check — please try again.");
        return;
      }
      setResult(data as Result);
    } catch {
      setError("Something went wrong reaching the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {result.passed ? `${childName} is ready to start` : `We'll start gently`}
          </CardTitle>
          <CardDescription>
            {result.passed
              ? `Thanks — that's everything we need. The first activity is ready when you are.`
              : `Thanks — based on what you shared, we'll begin with a gentler version of the first activity and build up from there. Nothing is wrong; this is just the softest way in.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {result.hard_item_flagged && result.flag_phrase ? (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground/80">
              One thing to keep an eye on during the first few sessions: {result.flag_phrase}.
            </p>
          ) : null}
          <div>
            <Button onClick={() => router.refresh()}>See the activities</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">A quick check before the first session</CardTitle>
        <CardDescription>
          Five yes-or-no questions about {childName} — about 90 seconds. There are no wrong answers, and{" "}
          {childName} starts their activities either way; this just helps us pitch the first session right.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {items.map((item, idx) => (
          <div key={item.id} className="flex flex-col gap-2">
            <p className="text-sm font-medium leading-snug">
              {idx + 1}. {item.prompt}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={answers[item.id] === true}
                onClick={() => setAnswers((a) => ({ ...a, [item.id]: true }))}
                className={
                  "rounded-lg border px-3 py-2 text-sm transition-colors " +
                  (answers[item.id] === true
                    ? "border-primary bg-primary/5 ring-primary/30 ring-1"
                    : "border-input hover:bg-muted/50")
                }
              >
                Yes
              </button>
              <button
                type="button"
                aria-pressed={answers[item.id] === false}
                onClick={() => setAnswers((a) => ({ ...a, [item.id]: false }))}
                className={
                  "rounded-lg border px-3 py-2 text-sm transition-colors " +
                  (answers[item.id] === false
                    ? "border-primary bg-primary/5 ring-primary/30 ring-1"
                    : "border-input hover:bg-muted/50")
                }
              >
                No
              </button>
            </div>
          </div>
        ))}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div>
          <Button onClick={submit} disabled={!allAnswered || submitting}>
            {submitting ? "Saving…" : "Done"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
