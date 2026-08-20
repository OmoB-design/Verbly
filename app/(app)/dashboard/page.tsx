import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatAge, formatDate } from "@/lib/format";
import { CHILD_PROFILE_CAP } from "@/lib/limits";
import { PhaseChip, PhaseIconBubble } from "@/components/phase-identity";

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

  // SLP accounts have a caseload, not a caregiver dashboard.
  const { data: slp } = await supabase.from("slps").select("id").eq("id", user.id).maybeSingle();
  if (slp) redirect("/slp");

  const { data: me } = await supabase.from("caregivers").select("full_name").eq("id", user.id).maybeSingle();
  const firstName = (me?.full_name ?? "").trim().split(/\s+/)[0] || null;

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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {firstName ? `Welcome, ${firstName}` : "Welcome"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Your children</p>
        </div>
        {(children ?? []).length < CHILD_PROFILE_CAP ? (
          <Button asChild className="h-11 px-5">
            <Link href="/children/new">Add a child</Link>
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Profile limit reached ({CHILD_PROFILE_CAP} children per account)
          </p>
        )}
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
                  <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <CardHeader className="flex-row items-center gap-3 space-y-0">
                      {phase ? (
                        <PhaseIconBubble phase={phase.phase_number} size="lg" />
                      ) : (
                        <span className="bg-secondary text-secondary-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold" aria-hidden>
                          {child.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <CardTitle className="text-lg">{child.name}</CardTitle>
                        {phase ? (
                          <PhaseChip phase={phase.phase_number} className="mt-1" />
                        ) : (
                          <Badge variant="outline" className="mt-1">Ready to begin</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {phase ? phase.name : "Start with the Communication Compass"}
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
            <p className="text-xs text-muted-foreground">Your account can hold up to 5 child profiles.</p>
            <Button asChild className="h-11 px-5">
              <Link href="/children/new">Add a child</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
