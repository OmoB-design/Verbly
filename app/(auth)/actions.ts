"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
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
  if (!fullName) return { error: "Please tell us your name." };
  // The SLP variant has its own URL (/signup/slp, linked from invites). The
  // handle_new_user() trigger branches on account_type to create the slps row
  // instead of a caregivers row.
  const isSlp = String(formData.get("account_type") ?? "") === "slp";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        account_type: isSlp ? "slp" : "caregiver",
        ...(isSlp ? {} : { role: "primary" }),
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  // Email confirmation pending → no session yet. Land on login with a clear
  // check-your-email notice instead of bouncing them there unexplained.
  if (!data.session) {
    const next = safeNext(formData);
    redirect(`/login?confirm=1${next !== "/dashboard" ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  redirect(safeNext(formData));
}

/**
 * Request a password-reset email. Always answers the same way whether or not
 * the address has an account (no account enumeration); the one error surfaced
 * is Supabase's mailer rate limit, since silence there would gaslight the
 * user. The link routes through /auth/confirm (type=recovery) → /reset-password.
 */
export async function requestPasswordReset(
  _prevState: { error?: string; sent?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; sent?: boolean } | undefined> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) return { error: "Please enter your email address." };

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? h.get("origin") ?? "http://localhost:3001";

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });
  if (error && /rate limit/i.test(error.message)) {
    return { error: "Too many reset emails just now — please wait a little while and try again." };
  }
  return { sent: true };
}

/** Set a new password (the user arrives holding the recovery session). */
export async function updatePassword(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
