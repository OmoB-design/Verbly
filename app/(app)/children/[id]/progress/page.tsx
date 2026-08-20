import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate, triggerReasonLabel } from "@/lib/format";
import { PhaseChip } from "@/components/phase-identity";

/** Full progress history — the child's complete phase audit trail. */
export default async function ChildProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: child } = await supabase.from("children").select("id, name").eq("id", id).maybeSingle();
  if (!child) notFound();

  const { data: history } = await supabase
    .from("phase_history")
    .select("id, phase_id, trigger_reason, entered_at, age_bracket")
    .eq("child_id", id)
    .order("entered_at", { ascending: false });

  const phaseIds = [...new Set((history ?? []).map((h) => h.phase_id))];
  const phaseById = new Map<string, { phase_number: number; name: string }>();
  if (phaseIds.length > 0) {
    const { data } = await supabase
      .schema("curriculum_content")
      .from("phases")
      .select("id, phase_number, name")
      .in("id", phaseIds);
    for (const p of data ?? []) phaseById.set(p.id, p);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href={`/children/${id}`}>← Back to {child.name}</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{child.name}&apos;s progress</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every change to {child.name}&apos;s phase, newest first — and why it happened.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          {(history ?? []).length === 0 ? (
            <p className="text-muted-foreground py-4 text-sm">No phase changes recorded yet.</p>
          ) : (
            <ol className="flex flex-col">
              {(history ?? []).map((h, i) => {
                const p = phaseById.get(h.phase_id);
                return (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-3 border-b py-3 last:border-0 last:pb-0 first:pt-0"
                  >
                    <span className="flex min-w-0 flex-col gap-1 text-sm">
                      <span className="flex flex-wrap items-center gap-2">
                        {p ? <PhaseChip phase={p.phase_number} /> : <span>Phase —</span>}
                        <span className="font-medium">{p?.name ?? ""}</span>
                        {i === 0 ? <Badge variant="secondary">current</Badge> : null}
                      </span>
                      <span className="text-muted-foreground text-xs">{formatDate(h.entered_at)}</span>
                    </span>
                    <Badge variant="outline">{triggerReasonLabel(h.trigger_reason)}</Badge>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
