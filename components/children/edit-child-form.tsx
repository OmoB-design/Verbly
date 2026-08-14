"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";

import { updateChild } from "@/app/(app)/children/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Edit profile + the danger zone. Deleting is the one truly irreversible act
 * in the product (cascades sessions, assessments, notes, and recordings —
 * including audio files), so it requires typing the child's name.
 */
export function EditChildForm({
  childId,
  initialName,
  initialDob,
  hasBracket,
}: {
  childId: string;
  initialName: string;
  initialDob: string;
  hasBracket: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateChild, undefined);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Edit {initialName}&apos;s profile</CardTitle>
          <CardDescription>This information is private to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="child_id" value={childId} />
            <div className="grid gap-2">
              <Label htmlFor="name">Child&apos;s name</Label>
              <Input id="name" name="name" type="text" defaultValue={initialName} required className="h-11" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" name="dob" type="date" defaultValue={initialDob} className="h-11" />
              {hasBracket ? (
                <p className="text-xs text-muted-foreground">
                  Fixing a wrong date won&apos;t change the activities already matched from the assessment — if the
                  correction is large, retaking the Communication Compass will re-match them.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Used to choose age-appropriate activities.</p>
              )}
            </div>

            {state?.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={pending} className="h-11 px-6">
                {pending ? "Saving…" : "Save changes"}
              </Button>
              <Button asChild variant="outline" type="button" className="h-11 px-6">
                <Link href={`/children/${childId}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DeleteChildCard childId={childId} childName={initialName} />
    </div>
  );
}

function DeleteChildCard({ childId, childName }: { childId: string; childName: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function destroy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/children/${childId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "We couldn't delete the profile.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base">Delete this profile</CardTitle>
        <CardDescription>
          Permanently removes {childName}&apos;s profile and everything in it — sessions, assessment results, SLP notes,
          and voice recordings. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!open ? (
          <div>
            <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => setOpen(true)}>
              Delete {childName}&apos;s profile…
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <Label htmlFor="confirm-name" className="text-sm">
                Type <span className="font-semibold">{childName}</span> to confirm
              </Label>
              <Input
                id="confirm-name"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={childName}
                className="h-11"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                disabled={typed.trim() !== childName || busy}
                onClick={destroy}
              >
                {busy ? "Deleting…" : "Permanently delete"}
              </Button>
              <Button variant="ghost" onClick={() => { setOpen(false); setTyped(""); }} disabled={busy}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
