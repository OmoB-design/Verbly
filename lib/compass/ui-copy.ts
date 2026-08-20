import { phaseName } from "./contract";
import type { ScoredDomain } from "./types";

/**
 * PRESENTATION-ONLY copy for the Communication Compass caregiver UI.
 *
 * This is NOT clinical content. Domain scoring, thresholds, phase logic, and the
 * red-flag QUESTION wording all live in the versioned `compass_content` config
 * (lib/compass/config.ts) — do not duplicate or paraphrase any of that here.
 * What lives here is the warm, non-clinical framing §11 asks for: friendly
 * section names, one-line examples under jargon-adjacent terms, and the
 * "where we'll start" language. If a string here starts to encode a clinical
 * decision, it is in the wrong file.
 *
 * §11 hard rule: the age BRACKET ('3-7' etc.) is NEVER shown to the caregiver as
 * an age label — it reads as a developmental verdict, which it is not. There is
 * deliberately no bracket-to-label map in this module.
 */

/** Friendly section label + optional one-line example (§11 illustrative micro-copy). */
export const DOMAIN_UI: Record<ScoredDomain | "oral_motor", { label: string; hint?: string }> = {
  receptive_language: { label: "Understanding", hint: "following what others say" },
  expressive_language: { label: "Talking", hint: "using words and putting them together" },
  speech_sound: { label: "Speech sounds", hint: "how clearly the words come out" },
  social_communication: { label: "Connecting", hint: "sharing attention and taking interest in others" },
  functional_communication: { label: "Getting needs met", hint: "letting you know what they want" },
  play_shared_activity: { label: "Play", hint: "using toys and playing alongside others" },
  learning_readiness: { label: "Staying with it", hint: "keeping focus on an activity with you" },
  oral_motor: { label: "Eating and mouth", hint: "chewing, swallowing, and mouth movements" },
};

export function domainLabel(d: ScoredDomain | "oral_motor"): string {
  return DOMAIN_UI[d]?.label ?? d;
}

/**
 * §7.5 referral message, verbatim. Shown — visually separated from the score
 * summary (§11) — whenever any hard flag is present. `{child}` is substituted.
 * Fixed product copy, not a tunable clinical value.
 */
export const REFERRAL_MESSAGE_TEMPLATE =
  "Some of what you shared is worth discussing with an SLP or your pediatrician soon. We'll still get {child} started with personalized activities today, and this is something to bring up alongside that.";

export function referralMessage(childName: string): string {
  return REFERRAL_MESSAGE_TEMPLATE.replaceAll("{child}", childName);
}

/** "Where we'll start" framing for a phase — never "your child's level" (§11). */
export function startingPhaseHeadline(childName: string, phase: number): string {
  return `Where we'll start ${childName}: ${phaseName(phase)}`;
}

/**
 * Non-clinical framing of the placement mode. At launch every child routes to a
 * readiness module first (intended §5.4/§14.9), so this is the string caregivers
 * will actually see; the start_directly copy is here for when thresholds are
 * calibrated later.
 *
 * Owner ruling 2026-08-09: readiness_module_first currently serves the placed
 * phase's Simplified Session as the introductory first session (see
 * /api/sessions/start). TODO(readiness-modules): dedicated 5-item readiness
 * checks are to be authored before the dissertation cohort — this copy and the
 * ease-in behaviour are the interim, not a placeholder flow to build on.
 */
export function placementModeCopy(mode: "start_directly" | "readiness_module_first", childName: string): string {
  return mode === "readiness_module_first"
    ? `We'll start with an introductory session to see how ${childName} settles in.`
    : `${childName} is ready to begin this phase directly.`;
}

/** Shown when start_in_simplified is set (§6.8). */
export function simplifiedCopy(childName: string): string {
  return `We'll begin with a gentler, shorter version of each activity and build up as ${childName} settles in.`;
}

/** Shown when two_adult_advisory is set (§6.7). */
export function twoAdultCopy(): string {
  return "This phase works best with a second person to help — one to guide, one to be the communication partner. A family member or friend in the room is perfect; they don't need their own account.";
}

/** Intro before the assessment: 3 lines — what it is, how long, what you get
 *  (owner text-reduction ruling). Nothing else before the first question. */
export const INTRO_COPY = {
  title: "The Communication Compass",
  lede: "A few questions about how your child communicates day to day — about ten minutes.",
  reassurance: "You'll get a personalised starting point for practice — not a test result or a diagnosis.",
};
