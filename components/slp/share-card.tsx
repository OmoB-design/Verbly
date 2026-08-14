"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

/**
 * "Share with your SLP" — the caregiver's access-control surface (invite links
 * + revocation). Links are shared by the caregiver however they like; email
 * sending is dry-run until the Resend domain exists and the UI says so
 * honestly. Revoking cuts the SLP's access instantly (RLS enforced).
 */

interface LinkedSlp {
  id: string;
  name: string;
}
interface PendingInvite {
  id: string;
  token: string;
  expires_at: string;
}

export function SlpShareCard({
  childId,
  childName,
  linkedSlps,
  pendingInvites,
}: {
  childId: string;
  childName: string;
  linkedSlps: LinkedSlp[];
  pendingInvites: PendingInvite[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [emailFor, setEmailFor] = React.useState<string | null>(null); // invite id
  const [email, setEmail] = React.useState("");
  const [emailStatus, setEmailStatus] = React.useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = React.useState<LinkedSlp | null>(null);

  const inviteUrl = (token: string) =>
    (typeof window !== "undefined" ? window.location.origin : "") + `/invite/${token}`;

  async function post(path: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function createInvite() {
    setBusy("create");
    setError(null);
    const { ok, data } = await post("/api/slp-links/invite", { child_id: childId });
    setBusy(null);
    if (!ok) {
      setError(String(data.error ?? "Couldn't create the invite."));
      return;
    }
    setCreatedUrl(String(data.url));
    router.refresh();
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the URL is visible to copy manually */
    }
  }

  async function revoke(body: { slp_id?: string; invite_id?: string }) {
    setBusy(body.slp_id ?? body.invite_id ?? "revoke");
    setError(null);
    const { ok, data } = await post("/api/slp-links/revoke", { child_id: childId, ...body });
    setBusy(null);
    if (!ok) {
      setError(String(data.error ?? "Couldn't revoke."));
      return;
    }
    setCreatedUrl(null);
    router.refresh();
  }

  async function sendEmail(inviteId: string) {
    setBusy("email");
    setEmailStatus(null);
    const { ok, data } = await post("/api/slp-links/invite-email", { invite_id: inviteId, email });
    setBusy(null);
    if (!ok) {
      setEmailStatus(String(data.error ?? "Couldn't send."));
      return;
    }
    setEmailStatus(
      data.dry_run
        ? "Email sending isn't switched on yet — please copy the link and share it directly."
        : `Sent to ${email}.`,
    );
    setEmail("");
    setEmailFor(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Share with your SLP</CardTitle>
        <CardDescription>
          Give a speech-language pathologist read-only access to {childName}&apos;s records. They can leave notes
          you&apos;ll always see, and you can withdraw access at any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {linkedSlps.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {linkedSlps.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <span className="text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">has access to {childName}&apos;s records</span>
                </span>
                <Button variant="outline" size="sm" onClick={() => setConfirmRemove(s)} disabled={busy === s.id}>
                  Remove access
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        {pendingInvites.map((inv) => (
          <div key={inv.id} className="flex flex-col gap-2 rounded-lg border px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">
                <span className="font-medium">Invite link ready</span>
                <span className="block text-xs text-muted-foreground">
                  valid until {new Date(inv.expires_at).toDateString()}
                </span>
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copy(inviteUrl(inv.token))}>
                  {copied ? "Copied ✓" : "Copy link"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => revoke({ invite_id: inv.id })} disabled={busy === inv.id}>
                  Withdraw
                </Button>
              </div>
            </div>
            {emailFor === inv.id ? (
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="slp@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button size="sm" onClick={() => sendEmail(inv.id)} disabled={busy === "email" || !email.includes("@")}>
                  {busy === "email" ? "Sending…" : "Send"}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEmailFor(inv.id)}
                className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Email this link instead
              </button>
            )}
          </div>
        ))}
        {emailStatus ? <p className="text-xs text-muted-foreground">{emailStatus}</p> : null}

        {createdUrl && pendingInvites.length === 0 ? (
          <p className="text-xs text-muted-foreground break-all">{createdUrl}</p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div>
          <Button variant="outline" size="sm" onClick={createInvite} disabled={busy === "create"}>
            {busy === "create" ? "Creating…" : "Create an invite link"}
          </Button>
        </div>

        <Modal
          open={confirmRemove !== null}
          onClose={() => busy === null && setConfirmRemove(null)}
          locked={busy !== null}
          title={`Remove ${confirmRemove?.name ?? "this SLP"}'s access?`}
          description={`They'll immediately stop seeing ${childName}'s records and can no longer leave notes. Notes they've already written stay on ${childName}'s record. You can always invite them again later.`}
        >
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              disabled={busy !== null}
              onClick={async () => {
                if (!confirmRemove) return;
                await revoke({ slp_id: confirmRemove.id });
                setConfirmRemove(null);
              }}
            >
              {busy !== null ? "Removing…" : "Remove access"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmRemove(null)} disabled={busy !== null}>
              Cancel
            </Button>
          </div>
        </Modal>
      </CardContent>
    </Card>
  );
}
