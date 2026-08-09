import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CompassConfig } from "./types";

/**
 * Load the versioned Compass content (compass_content) as a CompassConfig.
 * Returns the latest schema_version's payload — content_json IS the config
 * shape (seeded from COMPASS_CONFIG_V2). Returns null if nothing is seeded.
 */
export async function loadCompassConfig(admin: SupabaseClient): Promise<CompassConfig | null> {
  const { data, error } = await admin
    .from("compass_content")
    .select("content_json")
    .order("schema_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.content_json as CompassConfig;
}

/** Whole months between a date-of-birth (YYYY-MM-DD) and now (UTC). */
export function ageInMonths(dob: string, now: Date = new Date()): number {
  const d = new Date(dob);
  let months = (now.getUTCFullYear() - d.getUTCFullYear()) * 12 + (now.getUTCMonth() - d.getUTCMonth());
  if (now.getUTCDate() < d.getUTCDate()) months -= 1;
  return months;
}
