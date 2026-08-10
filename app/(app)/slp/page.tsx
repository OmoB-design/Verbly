import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatAge, formatDate } from "@/lib/format";

/**
 * SLP caseload. Every query here rides RLS — an SLP's client only returns the
 * children a caregiver has linked them to, and revocation empties this page
 * instantly. Read-only surface.
 */
export default async function SlpCaseloadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: slp } = await supabase.from("slps").select("id, full_name").eq("id", user.id).maybeSingle();
  if (!slp) redirect("/dashboard");

  const { data: children } = await supabase
    .from("children")
    .select("id, name, dob, current_phase_id")
    .order("name", { ascending: true });

  const kids = children ?? [];
  const phaseIds = [...new Set(kids.map((c) => c.current_phase_id).filter(Boolean))] as string[];
  const phaseById = new Map<string, { phase_number: number; name: string }>();
  if (phaseIds.length > 0) {
    const { data: phases } = await supabase
      .schema("curriculum_content")
      .from("phases")
      .select("id, phase_number, name")
      .in("id", phaseIds);
    for (const p of phases ?? []) phaseById.set(p.id, p);
  }

  // Attention signals + last activity, assembled per child from RLS-scoped reads.
  const rows = await Promise.all(
    kids.map(async (c) => {
      const [{ data: lastSession }, { data: assessment }, { data: advisories }] = await Promise.all([
        supabase
          .from("session_instances")
          .select("completed_at, score_percent")
          .eq("child_id", c.id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("assessments")
          .select("referral_recommended, red_flags")
          .eq("child_id", c.id)
          .eq("status", "scored")
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("session_instances")
          .select("downward_advisory")
          .eq("child_id", c.id)
          .not("downward_advisory", "is", null)
          .order("completed_at", { ascending: false })
          .limit(3),
      ]);
      const hardFlags = ((assessment?.red_flags as { hard?: string[] } | null)?.hard ?? []).length;
      const advisoryActive = (advisories ?? []).some(
        (a) => (a.downward_advisory as { advise?: boolean } | null)?.advise === true,
      );
      const attention: string[] = [];
      if (assessment?.referral_recommended) attention.push("Referral recommended");
      else if (hardFlags > 0) attention.push("Red flags");
      if (advisoryActive) attention.push("Activity advisory");
      return { child: c, lastSession, attention };
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Caseload</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Children whose families have shared their Verbly records with you. Read-only; your notes are always visible
          to the family.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">No children linked yet</CardTitle>
            <CardDescription>
              Access starts with the family: a caregiver creates an invite link from their child&apos;s page and shares
              it with you. Once you accept, the child appears here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Current phase</TableHead>
                  <TableHead>Last session</TableHead>
                  <TableHead>Attention</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ child, lastSession, attention }) => {
                  const phase = child.current_phase_id ? phaseById.get(child.current_phase_id) : null;
                  return (
                    <TableRow key={child.id}>
                      <TableCell>
                        <Link
                          href={`/slp/children/${child.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {child.name}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{child.dob ? formatAge(child.dob) : "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {phase ? `Phase ${phase.phase_number} — ${phase.name}` : "Not placed yet"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {lastSession?.completed_at
                          ? `${formatDate(lastSession.completed_at)}${
                              lastSession.score_percent !== null ? ` · ${lastSession.score_percent}%` : ""
                            }`
                          : "None yet"}
                      </TableCell>
                      <TableCell>
                        {attention.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {attention.map((a) => (
                              <Badge key={a} variant="outline" className="border-amber-400/60 text-amber-700 dark:text-amber-300">
                                {a}
                              </Badge>
                            ))}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Verbly&apos;s Compass and session scores are screening and placement signals, not validated clinical measures.
      </p>
    </div>
  );
}
