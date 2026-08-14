"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CHILD_PROFILE_CAP } from "@/lib/limits";

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

  // Profile cap (owner ruling 2026-08-14): friendly check here; the DB trigger
  // (migration 019) is the enforcement that can't be bypassed.
  const { count } = await supabase
    .from("children")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= CHILD_PROFILE_CAP) {
    return {
      error: `Your account has reached the limit of ${CHILD_PROFILE_CAP} child profiles. To add another child, remove a profile you no longer need first.`,
    };
  }

  const { error } = await supabase.from("children").insert({
    primary_caregiver_id: user.id,
    name,
    dob: dobRaw || null,
  });

  if (error) {
    return {
      error: error.message.includes("profile limit")
        ? `Your account has reached the limit of ${CHILD_PROFILE_CAP} child profiles.`
        : error.message,
    };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/**
 * Edit a child's profile (name, DOB). RLS's `children update own` policy is
 * the enforcement — the update runs under the caller's own session, so a
 * non-owner's update simply matches zero rows. Correcting a DOB deliberately
 * does NOT rewrite history: the assigned age bracket and any Compass placement
 * stay as assessed (versioned data is immutable against later edits); future
 * computations (age display, Compass age checks, age floors) use the new DOB
 * automatically.
 */
export async function updateChild(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const childId = String(formData.get("child_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const dobRaw = String(formData.get("dob") ?? "").trim();

  if (!childId) return { error: "Missing child id." };
  if (!name) return { error: "Please enter the child's name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: updated, error } = await supabase
    .from("children")
    .update({ name, dob: dobRaw || null })
    .eq("id", childId)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!updated) return { error: "Child not found or not yours to edit." };

  revalidatePath("/dashboard");
  revalidatePath(`/children/${childId}`);
  redirect(`/children/${childId}`);
}
