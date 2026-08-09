"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** Update the caregiver's email notification frequency. RLS scopes the update
 *  to the caller's own preferences row. */
export async function updateFrequency(formData: FormData) {
  const frequency = String(formData.get("frequency") ?? "");
  if (!["daily", "weekly", "off"].includes(frequency)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notification_preferences")
    .update({ frequency, updated_at: new Date().toISOString() })
    .eq("caregiver_id", user.id);

  revalidatePath("/settings");
}
