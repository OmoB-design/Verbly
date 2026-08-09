import { AGE_FLOOR_NEXT_BRACKET_MONTHS } from "./contract";
import {
  benchmarkAgreement,
  computeConfidence,
  computeDomainScores,
  computeOverall,
  extractStrengthsNeeds,
} from "./scoring";
import { buildReasoning, computePlacementMode, mapPhase } from "./phase-mapper";
import { computeOralMotorFlags, detectRedFlags } from "./red-flags";
import type { AssessmentInput, CompassConfig, CompassResult } from "./types";

/**
 * Full Compass scoring pass → the §8 (v2.1.0) output payload. Deterministic and
 * pure; the caller loads the versioned config (compass_content), checks the age
 * range via assignBracket() BEFORE calling this (out-of-range → §1 exit), and
 * persists the result. Caregiver override (§6.5) is applied by its own endpoint,
 * which sets starting_phase/placement_source — the engine always emits
 * placement_source "engine" with starting_phase = recommended_phase.
 */
export function assess(input: AssessmentInput, config: CompassConfig, childName: string): CompassResult {
  const { adjusted } = computeDomainScores(input, config);
  const overall = computeOverall(adjusted, config);
  const { confidence } = computeConfidence(input, adjusted, config);
  const { strengths, needs } = extractStrengthsNeeds(adjusted, config);

  const oralMotorFlags = computeOralMotorFlags(input, config);
  const candidate = mapPhase(adjusted, oralMotorFlags.length > 0, config);
  const placementMode = computePlacementMode(candidate, confidence, config);
  const reasoning = buildReasoning(childName, candidate, adjusted, strengths, needs, config);
  const redFlags = detectRedFlags(input, adjusted, config);

  const agreement = benchmarkAgreement(adjusted, input, config);

  // §6.7 two-adult advisory: PECS 1/2 (phases 4,5) need a second person.
  const secondAdult = input.secondAdultAvailable ?? "usually";
  const twoAdultAdvisory = (candidate.phase === 4 || candidate.phase === 5) && secondAdult === "no";

  // §6.8 simplified-session entry: engagement-duration item answered very short.
  const engagementAnswer = input.responses[config.engagementDurationItemId];
  const startInSimplified = engagementAnswer !== undefined && config.engagementSimplifiedValues.includes(engagementAnswer);

  return {
    child_id: input.childId,
    age_months_at_assessment: input.ageMonths,
    age_bracket: input.ageBracket,
    age_floor_next_bracket_months: AGE_FLOOR_NEXT_BRACKET_MONTHS[input.ageBracket],
    second_adult_available: secondAdult,
    compass_overall_score: overall,
    confidence,
    compass_domain_scores: adjusted,
    oral_motor_flags: oralMotorFlags,
    benchmark_crosscheck: {
      expected_for_bracket: agreement.expected,
      observed: agreement.observed,
      consistent_with_domain_scores: agreement.rate === null ? true : agreement.rate >= 0.5,
    },
    recommended_phase: candidate.phase,
    starting_phase: candidate.phase, // override endpoint may change this later
    placement_source: "engine",
    placement_mode: placementMode,
    start_in_simplified: startInSimplified,
    two_adult_advisory: twoAdultAdvisory,
    reasoning,
    strengths,
    needs,
    red_flags: { hard: redFlags.hard, soft: redFlags.soft },
    referral_recommended: redFlags.referralRecommended,
    suggested_reassessment_interval: "6 weeks", // §14.8: phase-aware interval is a later refinement
    schema_version: config.schemaVersion,
    curriculum_version: config.curriculumVersion,
  };
}
