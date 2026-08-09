import { phaseName } from "./contract";
import type { CompassConfig, DomainScores, PlacementMode, ScoredDomain } from "./types";

/** §6 Phase Recommendation Engine. Deterministic; thresholds from config. */

const DOMAIN_LABEL: Record<ScoredDomain, string> = {
  receptive_language: "understanding language",
  expressive_language: "spoken language",
  speech_sound: "speech clarity",
  social_communication: "social connection",
  functional_communication: "getting needs met",
  play_shared_activity: "play and shared activity",
  learning_readiness: "learning readiness",
};

const inRange = (x: number, [lo, hi]: [number, number]) => x >= lo && x <= hi;
const distToRange = (x: number, [lo, hi]: [number, number]) =>
  x < lo ? lo - x : x > hi ? x - hi : Math.min(x - lo, hi - x);

export interface PhaseCandidate {
  phase: number;
  driver: ScoredDomain;
  gap: number;
  elseBranch: boolean;
}

/**
 * §6.2 ELSE fallback: the phase whose entry condition is nearest to the child's
 * profile by absolute distance on its PRIMARY DRIVER domain. Ties break to the
 * LOWER phase_number. Phase 3 is only a candidate when oral-motor flags present.
 */
function elseNearestPhase(
  s: DomainScores,
  oralMotorFlagsPresent: boolean,
  t: CompassConfig["phaseThresholds"],
): PhaseCandidate {
  const candidates: { phase: number; driver: ScoredDomain; gap: number }[] = [
    { phase: 1, driver: "social_communication", gap: Math.abs(s.social_communication - t.socialP1Max) },
    { phase: 2, driver: "learning_readiness", gap: Math.abs(s.learning_readiness - t.learningP2Max) },
    { phase: 4, driver: "functional_communication", gap: Math.abs(s.functional_communication - t.functionalP4Max) },
    { phase: 5, driver: "functional_communication", gap: distToRange(s.functional_communication, t.functionalP5) },
    { phase: 6, driver: "receptive_language", gap: distToRange(s.receptive_language, t.receptiveP6) },
    { phase: 7, driver: "expressive_language", gap: distToRange(s.expressive_language, t.expressiveP7) },
    { phase: 8, driver: "receptive_language", gap: Math.abs(s.receptive_language - t.receptiveP8Min) },
    { phase: 9, driver: "expressive_language", gap: Math.abs(s.expressive_language - t.expressiveP9Min) },
    { phase: 10, driver: "social_communication", gap: Math.abs(s.social_communication - t.socialP10Min) },
    { phase: 11, driver: "functional_communication", gap: Math.abs(s.functional_communication - t.functionalP11Min) },
    { phase: 12, driver: "speech_sound", gap: Math.abs(s.speech_sound - t.speechP12Max) },
  ];
  if (oralMotorFlagsPresent) {
    candidates.push({ phase: 3, driver: "speech_sound", gap: Math.abs(s.speech_sound - t.speechSoundP3Max) });
  }
  candidates.sort((a, b) => a.gap - b.gap || a.phase - b.phase); // ties → lower phase_number
  return { ...candidates[0], elseBranch: true };
}

/** §6.2 decision tree, fixed priority order. */
export function mapPhase(
  s: DomainScores,
  oralMotorFlagsPresent: boolean,
  config: CompassConfig,
): PhaseCandidate {
  const t = config.phaseThresholds;

  if (oralMotorFlagsPresent && s.speech_sound < t.speechSoundP3Max)
    return { phase: 3, driver: "speech_sound", gap: t.speechSoundP3Max - s.speech_sound, elseBranch: false };
  if (s.social_communication < t.socialP1Max)
    return { phase: 1, driver: "social_communication", gap: t.socialP1Max - s.social_communication, elseBranch: false };
  if (s.learning_readiness < t.learningP2Max)
    return { phase: 2, driver: "learning_readiness", gap: t.learningP2Max - s.learning_readiness, elseBranch: false };
  if (s.functional_communication < t.functionalP4Max)
    return { phase: 4, driver: "functional_communication", gap: t.functionalP4Max - s.functional_communication, elseBranch: false };
  if (inRange(s.functional_communication, t.functionalP5))
    return { phase: 5, driver: "functional_communication", gap: distToRange(s.functional_communication, t.functionalP5), elseBranch: false };
  if (s.functional_communication >= t.functionalP6Min && inRange(s.receptive_language, t.receptiveP6))
    return { phase: 6, driver: "receptive_language", gap: distToRange(s.receptive_language, t.receptiveP6), elseBranch: false };
  if (inRange(s.expressive_language, t.expressiveP7))
    return { phase: 7, driver: "expressive_language", gap: distToRange(s.expressive_language, t.expressiveP7), elseBranch: false };
  if (s.receptive_language >= t.receptiveP8Min && inRange(s.social_communication, t.socialP8))
    return { phase: 8, driver: "social_communication", gap: distToRange(s.social_communication, t.socialP8), elseBranch: false };
  if (s.expressive_language >= t.expressiveP9Min)
    return { phase: 9, driver: "expressive_language", gap: s.expressive_language - t.expressiveP9Min, elseBranch: false };
  if (s.social_communication >= t.socialP10Min && s.expressive_language >= t.expressiveP10Min)
    return { phase: 10, driver: "social_communication", gap: s.social_communication - t.socialP10Min, elseBranch: false };
  if (s.functional_communication >= t.functionalP11Min && s.expressive_language >= t.expressiveP11Min)
    return { phase: 11, driver: "functional_communication", gap: s.functional_communication - t.functionalP11Min, elseBranch: false };
  if (
    s.speech_sound < t.speechP12Max &&
    (Object.keys(s) as ScoredDomain[]).every((d) => d === "speech_sound" || s[d] >= t.otherDomainsMinForP12)
  )
    return { phase: 12, driver: "speech_sound", gap: t.speechP12Max - s.speech_sound, elseBranch: false };

  return elseNearestPhase(s, oralMotorFlagsPresent, t);
}

/** §6.3 start_directly vs readiness_module_first. */
export function computePlacementMode(
  candidate: PhaseCandidate,
  confidence: number,
  config: CompassConfig,
): PlacementMode {
  const t = config.phaseThresholds;
  const direct = confidence >= t.confidenceDirectMin && Math.abs(candidate.gap) <= t.placementGapPoints;
  return direct ? "start_directly" : "readiness_module_first";
}

const rangeWord = (score: number): string =>
  score < 35 ? "early" : score < 55 ? "emerging" : score < 70 ? "developing" : "strong";

/** §6.4 reasoning narrative — 2–4 sentences tied to actual scores; canonical phase name. */
export function buildReasoning(
  childName: string,
  candidate: PhaseCandidate,
  scores: DomainScores,
  strengths: ScoredDomain[],
  needs: ScoredDomain[],
  config: CompassConfig,
): string[] {
  const out: string[] = [];
  out.push(
    config.reasoning.primary
      .replaceAll("{child}", childName)
      .replaceAll("{phase}", String(candidate.phase))
      .replaceAll("{phaseName}", phaseName(candidate.phase))
      .replaceAll("{driver}", DOMAIN_LABEL[candidate.driver])
      .replaceAll("{range}", rangeWord(scores[candidate.driver])),
  );
  if (strengths.length > 0)
    out.push(config.reasoning.strength.replaceAll("{child}", childName).replaceAll("{strength}", DOMAIN_LABEL[strengths[0]]));
  if (needs.length > 0)
    out.push(config.reasoning.need.replaceAll("{child}", childName).replaceAll("{need}", DOMAIN_LABEL[needs[0]]));
  return out;
}
