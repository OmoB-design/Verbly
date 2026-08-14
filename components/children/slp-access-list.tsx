"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/format";

/**
 * Settings → SLP access: who can read this child's records, since when, and an
 * immediate off-switch (transparency requirement — ethics review expects the
 * caregiver to be able to SEE that someone has access and end it). Invites
 * live on the child's main page; this view is about awareness and revocation.
 */

interface LinkedSlp {
  id: string;
  name: string;
  linked_at: string | null;
}

export function SlpAccessList({
  childId,
  childName,
  linkedSlps,
}: {
  childId: string;
  childName: string;
  linkedSlps: LinkedSlp[];
}) {
  const router = useRouter();
  const [confirmRemove, setConfirmRemove] = React.useState<LinkedSlp | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function revoke() {
    if (!confirmRemove) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/slp-links/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_id: childId, slp_id: confirmRemove.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't remove access.");
        return;
      }
      setConfirmRemove(null);
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
        <CardTitle className="text-lg">Who can see {childName}&apos;s records</CardTitle>
        <CardDescription>
          Besides you, only professionals you&apos;ve invited. Access is read-only, their notes are always visible to
          you, and you can end access at any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {linkedSlps.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No one else has access. You can invite an SLP from {childName}&apos;s page.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {linkedSlps.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <span className="text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground block text-xs">
                    Speech-language pathologist{s.linked_at ? ` · access since ${formatDate(s.linked_at)}` : ""}
                  </span>
                </span>
                <Button variant="outline" size="sm" onClick={() => setConfirmRemove(s)}>
                  Remove access
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Modal
          open={confirmRemove !== null}
          onClose={() => !busy && setConfirmRemove(null)}
          locked={busy}
          title={`Remove ${confirmRemove?.name ?? "this SLP"}'s access?`}
          description={`They'll immediately stop seeing ${childName}'s records. Notes they've already written stay part of the record. You can invite them again later.`}
        >
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={revoke}
              disabled={busy}
            >
              {busy ? "Removing…" : "Remove access"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmRemove(null)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </Modal>
      </CardContent>
    </Card>
  );
}
