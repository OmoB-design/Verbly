import type { SessionScript } from "@/lib/engine/session-script";

/**
 * Curriculum seed shapes — the reviewable, versioned form of the 12-phase
 * clinical content before it is seeded into curriculum_content.phases/.sessions.
 *
 * CONTENT GOVERNANCE (CLAUDE.md): files under content/curriculum/ are CLINICAL
 * CONTENT transcribed from the source curriculum document
 * (therapy_Exercises_12_phases_with_Simplified_Sections_2.docx). They are
 * reviewed like code before seeding. Transcription rules:
 *   • wording is carried over verbatim wherever the source gives it;
 *   • anywhere the source describes behaviour without exact UI wording, the
 *     derived text is marked with a `FLAG(review)` comment for the owner;
 *   • nothing is "improved" or rephrased silently.
 */

export type SeedBracket = "3-7" | "8-12" | "10-14" | null;

export interface SessionSeed {
  session_number: number;
  /** §13.3 bracket this variant is written for; null = applies to all brackets. */
  age_bracket: SeedBracket;
  script: SessionScript;
}

export interface PhaseSeed {
  phase_number: number;
  /** Must match §13.2 canonical phase names (lib/compass/contract.ts). */
  name: string;
  clinical_goal: string;
  /** F6 ruling: caregiver-facing Progress Indicators + Therapy Tips, verbatim,
   *  as markdown/plain text. Display-only — never consumed by the RL engine. */
  phase_guidance?: string;
  has_simplified_session: boolean;
  content_version: number;
  sessions: SessionSeed[];
}
