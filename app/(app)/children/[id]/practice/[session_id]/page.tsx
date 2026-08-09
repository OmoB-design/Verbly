import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SessionRunner } from "@/components/practice/session-runner";

/**
 * Session runtime entry. The server component only authorizes and passes ids —
 * the script itself is fetched by the client from POST /sessions/start, which
 * pins the content_version and decides the variant (main vs Simplified).
 */
export default async function RunSessionPage({
  params,
}: {
  params: Promise<{ id: string; session_id: string }>;
}) {
  const { id, session_id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: child } = await supabase.from("children").select("id, name").eq("id", id).maybeSingle();
  if (!child) notFound();

  // The account holder's name personalizes the "Caregiver A" role in the
  // script text (display-time only); the helper's name from setup personalizes
  // "Caregiver B".
  const { data: caregiver } = await supabase.from("caregivers").select("full_name").eq("id", user.id).maybeSingle();

  return (
    <div className="flex flex-col gap-2">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 self-start">
        <Link href={`/children/${id}/practice`}>← All activities</Link>
      </Button>
      <SessionRunner
        childId={id}
        childName={child.name}
        sessionId={session_id}
        caregiverName={caregiver?.full_name ?? null}
      />
    </div>
  );
}
