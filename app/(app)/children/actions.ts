"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type ActionState = { error: string } | undefined;

/**
 * Create a child profile. Direct insert into `children` with
 * primary_caregiver_id = the current caregiver (see API.md → Children). RLS
 * enforces that a caregiver can only insert a child owned by themselves. No SLP
 * approval or link is required; child creation is always self-serve.
 */
export async function createChild(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const dobRaw = String(formData.get("dob") ?? "").trim();

  if (!name) {
    return { error: "Please enter the child's name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("children").insert({
    primary_caregiver_id: user.id,
    name,
    dob: dobRaw || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
