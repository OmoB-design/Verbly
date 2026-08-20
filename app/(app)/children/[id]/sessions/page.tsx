import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatDate, outcomeLabel } from "@/lib/format";
import { PhaseChip } from "@/components/phase-identity";

/** Full session history for a child (linked from the child page's Recent sessions card). */
export default async function ChildSessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: child } = await supabase.from("children").select("id, name").eq("id", id).maybeSingle();
  if (!child) notFound();

  const { data: sessions } = await supabase
    .from("session_instances")
    .select("id, session_id, score_percent, outcome, ran_simplified, started_at, completed_at")
    .eq("child_id", id)
    .order("started_at", { ascending: false })
    .limit(200);

  const sessionIds = [...new Set((sessions ?? []).map((s) => s.session_id))];
  const meta = new Map<string, { phase_number: number; session_number: number }>();
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .schema("curriculum_content")
      .from("sessions")
      .select("id, phase_number, session_number")
      .in("id", sessionIds);
    for (const s of data ?? []) meta.set(s.id, s);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href={`/children/${id}`}>← Back to {child.name}</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{child.name}&apos;s sessions</h1>
        <p className="text-muted-foreground mt-1 text-sm">Every practice session, newest first.</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          {(sessions ?? []).length === 0 ? (
            <p className="text-muted-foreground py-4 text-sm">No sessions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sessions ?? []).map((s) => {
                  const m = meta.get(s.session_id);
                  const o = outcomeLabel(s.outcome);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(s.completed_at ?? s.started_at)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          {m ? <PhaseChip phase={m.phase_number} /> : null}
                          <span>Session {m?.session_number ?? "—"}</span>
                          {s.ran_simplified ? (
                            <span className="text-muted-foreground text-xs">gentler version</span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {s.score_percent !== null ? `${s.score_percent}%` : s.completed_at ? "—" : "not finished"}
                      </TableCell>
                      <TableCell>{s.completed_at ? <Badge variant={o.variant}>{o.text}</Badge> : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
