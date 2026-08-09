/**
 * Communication Compass — engine types. Blueprint v2.1.0.
 *
 * Deterministic rules engine (CLAUDE.md), not ML. Consumes a versioned config
 * (the compass_content payload) + raw caregiver responses; produces the §8
 * payload. All clinical numbers live in the config; naming follows the
 * `compass_` convention (§5, C5) — the curriculum's per-session `score_percent`
 * is a different number and never mixes with these.
 */

import type { AgeBracket } from "./contract";

export type { AgeBracket } from "./contract";

// §8 / C5: play → play_shared_activity.
export const SCORED_DOMAINS = [
  "receptive_language",
  "expressive_language",
  "speech_sound",
  "social_communication",
  "functional_communication",
  "play_shared_activity",
  "learning_readiness",
] as const;
export type ScoredDomain = (typeof SCORED_DOMAINS)[number];
export type DomainScores = Record<ScoredDomain, number>;

export type SecondAdult = "usually" | "sometimes" | "no";
export type PlacementMode = "start_directly" | "readiness_module_first";
export type PlacementSource = "engine" | "caregiver_override";

/** A scored item. `points` maps each response value → 0–4 (§5.1). */
export interface CompassItem {
  id: string; // e.g. "REC-B1-04" (B1=3-7, B2=8-12, B3=10-14)
  domain: ScoredDomain | "oral_motor";
  brackets: (AgeBracket | "ALL")[];
  prompt: string;
  points: Record<string, number>;
}

/** §3.9 / §5.4 functional-benchmark item — a cross-check proxy for one domain. */
export interface BenchmarkItem {
  id: string;
  brackets: (AgeBracket | "ALL")[];
  prompt: string;
  predictedDomain: ScoredDomain; // §5.4 predicted_domain(b)
  threshold: number; // §5.4 threshold(b), 0–100, PROVISIONAL
}

export type RedFlagClass = "age_invariant" | "developmental_history" | "older_child";
export interface RedFlagDef {
  code: string;
  class: RedFlagClass;
  brackets: (AgeBracket | "ALL")[]; // older_child flags only apply to 8-12/10-14
  /** Caregiver-facing question (§7). "Yes" = the concerning state is present.
   *  `free_text_concern` has no checklist prompt — it is driven by the dedicated
   *  free-text concern question, so its prompt is empty. */
  prompt: string;
}

export interface CompassConfig {
  schemaVersion: string; // "2.1.0"
  curriculumVersion: string;
  domainWeights: Record<ScoredDomain, number>; // §5.3
  ageWeightFactors: Record<ScoredDomain, Record<AgeBracket, number>>; // §5.2 (1.000 at launch)
  phaseThresholds: PhaseThresholds; // §6
  /** §5.4: false at launch → force the n<4 path so no child gets start_directly
   *  on an uncalibrated consistency term. */
  benchmarkThresholdsCalibrated: boolean;
  reasoning: { primary: string; strength: string; need: string };
  redFlagDefs: RedFlagDef[];
  items: CompassItem[];
  benchmarkItems: BenchmarkItem[];
  /** Item id of the §3.7 engagement-duration item that drives start_in_simplified. */
  engagementDurationItemId: string;
  /** Response values on that item that trigger start_in_simplified (§6.8). */
  engagementSimplifiedValues: string[];
}

export interface PhaseThresholds {
  speechSoundP3Max: number;
  socialP1Max: number;
  learningP2Max: number;
  functionalP4Max: number;
  functionalP5: [number, number];
  functionalP6Min: number;
  receptiveP6: [number, number];
  expressiveP7: [number, number];
  receptiveP8Min: number;
  socialP8: [number, number];
  expressiveP9Min: number;
  socialP10Min: number;
  expressiveP10Min: number;
  functionalP11Min: number;
  expressiveP11Min: number;
  speechP12Max: number;
  otherDomainsMinForP12: number;
  strengthMin: number;
  needMax: number;
  confidenceDirectMin: number; // 0.75
  confidenceSupplementMin: number; // 0.60
  placementGapPoints: number; // 10
}

/** Raw engine input, assembled by the caller from stored responses. */
export interface AssessmentInput {
  childId: string;
  ageMonths: number;
  ageBracket: AgeBracket;
  responses: Record<string, string>; // itemId → chosen value
  itemsTotal: number; // applicable items for completeness (§5.4)
  benchmarkAnswers?: Record<string, boolean>; // benchmarkItemId → yes/no
  secondAdultAvailable?: SecondAdult;
  redFlagAnswers?: Record<string, boolean>; // flag code → present?
  freeTextConcern?: boolean;
  now?: number;
}

/** §8 v2.1.0 output payload (the full object is stored in raw_payload). */
export interface CompassResult {
  child_id: string;
  age_months_at_assessment: number;
  age_bracket: AgeBracket;
  age_floor_next_bracket_months: number | null;
  second_adult_available: SecondAdult;
  compass_overall_score: number;
  confidence: number;
  compass_domain_scores: DomainScores;
  oral_motor_flags: string[];
  benchmark_crosscheck: {
    expected_for_bracket: number;
    observed: number;
    consistent_with_domain_scores: boolean;
  };
  recommended_phase: number;
  starting_phase: number;
  placement_source: PlacementSource;
  placement_mode: PlacementMode;
  start_in_simplified: boolean;
  two_adult_advisory: boolean;
  reasoning: string[];
  strengths: ScoredDomain[];
  needs: ScoredDomain[];
  red_flags: { hard: string[]; soft: string[] };
  referral_recommended: boolean;
  suggested_reassessment_interval: string;
  schema_version: string;
  curriculum_version: string;
}
