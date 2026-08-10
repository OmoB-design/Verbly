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

/** Only ever redirect within the app — an invite flow passes e.g. /invite/<token>. */
function safeNext(formData: FormData): string {
  const next = String(formData.get("next") ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

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
  redirect(safeNext(formData));
}

export async function signup(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  // The SLP variant is opted into explicitly (toggle / ?type=slp link from an
  // invite). The handle_new_user() trigger branches on account_type to create
  // the slps row instead of a caregivers row.
  const isSlp = String(formData.get("account_type") ?? "") === "slp";

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        account_type: isSlp ? "slp" : "caregiver",
        ...(isSlp ? {} : { role: "primary" }),
        full_name: fullName || null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is enabled, the user must confirm before a session
  // exists; otherwise they're signed in immediately.
  revalidatePath("/", "layout");
  redirect(safeNext(formData));
}
