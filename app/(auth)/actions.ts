"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Auth server actions. All auth is handled by Supabase Auth directly (see
 * API.md → Auth); the caregivers/slps profile row is created by a Postgres
 * trigger on auth.users insert (see supabase/migrations), tagged by the
 * account_type/role passed in signup metadata — we never insert the profile
 * row from the client.
 */

type ActionState = { error: string } | undefined;

export async function login(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by the handle_new_user() trigger to create the correct profile
      // row. This initial scaffold only creates caregiver (primary) accounts;
      // SLP accounts and secondary caregivers are provisioned later.
      data: {
        account_type: "caregiver",
        role: "primary",
        full_name: fullName || null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is enabled, the caregiver must confirm before a
  // session exists; otherwise they're signed in immediately.
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
