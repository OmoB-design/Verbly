"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";

/** Download-my-data + delete-account (settings → Data & privacy / Account). */

export function DownloadDataButton() {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) {
        setError("Couldn't prepare the export — please try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `verbly-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't prepare the export — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div>
        <Button variant="outline" size="sm" onClick={download} disabled={busy}>
          {busy ? "Preparing…" : "Download my data"}
        </Button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

export function DeleteAccountCard({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function destroy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "We couldn't delete the account.");
        return;
      }
      router.push("/login");
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
        <CardTitle className="text-base">Delete my account</CardTitle>
        <CardDescription>
          Leaving is always your right — including as a research participant, without penalty. This permanently removes
          your account, every child profile, all assessments and session history, professional notes, and voice
          recordings. It cannot be undone. Consider downloading your data first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          className="border-destructive/50 text-destructive hover:bg-destructive/10"
          onClick={() => setOpen(true)}
        >
          Delete my account…
        </Button>

        <Modal
          open={open}
          onClose={() => {
            if (!busy) {
              setOpen(false);
              setTyped("");
              setError(null);
            }
          }}
          locked={busy}
          title="Delete your account?"
          description="Everything goes: your account, all child profiles, assessments, session history, notes from professionals, and recordings. This cannot be undone."
        >
          <div className="grid gap-2">
            <Label htmlFor="confirm-email" className="text-sm">
              Type your email (<span className="font-medium">{email}</span>) to confirm
            </Label>
            <Input
              id="confirm-email"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={email}
              className="h-11"
            />
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              disabled={typed.trim().toLowerCase() !== email.toLowerCase() || busy}
              onClick={destroy}
            >
              {busy ? "Deleting…" : "Permanently delete everything"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </Modal>
      </CardContent>
    </Card>
  );
}
