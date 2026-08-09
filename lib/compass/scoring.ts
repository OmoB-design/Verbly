import {
  SCORED_DOMAINS,
  type AssessmentInput,
  type CompassConfig,
  type DomainScores,
  type ScoredDomain,
} from "./types";

/** §5 scoring. Formulas are the blueprint's; thresholds/weights come from config. */

export interface DomainScoreResult {
  raw: DomainScores;
  adjusted: DomainScores;
  itemsAnswered: number;
}

/** §5.1 + §5.2: item points → per-domain 0–100, then age-adjusted. */
export function computeDomainScores(input: AssessmentInput, config: CompassConfig): DomainScoreResult {
  const raw = {} as DomainScores;
  const adjusted = {} as DomainScores;
  let itemsAnswered = 0;

  for (const domain of SCORED_DOMAINS) {
    const items = config.items.filter(
      (it) => it.domain === domain && (it.brackets.includes(input.ageBracket) || it.brackets.includes("ALL")),
    );
    let sum = 0;
    let n = 0;
    for (const it of items) {
      const value = input.responses[it.id];
      if (value === undefined) continue;
      const pts = it.points[value];
      if (pts === undefined) continue;
      sum += pts;
      n += 1;
    }
    itemsAnswered += n;
    const domainRaw = n === 0 ? 0 : Math.round((sum / (n * 4)) * 100);
    raw[domain] = domainRaw;
    const factor = config.ageWeightFactors[domain][input.ageBracket] ?? 1;
    adjusted[domain] = Math.round(domainRaw * factor);
  }

  return { raw, adjusted, itemsAnswered };
}

/** §5.3 weighted average → 0–100. Oral-motor + benchmarks excluded (C6). */
export function computeOverall(adjusted: DomainScores, config: CompassConfig): number {
  let acc = 0;
  for (const domain of SCORED_DOMAINS) acc += adjusted[domain] * config.domainWeights[domain];
  return Math.round(acc);
}

/**
 * §5.4 benchmark agreement rate. For each answered benchmark item, compare the
 * caregiver yes/no against the domain score the rest of the survey produced:
 *   1.0 if they agree; 0.5 if they disagree within a ±10 near-miss band; else 0.
 * Bounded 0–1 by construction. Returns null rate when nothing was answered.
 */
export function benchmarkAgreement(
  adjusted: DomainScores,
  input: AssessmentInput,
  config: CompassConfig,
): { rate: number | null; n: number; expected: number; observed: number } {
  const applicable = config.benchmarkItems.filter(
    (b) => b.brackets.includes(input.ageBracket) || b.brackets.includes("ALL"),
  );
  const answers = input.benchmarkAnswers ?? {};
  let sum = 0;
  let n = 0;
  let observed = 0;
  for (const b of applicable) {
    const ans = answers[b.id];
    if (ans === undefined) continue;
    n += 1;
    if (ans) observed += 1;
    const score = adjusted[b.predictedDomain];
    const agrees = ans ? score >= b.threshold : score < b.threshold;
    if (agrees) sum += 1.0;
    else if (Math.abs(score - b.threshold) <= 10) sum += 0.5; // near-miss band
  }
  return { rate: n > 0 ? sum / n : null, n, expected: applicable.length, observed };
}

/**
 * §5.4 confidence = 0.6·completeness + 0.4·consistency.
 *
 * LAUNCH BEHAVIOUR (intended, not a bug — §5.4 provisional + §14.9): benchmark
 * thresholds are uncalibrated, so we force the "n<4" path — `consistency` is
 * omitted and confidence is capped at 0.74. Every child therefore routes to a
 * readiness module and NONE gets start_directly, until thresholds are set.
 * Even once calibrated, <4 answered benchmark items still takes the capped path.
 */
export function computeConfidence(
  input: AssessmentInput,
  adjusted: DomainScores,
  config: CompassConfig,
): { confidence: number; completeness: number; consistency: number | null } {
  const answered = Object.keys(input.responses).length;
  const completeness = input.itemsTotal > 0 ? Math.min(1, answered / input.itemsTotal) : 0;

  const agreement = benchmarkAgreement(adjusted, input, config);
  const canUseConsistency = config.benchmarkThresholdsCalibrated && agreement.n >= 4 && agreement.rate !== null;

  if (!canUseConsistency) {
    return {
      confidence: Math.min(Math.round(completeness * 100) / 100, 0.74),
      completeness,
      consistency: null,
    };
  }
  const consistency = agreement.rate as number;
  const confidence = Math.round((0.6 * completeness + 0.4 * consistency) * 100) / 100;
  return { confidence, completeness, consistency };
}

/** §5.5 strengths (adj ≥ strengthMin, top 3 desc) / needs (adj ≤ needMax, top 3 asc). */
export function extractStrengthsNeeds(
  adjusted: DomainScores,
  config: CompassConfig,
): { strengths: ScoredDomain[]; needs: ScoredDomain[] } {
  const { strengthMin, needMax } = config.phaseThresholds;
  const strengths = [...SCORED_DOMAINS]
    .filter((d) => adjusted[d] >= strengthMin)
    .sort((a, b) => adjusted[b] - adjusted[a])
    .slice(0, 3);
  const needs = [...SCORED_DOMAINS]
    .filter((d) => adjusted[d] <= needMax)
    .sort((a, b) => adjusted[a] - adjusted[b])
    .slice(0, 3);
  return { strengths, needs };
}
