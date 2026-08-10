"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/** Accept action for a signed-in SLP on the invite page. */
export function AcceptInviteButton({ token, childName }: { token: string; childName: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/slp-links/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "We couldn't accept this invite.");
        return;
      }
      router.push(`/slp/children/${data.child_id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div>
        <Button onClick={accept} disabled={busy}>
          {busy ? "Linking…" : `Accept — view ${childName}'s records`}
        </Button>
      </div>
    </div>
  );
}
