/**
 * Verbly progression state — the SINGLE authoritative reading of a child's
 * position within their current phase.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ THIS IS NOT MACHINE LEARNING. Deterministic, curriculum-authored rules   │
 * │ (CLAUDE.md → "The single most important rule").                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 *                       ┌───────────────────────┐
 *                       │  Performance history  │
 *                       └───────────┬───────────┘
 *                                   ▼
 *                    ┌──────────────────────────────┐
 *                    │ calculateProgressionState()  │  ← this file
 *                    └───────────┬──────────────────┘
 *                    ┌───────────┴───────────┐
 *                    ▼                       ▼
 *          decideAdvancement()        caregiver progress UI
 *          (the actual decision)      (what the screen says)
 *
 * WHY THIS EXISTS. The trailing-run calculation was previously written twice —
 * once in /api/sessions/complete (authoritative) and once in the practice page
 * (display). The two drifted in two ways that could disagree on screen:
 *
 *   1. The server filtered in-phase attempts by `phase_number`; the page
 *      filtered by `phase_id`. `curriculum_content.phases` is versioned, so a
 *      phase_number may own more than one phase_id — attempts recorded under an
 *      earlier content version counted for the server and not for the page.
 *   2. The page ignored `ran_simplified`. After a Simplified 3rd pass the run
 *      is 3 but the child has NOT graduated (owner ruling 2026-08-09: the
 *      graduating pass must be a standard session). The page would read
 *      "3 of 3 — next phase" while the server correctly held the child back.
 *
 * Both call sites now read the same object, so "the screen says 3, the server
 * says 2" is not expressible.
 *
 * PURE: the caller assembles history and resolves which sessions belong to the
 * phase. This module makes no queries and holds no state.
 */

import { PASS_MARK, REQUIRED_CONSECUTIVE_PASSES } from "./advancement";

/** One completed session attempt. Shape is the subset of `session_instances`
 *  both call sites already select. */
export interface ProgressionAttempt {
  session_id: string;
  /** 0–100. Null (never scored) is treated as a non-pass, never as a pass. */
  score_percent: number | string | null;
  /** Whether this attempt ran the Simplified variant. */
  ran_simplified?: boolean | null;
}

export interface ProgressionInput {
  /** The child's COMPLETED attempts, chronological (oldest first). Attempts
   *  outside the phase are ignored, so callers may pass the child's full
   *  history. Must exclude any in-flight attempt. */
  attempts: ProgressionAttempt[];
  /** Session ids belonging to the phase being evaluated. Callers MUST resolve
   *  this by phase_number, not phase_id — see WHY THIS EXISTS (1). */
  phaseSessionIds: Iterable<string>;
  /** When given, `priorFailedAttemptsThisSession` counts failures at this exact
   *  session id (the retake → Simplified chain is per variant). */
  sessionId?: string;
  /** Overridable for testing only; defaults to the locked values. */
  passMark?: number;
  requiredConsecutive?: number;
}

export interface ProgressionState {
  /** Completed attempts within the phase, chronological. */
  inPhaseAttempts: ProgressionAttempt[];
  /** Trailing run of passing attempts in this phase (any variant). */
  consecutivePasses: number;
  /** Passes still needed to reach the graduation criterion; 0 once met. */
  passesRemaining: number;
  /** True once the run length meets the requirement. NOT the same as "will
   *  advance" — see `graduationAwaitingStandardPass`. */
  runComplete: boolean;
  /**
   * True when the run is long enough BUT the most recent pass ran Simplified,
   * so the child has not graduated and the next STANDARD pass will. This is the
   * state the display previously reported as a completed run.
   */
  graduationAwaitingStandardPass: boolean;
  /** Failures at `sessionId` (0 when no `sessionId` was supplied). Feeds the
   *  retake → Simplified branch in `decideAdvancement`. */
  priorFailedAttemptsThisSession: number;
  /** Total completed attempts in this phase. */
  attemptsInPhase: number;
}

/** Null/blank scores are non-passes. Values arrive as numeric strings from
 *  PostgREST on `numeric` columns, so coerce before comparing. */
function scoreOf(attempt: ProgressionAttempt): number {
  const raw = attempt.score_percent;
  if (raw === null || raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Read a child's progression state within one phase from their attempt history.
 *
 * The authoritative answer to "how many passes in a row" and "has this session
 * failed before" — consumed by /api/sessions/complete to build the advancement
 * decision, and by the practice page to render progress.
 */
export function calculateProgressionState(input: ProgressionInput): ProgressionState {
  const passMark = input.passMark ?? PASS_MARK;
  const requiredConsecutive = input.requiredConsecutive ?? REQUIRED_CONSECUTIVE_PASSES;
  const phaseIds = input.phaseSessionIds instanceof Set
    ? input.phaseSessionIds
    : new Set(input.phaseSessionIds);

  const inPhaseAttempts = input.attempts.filter((a) => phaseIds.has(a.session_id));

  // Trailing run of passes, walking backwards from the most recent attempt.
  let consecutivePasses = 0;
  for (let i = inPhaseAttempts.length - 1; i >= 0; i--) {
    if (scoreOf(inPhaseAttempts[i]) >= passMark) consecutivePasses++;
    else break;
  }

  const runComplete = consecutivePasses >= requiredConsecutive;
  // The most recent attempt is a pass whenever the run is non-empty, so this is
  // the pass that would have graduated the child had it been a standard one.
  const lastPass = consecutivePasses > 0 ? inPhaseAttempts[inPhaseAttempts.length - 1] : null;
  const graduationAwaitingStandardPass = runComplete && lastPass?.ran_simplified === true;

  const priorFailedAttemptsThisSession = input.sessionId
    ? input.attempts.filter(
        (a) => a.session_id === input.sessionId && scoreOf(a) < passMark,
      ).length
    : 0;

  return {
    inPhaseAttempts,
    consecutivePasses,
    passesRemaining: Math.max(0, requiredConsecutive - consecutivePasses),
    runComplete,
    graduationAwaitingStandardPass,
    priorFailedAttemptsThisSession,
    attemptsInPhase: inPhaseAttempts.length,
  };
}
