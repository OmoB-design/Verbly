/**
 * Verbly Age-Bracket Transition engine.
 *
 * DETERMINISTIC RULES ENGINE, not ML (CLAUDE.md). Implements the curriculum's
 * "Age-Bracket Transition Rule" verbatim. Age-group variants (3–7 / 8–12 /
 * 10–14) select which activity framing is presented; a child moves UP a variant
 * only when performance shows the current framing has become too young — never
 * on a birthday alone, and never on any single signal.
 *
 * All thresholds below are LAUNCH DEFAULTS pending SLP sign-off (the doc says
 * so explicitly and defines a validation trigger). They are isolated here for
 * easy adjustment.
 *
 * This module is PURE: the caller assembles the window/age facts (from
 * session_instances + check-ins) and passes them in.
 */

export const AGE_GATE_WINDOW = 3; // last N in-variant sessions (matches pass-mark window)
export const AGE_GATE_MEAN_MIN = 85; // Gate 1: mean score_percent ≥ 85%
export const AGE_GATE_TOPTIER_SHARE_MIN = 0.7; // Gate 2: ≥70% top-tier in EVERY session
export const AGE_COOLDOWN_SESSIONS = 3; // suppress re-eval for N sessions after a firing

export interface AgeWindowSession {
  scorePercent: number;
  /** Fraction (0–1) of this session's trials scored at the top, unprompted
   *  tier (base credit 100). */
  topTierShare: number;
  /** Did this session trigger the Repeat condition (a retake)? */
  triggeredRetake: boolean;
}

export interface AgeTransitionInput {
  /** In-variant sessions, chronological; the last AGE_GATE_WINDOW are evaluated. */
  window: AgeWindowSession[];
  childAgeMonths: number;
  /** Chronological floor for the NEXT variant (months); null if already at the
   *  top variant so there is nowhere to promote to. */
  nextVariantFloorMonths: number | null;
  /** Sessions elapsed since the last age-bracket transition (for cooldown). */
  sessionsSinceLastTransition: number;
}

export interface AgeTransitionDecision {
  transition: boolean;
  gates: { g1Mean: boolean; g2TopTier: boolean; g3NoRetakes: boolean };
  blockedByCooldown: boolean;
  /** Gates all passed but the child is below the next variant's age floor —
   *  hold, and flag to the caregiver as "performance-ready, waiting on age". */
  blockedByAgeFloor: boolean;
  reason: string;
}

const G_FALSE = { g1Mean: false, g2TopTier: false, g3NoRetakes: false };

/**
 * Upward transition decision. Fires only when Gates 1–3 all pass on the same
 * window AND the child meets the next variant's chronological floor AND the
 * cooldown has elapsed. Any single failure holds the child at the current
 * variant. Moves exactly one variant.
 */
export function evaluateAgeBracketTransition(
  input: AgeTransitionInput,
): AgeTransitionDecision {
  const { window, childAgeMonths, nextVariantFloorMonths, sessionsSinceLastTransition } = input;

  if (nextVariantFloorMonths === null) {
    return { transition: false, gates: G_FALSE, blockedByCooldown: false, blockedByAgeFloor: false, reason: "Already at the top age-group variant — no upward move exists." };
  }
  if (sessionsSinceLastTransition < AGE_COOLDOWN_SESSIONS) {
    return { transition: false, gates: G_FALSE, blockedByCooldown: true, blockedByAgeFloor: false, reason: `In cooldown (${sessionsSinceLastTransition}/${AGE_COOLDOWN_SESSIONS} sessions since last transition).` };
  }
  if (window.length < AGE_GATE_WINDOW) {
    return { transition: false, gates: G_FALSE, blockedByCooldown: false, blockedByAgeFloor: false, reason: `Insufficient window (${window.length}/${AGE_GATE_WINDOW} in-variant sessions).` };
  }

  const w = window.slice(-AGE_GATE_WINDOW);
  const mean = w.reduce((a, s) => a + s.scorePercent, 0) / w.length;
  const g1Mean = mean >= AGE_GATE_MEAN_MIN;
  const g2TopTier = w.every((s) => s.topTierShare >= AGE_GATE_TOPTIER_SHARE_MIN); // EVERY session
  const g3NoRetakes = w.every((s) => !s.triggeredRetake);
  const gates = { g1Mean, g2TopTier, g3NoRetakes };

  if (!(g1Mean && g2TopTier && g3NoRetakes)) {
    return { transition: false, gates, blockedByCooldown: false, blockedByAgeFloor: false, reason: "One or more gates did not pass — hold at current variant." };
  }
  if (childAgeMonths < nextVariantFloorMonths) {
    return { transition: false, gates, blockedByCooldown: false, blockedByAgeFloor: true, reason: "Performance-ready, but below the next variant's chronological age floor — holding and flagging to caregiver." };
  }
  return { transition: true, gates, blockedByCooldown: false, blockedByAgeFloor: false, reason: "All three gates passed and age floor met — promote one variant." };
}

// ── Downward advisory (advisory only; never moves the variant) ──────────────
export const DOWNWARD_WINDOW_MIN = 5; // "across 5–6 sessions"
export const DOWNWARD_MARGIN_DEFAULT = 15; // "clearly below" baseline (points); default pending SLP sign-off

export interface DownwardAdvisoryInput {
  activityId: string;
  /** Recent per-activity scores, chronological (most recent last). */
  recentScores: number[];
  /** The child's own established baseline for THIS activity. */
  baseline: number;
  marginBelow?: number;
}

/**
 * Per-activity downward signal. NOT a mirror of the upward rule: it never moves
 * the variant, only surfaces an advisory ("this activity may not be landing at
 * the current framing; consider the previous variant for this activity only").
 * Fires only on a persistent, activity-specific drop clearly below the child's
 * own baseline across the last 5–6 sessions of that activity.
 */
export function evaluateDownwardAdvisory(
  input: DownwardAdvisoryInput,
): { advise: boolean; activityId: string; reason: string } {
  const margin = input.marginBelow ?? DOWNWARD_MARGIN_DEFAULT;
  const w = input.recentScores.slice(-6);
  if (w.length < DOWNWARD_WINDOW_MIN) {
    return { advise: false, activityId: input.activityId, reason: `Not enough activity history (${w.length}/${DOWNWARD_WINDOW_MIN}).` };
  }
  const allClearlyBelow = w.every((s) => input.baseline - s >= margin);
  return {
    advise: allClearlyBelow,
    activityId: input.activityId,
    reason: allClearlyBelow
      ? `'${input.activityId}' has stayed ≥${margin} pts below the child's baseline across ${w.length} sessions — advise trying the previous variant for this activity only.`
      : "No persistent activity-specific drop — no advisory.",
  };
}
