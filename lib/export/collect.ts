import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * "Download my data" — the single data-collection layer behind both formats
 * (PDF for reading, JSON for machine portability). Every query runs through
 * the caller's OWN session so RLS guarantees the export holds exactly what the
 * caregiver can already see. Audio isn't embedded (never public); the
 * vocalization metadata references it.
 */

export interface ExportData {
  exported_at: string;
  note: string;
  account: {
    email: string | undefined;
    full_name: string | null;
    role: string | null;
    created_at: string | null;
    notification_frequency: string | null;
  };
  children: ChildExport[];
}

export interface ChildExport {
  profile: {
    id: string;
    name: string;
    dob: string | null;
    age_bracket: string | null;
    primary_language: string | null;
    additional_languages: string | null;
    second_adult_available: string | null;
    created_at: string;
  };
  assessments: Record<string, unknown>[];
  readiness_checks: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  phase_history: Record<string, unknown>[];
  vocalizations: Record<string, unknown>[];
  slp_notes: Record<string, unknown>[];
  saved_participants: Record<string, unknown>[];
}

export async function collectExport(supabase: SupabaseClient, user: User): Promise<ExportData> {
  const [{ data: caregiver }, { data: prefs }, { data: children }] = await Promise.all([
    supabase.from("caregivers").select("full_name, role, created_at").eq("id", user.id).maybeSingle(),
    supabase.from("notification_preferences").select("frequency").eq("caregiver_id", user.id).maybeSingle(),
    supabase
      .from("children")
      .select(
        "id, name, dob, age_bracket, primary_language, additional_languages, second_adult_available, created_at",
      )
      .order("created_at", { ascending: true }),
  ]);

  const childExports: ChildExport[] = await Promise.all(
    (children ?? []).map(async (child) => {
      const [assessments, readiness, sessions, phaseHistory, vocalizations, notes, participants] =
        await Promise.all([
          supabase
            .from("assessments")
            .select(
              "status, completed_at, age_months_at_assessment, compass_overall_score, confidence, compass_domain_scores, recommended_phase, starting_phase, placement_source, placement_mode, red_flags, referral_recommended, concern_text, suggested_reassessment_interval, schema_version, curriculum_version, created_at",
            )
            .eq("child_id", child.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("readiness_check_results")
            .select("phase_number, answers, yes_count, passed, hard_item_flagged, flag_phrase, created_at")
            .eq("child_id", child.id),
          supabase
            .from("session_instances")
            .select("started_at, completed_at, score_percent, outcome, ran_simplified, age_bracket, content_version")
            .eq("child_id", child.id)
            .order("started_at", { ascending: true }),
          supabase
            .from("phase_history")
            .select("trigger_reason, entered_at, age_bracket, content_version")
            .eq("child_id", child.id)
            .order("entered_at", { ascending: true }),
          supabase
            .from("vocalization_logs")
            .select("sound_produced, spontaneity, target_sound, context_tag, recorded_at")
            .eq("child_id", child.id)
            .order("recorded_at", { ascending: true }),
          supabase
            .from("slp_notes")
            .select("body, created_at")
            .eq("child_id", child.id)
            .order("created_at", { ascending: true }),
          supabase.from("saved_participants").select("display_name, role").eq("child_id", child.id),
        ]);
      return {
        profile: child,
        assessments: assessments.data ?? [],
        readiness_checks: readiness.data ?? [],
        sessions: sessions.data ?? [],
        phase_history: phaseHistory.data ?? [],
        vocalizations: vocalizations.data ?? [],
        slp_notes: notes.data ?? [],
        saved_participants: participants.data ?? [],
      };
    }),
  );

  return {
    exported_at: new Date().toISOString(),
    note: "Verbly data export. The Communication Compass is a screening and placement tool, not a validated clinical measure or a diagnosis.",
    account: {
      email: user.email,
      full_name: caregiver?.full_name ?? null,
      role: caregiver?.role ?? null,
      created_at: caregiver?.created_at ?? null,
      notification_frequency: prefs?.frequency ?? null,
    },
    children: childExports,
  };
}
