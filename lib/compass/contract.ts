/**
 * §13 Curriculum Alignment Contract — the single source of truth for values
 * shared between the Compass and the curriculum/RL. Blueprint v2.1.0.
 *
 * NOTE: the RL engine currently keeps its own copies of PASS_MARK (advancement.ts)
 * and the transition gates (age-bracket.ts). §13 asks for one module; unifying
 * those into this file is a follow-up once the Compass endpoints land — flagged
 * so it isn't forgotten. For now this is the Compass-side authority.
 */

export const CURRICULUM_VERSION = "2026.07-r2";
export const COMPASS_SCHEMA_VERSION = "2.1.0";

// §13.1 progression constants (owned by the curriculum).
export const PASS_MARK_PERCENT = 75;
export const PASS_WINDOW_SESSIONS = 3;

// §1 / §13.3 age brackets — the ONE age scheme (drives item set AND activity variant).
export const AGE_BRACKETS = ["3-7", "8-12", "10-14"] as const;
export type AgeBracket = (typeof AGE_BRACKETS)[number];

export const SUPPORTED_AGE_MIN_MONTHS = 36; // 3;0
export const SUPPORTED_AGE_MAX_MONTHS = 179; // 14;11 (≥180 is out of range)

/** §13.3 deterministic, non-overlapping onboarding assignment from chronological age. */
export function assignBracket(ageMonths: number): AgeBracket | null {
  if (ageMonths < SUPPORTED_AGE_MIN_MONTHS || ageMonths > SUPPORTED_AGE_MAX_MONTHS) return null;
  if (ageMonths <= 95) return "3-7"; // 36–95
  if (ageMonths <= 155) return "8-12"; // 96–155
  return "10-14"; // 156–179
}

/** §13.4 chronological age floor for the NEXT bracket (promotion cap), in months. */
export const AGE_FLOOR_NEXT_BRACKET_MONTHS: Record<AgeBracket, number | null> = {
  "3-7": 84, // → 8-12 at age 7;0
  "8-12": 108, // → 10-14 at age 9;0
  "10-14": null, // terminal
};

// §13.2 canonical phase names (phase_number is the only key; PECS labels are display-only).
export const PHASE_NAMES: Record<number, string> = {
  1: "Joint Attention Activities",
  2: "Imitation Training",
  3: "Oral Motor Exercises",
  4: "PECS Phase 1: How to Communicate",
  5: "PECS Phase 2: Distance and Persistence",
  6: "PECS Phase 3: Picture Discrimination",
  7: "PECS Phase 4: Sentence Structure",
  8: "PECS Phase 5: Responsive Requesting",
  9: "PECS Phase 6: Commenting",
  10: "Turn-Taking and Social Interaction Games",
  11: "Functional Communication in Daily Routines",
  12: "Vocal Approximation and Sound Shaping",
};

export function phaseName(phase: number): string {
  return PHASE_NAMES[phase] ?? `Phase ${phase}`;
}
