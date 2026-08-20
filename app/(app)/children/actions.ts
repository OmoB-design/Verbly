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
  if (!dobRaw) return { error: "Please enter a date of birth — it picks age-appropriate activities." };

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

  // Settings additions (owner spec 2026-08-14): languages are descriptive
  // context; second_adult_available feeds the Phase 4/5 two-adult advisory,
  // which re-evaluates live from this field wherever it's shown.
  const primaryLanguage = String(formData.get("primary_language") ?? "").trim();
  const additionalLanguages = String(formData.get("additional_languages") ?? "").trim();
  const secondAdultRaw = String(formData.get("second_adult_available") ?? "");
  const secondAdult = ["usually", "sometimes", "no"].includes(secondAdultRaw) ? secondAdultRaw : null;

  const { data: updated, error } = await supabase
    .from("children")
    .update({
      name,
      dob: dobRaw || null,
      primary_language: primaryLanguage || null,
      additional_languages: additionalLanguages || null,
      ...(secondAdult ? { second_adult_available: secondAdult } : {}),
    })
    .eq("id", childId)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!updated) return { error: "Child not found or not yours to edit." };

  revalidatePath("/dashboard");
  revalidatePath(`/children/${childId}`);
  redirect(`/children/${childId}`);
}

/** Add a helper to the child's saved roster (RLS enforces child ownership). */
export async function addParticipant(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const childId = String(formData.get("child_id") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  if (!childId || !displayName) return { error: "Please enter a name." };
  if (!["communication_partner", "physical_prompter", "peer"].includes(role)) {
    return { error: "Please choose a role." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_participants")
    .insert({ child_id: childId, display_name: displayName, role });
  if (error) return { error: error.message };

  revalidatePath(`/children/${childId}/edit`);
  return undefined;
}

/** Remove a helper from the roster. */
export async function removeParticipant(formData: FormData) {
  const id = String(formData.get("participant_id") ?? "");
  const childId = String(formData.get("child_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("saved_participants").delete().eq("id", id);
  revalidatePath(`/children/${childId}/edit`);
}
