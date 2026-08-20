import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { AskVerbly } from "@/components/chat/ask-verbly";

/**
 * Chat — two surfaces with opposite retention BY DESIGN (owner spec):
 *   1. Ask Verbly — templated, ephemeral (clears after 24h), no LLM anywhere.
 *   2. Notes from your SLP — the existing slp_notes channel, permanent,
 *      one-way (SLP → caregiver; replies happen outside the app).
 * Explicitly NOT here: free-text AI chat, two-way messaging, read-states.
 */
export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: slpSelf } = await supabase.from("slps").select("id").eq("id", user.id).maybeSingle();
  if (slpSelf) redirect("/slp");

  const { data: children } = await supabase
    .from("children")
    .select("id, name")
    .order("created_at", { ascending: true });
  const kids = children ?? [];
  const childName = new Map(kids.map((c) => [c.id, c.name]));

  // Notes surface — only meaningful when at least one child is SLP-linked.
  const { data: links } = await supabase.from("slp_child_links").select("slp_id, child_id");
  const linked = (links ?? []).length > 0;

  let notes: {
    id: string;
    child_id: string;
    slp_id: string;
    body: string;
    session_instance_id: string | null;
    created_at: string;
  }[] = [];
  const slpName = new Map<string, string>();
  const sessionLabel = new Map<string, string>();
  if (linked) {
    const { data } = await supabase
      .from("slp_notes")
      .select("id, child_id, slp_id, body, session_instance_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    notes = data ?? [];

    const admin = createAdminClient();
    const slpIds = [...new Set(notes.map((n) => n.slp_id).concat((links ?? []).map((l) => l.slp_id)))];
    if (slpIds.length > 0) {
      const { data: slps } = await admin.from("slps").select("id, full_name").in("id", slpIds);
      for (const s of slps ?? []) slpName.set(s.id, s.full_name ?? "Your SLP");
    }

    // Session anchors → "P4 · S2 on 12 Aug" labels.
    const anchoredIds = [...new Set(notes.map((n) => n.session_instance_id).filter(Boolean))] as string[];
    if (anchoredIds.length > 0) {
      const { data: instances } = await supabase
        .from("session_instances")
        .select("id, session_id, completed_at")
        .in("id", anchoredIds);
      const csIds = [...new Set((instances ?? []).map((i) => i.session_id))];
      const meta = new Map<string, { phase_number: number; session_number: number }>();
      if (csIds.length > 0) {
        const { data: cs } = await supabase
          .schema("curriculum_content")
          .from("sessions")
          .select("id, phase_number, session_number")
          .in("id", csIds);
        for (const s of cs ?? []) meta.set(s.id, s);
      }
      for (const i of instances ?? []) {
        const m = meta.get(i.session_id);
        sessionLabel.set(
          i.id,
          `${m ? `Phase ${m.phase_number}, Session ${m.session_number}` : "a session"}${i.completed_at ? ` on ${formatDate(i.completed_at)}` : ""}`,
        );
      }
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>

      <AskVerbly childOptions={kids.map((c) => ({ id: c.id, name: c.name }))} />

      {linked ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes from your SLP</CardTitle>
            <CardDescription>
              Professional guidance, kept permanently with your child&apos;s record. To reply, reach your SLP the way
              you usually do outside the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nothing yet — notes your SLP writes will appear here.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-lg border px-3 py-2">
                    <p className="text-sm whitespace-pre-line">{n.body}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {slpName.get(n.slp_id) ?? "Your SLP"} · about {childName.get(n.child_id) ?? "your child"}
                      {n.session_instance_id && sessionLabel.get(n.session_instance_id)
                        ? ` · ${sessionLabel.get(n.session_instance_id)}`
                        : ""}{" "}
                      · {formatDate(n.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground text-sm">
          Notes from a speech-language pathologist will appear here once you&apos;re connected with one — you can
          invite yours from your child&apos;s page.
        </p>
      )}
    </div>
  );
}
