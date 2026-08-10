"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

/**
 * SLP note composer. Notes are append-only and ALWAYS visible to the family —
 * the composer says so up front, because it changes how a professional writes.
 * Optionally anchored to a recent session or the assessment.
 */

interface AnchorOption {
  value: string; // "session:<id>" | "assessment:<id>"
  label: string;
}

export function NoteComposer({
  childId,
  childName,
  anchors,
}: {
  childId: string;
  childName: string;
  anchors: AnchorOption[];
}) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [anchor, setAnchor] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const [kind, id] = anchor.split(":");
      const res = await fetch("/api/slp-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: childId,
          body,
          session_instance_id: kind === "session" ? id : undefined,
          assessment_id: kind === "assessment" ? id : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The note didn't save — please try again.");
        return;
      }
      setBody("");
      setAnchor("");
      router.refresh();
    } catch {
      setError("The note didn't save — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leave a note</CardTitle>
        <CardDescription>
          Visible to {childName}&apos;s family as soon as you save it — notes are shared and permanent (they stay part
          of the record even if your access later ends).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`e.g. "Great progress on the picture exchange — this week, try holding the card slightly farther away."`}
          maxLength={4000}
        />
        {anchors.length > 0 ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="note-anchor" className="text-xs text-muted-foreground">
              Attach to (optional)
            </label>
            <select
              id="note-anchor"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
            >
              <option value="">Nothing specific</option>
              {anchors.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div>
          <Button onClick={save} disabled={busy || body.trim().length === 0}>
            {busy ? "Saving…" : "Save note"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
