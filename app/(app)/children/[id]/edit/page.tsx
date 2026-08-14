import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { EditChildForm } from "@/components/children/edit-child-form";

/** Edit a child's profile. RLS scopes the fetch; a linked SLP can SEE a child
 *  but this page is caregiver-only (the update/delete policies enforce that
 *  regardless — this guard just keeps the page honest). */
export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: child } = await supabase
    .from("children")
    .select("id, name, dob, age_bracket, primary_caregiver_id")
    .eq("id", id)
    .maybeSingle();
  if (!child) notFound();
  if (child.primary_caregiver_id !== user.id) redirect(`/children/${id}`);

  return (
    <EditChildForm
      childId={child.id}
      initialName={child.name}
      initialDob={child.dob ?? ""}
      hasBracket={!!child.age_bracket}
    />
  );
}
