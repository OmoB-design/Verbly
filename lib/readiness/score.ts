/**
 * Readiness-check scoring — deterministic rules engine (CLAUDE.md), not ML.
 * Pure: the caller loads the versioned readiness content and the caregiver's
 * yes/no answers; this applies the owner-ruled logic (2026-08-09):
 *   pass = ≥ passYesMin YES of 5; a lone NO on the HARD item → flag, never
 *   blocks; ≤3 YES → caller serves the Simplified variant (phase unchanged).
 */

import type { PhaseReadinessCheck } from "@/content/readiness/readiness-checks";

export interface ReadinessResult {
  yesCount: number;
  answeredCount: number;
  passed: boolean;
  /** True when the check passed but the single NO was the hard prerequisite. */
  hardItemFlagged: boolean;
  /** "[X]" for "Keep an eye on [X] during the first few sessions." — set only
   *  when hardItemFlagged. */
  flagPhrase: string | null;
}

export function scoreReadiness(
  check: PhaseReadinessCheck,
  answers: Record<string, boolean>,
  passYesMin: number,
): ReadinessResult {
  let yesCount = 0;
  let answeredCount = 0;
  let hardAnsweredNo = false;
  for (const item of check.items) {
    const a = answers[item.id];
    if (typeof a !== "boolean") continue;
    answeredCount += 1;
    if (a) yesCount += 1;
    else if (item.hard) hardAnsweredNo = true;
  }
  const passed = yesCount >= passYesMin;
  const hardItemFlagged = passed && hardAnsweredNo;
  return {
    yesCount,
    answeredCount,
    passed,
    hardItemFlagged,
    flagPhrase: hardItemFlagged ? check.flag_phrase : null,
  };
}
