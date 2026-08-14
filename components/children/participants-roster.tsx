"use client";

import * as React from "react";
import { useActionState } from "react";

import { addParticipant, removeParticipant } from "@/app/(app)/children/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * Saved session helpers — display names only, never accounts (locked
 * decision). Reused by the session runner's setup step so names aren't
 * retyped every session.
 */

const ROLE_LABEL: Record<string, string> = {
  communication_partner: "Communication partner",
  physical_prompter: "Physical prompter (Phases 4–5)",
  peer: "Peer / another child (Phase 10)",
};

interface Participant {
  id: string;
  display_name: string;
  role: string;
}

export function ParticipantsRoster({ childId, participants }: { childId: string; participants: Participant[] }) {
  const [state, formAction, pending] = useActionState(addParticipant, undefined);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (!pending && !state?.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Session helpers</CardTitle>
        <CardDescription>
          People who help during practice — saved here so you don&apos;t retype their names each session. Just names,
          never accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {participants.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <span className="text-sm">
                  <span className="font-medium">{p.display_name}</span>
                  <span className="text-muted-foreground block text-xs">{ROLE_LABEL[p.role] ?? p.role}</span>
                </span>
                <form action={removeParticipant}>
                  <input type="hidden" name="participant_id" value={p.id} />
                  <input type="hidden" name="child_id" value={childId} />
                  <Button variant="ghost" size="sm" type="submit">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No helpers saved yet.</p>
        )}

        <form ref={formRef} action={formAction} className="flex flex-col gap-2 rounded-lg border p-3">
          <input type="hidden" name="child_id" value={childId} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input name="display_name" placeholder="Name (e.g. Grandma, Tunde)" required className="h-10" />
            <select
              name="role"
              defaultValue="communication_partner"
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
            >
              {Object.entries(ROLE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {state?.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          <div>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Adding…" : "Add helper"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
