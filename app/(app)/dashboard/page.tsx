import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatAge, formatDate } from "@/lib/format";

/**
 * Caregiver home. Lists the caregiver's children (RLS-scoped — no app-side
 * ownership filter) with each child's current phase. Session runtime + Compass
 * live behind the child detail page in later slices.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: children, error } = await supabase
    .from("children")
    .select("id, name, dob, current_phase_id, created_at")
    .order("created_at", { ascending: true });

  const phaseIds = [...new Set((children ?? []).map((c) => c.current_phase_id).filter(Boolean))];
  const phaseById = new Map<string, { phase_number: number; name: string }>();
  if (phaseIds.length > 0) {
    const { data: phases } = await supabase
      .schema("curriculum_content")
      .from("phases")
      .select("id, phase_number, name")
      .in("id", phaseIds as string[]);
    for (const p of phases ?? []) phaseById.set(p.id, { phase_number: p.phase_number, name: p.name });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your children</h1>
        <Button asChild className="h-11 px-5">
          <Link href="/children/new">Add a child</Link>
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load children: {error.message}
        </p>
      ) : null}

      {children && children.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {children.map((child) => {
            const phase = child.current_phase_id ? phaseById.get(child.current_phase_id) : undefined;
            return (
              <li key={child.id}>
                <Link
                  href={`/children/${child.id}`}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <Card className="transition-colors hover:bg-accent/40">
                    <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                      <CardTitle className="text-lg">{child.name}</CardTitle>
                      {phase ? (
                        <Badge variant="secondary">Phase {phase.phase_number}</Badge>
                      ) : (
                        <Badge variant="outline">Not started</Badge>
                      )}
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {phase ? phase.name : "No phase yet"}
                      {child.dob ? (
                        <span className="block">
                          Age: {formatAge(child.dob)} · Born {formatDate(child.dob)}
                        </span>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <p className="text-muted-foreground">
              No children added yet. Add one to get started — it only takes a moment.
            </p>
            <Button asChild className="h-11 px-5">
              <Link href="/children/new">Add a child</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
