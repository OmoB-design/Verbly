/**
 * Verbly scoring & advancement engine.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ THIS IS NOT MACHINE LEARNING. It is a deterministic, curriculum-authored │
 * │ rules engine (CLAUDE.md → "The single most important rule"). No model,    │
 * │ no training, no reward maximization — fixed thresholds and fixed branch   │
 * │ logic, executed identically for every child.                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ── OPERATIONAL INTERPRETATION — PENDING CLINICAL SIGN-OFF ──────────────────
 * The underlying rule is LOCKED (README.md / PHASES.md):
 *   "75% pass mark across 3 consecutive sessions → advance. Below → retake,
 *    lowest-scoring session first. Still below after retake → Simplified
 *    Session."
 * The LOCKED VALUES here (pass mark 75, 3 consecutive, retake-then-simplify)
 * are used verbatim and must not be changed without sign-off.
 *
 * What required an operational decision (and therefore needs confirmation by
 * the project owner / an SLP, per CLAUDE.md's content-vs-code rule) is how that
 * rule maps onto the per-session `outcome` enum (advance / retake /
 * simplify_triggered):
 *
 *   • A session attempt scoring ≥ 75% → outcome `advance` ("passed, proceed").
 *     `advancesPhase` is true ONLY when this is the 3rd consecutive passing
 *     attempt in the current phase — that (and only that) is a phase graduation
 *     and writes a `phase_history` row.
 *   • A first failing attempt (< 75%) at a session → outcome `retake`.
 *   • A failing attempt that was ALREADY a retake of the same session →
 *     outcome `simplify_triggered` (the Simplified Session).
 *
 * "Retake, lowest-scoring session first" is a SEQUENCING concern for what the
 * runtime offers next, not a per-session outcome — see `nextRetakeSessionId`.
 *
 * ── SIMPLIFIED SESSIONS IN THE GRADUATION WINDOW (owner ruling 2026-08-09) ──
 * Simplified-session passes COUNT toward the 3-consecutive-pass run, but the
 * graduating pass — the one that actually triggers advancement — must be a
 * STANDARD session. If the 3rd consecutive pass happens on a Simplified
 * variant, the run continues (it does not reset); the child advances on their
 * next standard-session pass. Uniform across all 12 phases.
 * ────────────────────────────────────────────────────────────────────────────
 */

export const PASS_MARK = 75;
export const REQUIRED_CONSECUTIVE_PASSES = 3;

export type SessionOutcome = "advance" | "retake" | "simplify_triggered";

export interface CheckinCredit {
  /** Per-check-in credit on a 0–100 scale, sourced from the session's
   *  version-pinned content_json (e.g. Spontaneous≈100 / Prompted≈partial /
   *  No-Response=0). The engine does not invent these values. */
  credit_value: number;
}

/**
 * Compute a session's score as the mean of its check-in credit values.
 * Returns 0 for a session with no check-ins (an empty session cannot pass).
 * BASE-ONLY mean over the 5-level support scale / exception scales (credit
 * values supplied 0–100 by version-pinned content). Phase 7's
 * Reversion-to-Single-Card scores 0 like any other failure here; its
 * diagnostic distinction lives in `session_checkins.response_category`.
 *
 * Per-trial BONUSES (curriculum Scoring Appendix §3 — PECS Phase 4 attribute,
 * PECS Phase 6 stem, Phase 12 closer-approximation) are now handled in
 * `scoring.ts` → `scoreSessionPercent`, which /sessions/complete uses. This
 * plain mean remains the correct aggregator for base-only phases.
 */
export function computeScorePercent(checkins: CheckinCredit[]): number {
  if (checkins.length === 0) return 0;
  const sum = checkins.reduce((acc, c) => acc + c.credit_value, 0);
  return Math.round((sum / checkins.length) * 100) / 100;
}

export interface AdvancementContext {
  /** This just-completed session attempt's score (0–100). */
  score: number;
  /** Consecutive passing attempts immediately preceding this one, within the
   *  current phase. */
  priorConsecutivePasses: number;
  /** How many times THIS same curriculum session has already failed for this
   *  child before this attempt (used to detect retake → simplify). */
  priorFailedAttemptsThisSession: number;
  /** Whether THIS attempt ran the Simplified variant. A simplified pass counts
   *  in the consecutive run but cannot be the graduating pass (owner ruling
   *  2026-08-09). */
  ranSimplified?: boolean;
  /** Overridable only for testing; defaults to the locked values. */
  passMark?: number;
  requiredConsecutive?: number;
}

export interface AdvancementDecision {
  outcome: SessionOutcome;
  /** True only when this passing attempt completes the phase-graduation
   *  criterion (Nth consecutive pass) and the child should move to the next
   *  phase — the single case that writes `phase_history` with `rl_advance`. */
  advancesPhase: boolean;
  /** Consecutive passes including this attempt (0 if it failed). */
  consecutivePasses: number;
  /** Human-readable rationale, useful for audit/reporting. */
  reason: string;
}

/**
 * Decide a just-completed session's outcome. Pure and deterministic — all data
 * assembly (history lookups) happens in the caller (the /sessions/complete
 * route handler); this function only applies the fixed rule.
 */
export function decideAdvancement(ctx: AdvancementContext): AdvancementDecision {
  const passMark = ctx.passMark ?? PASS_MARK;
  const requiredConsecutive = ctx.requiredConsecutive ?? REQUIRED_CONSECUTIVE_PASSES;
  const passed = ctx.score >= passMark;

  if (passed) {
    const consecutivePasses = ctx.priorConsecutivePasses + 1;
    const runComplete = consecutivePasses >= requiredConsecutive;
    // The graduating pass must be a STANDARD session: a simplified pass keeps
    // the run alive but defers advancement to the next standard pass.
    const advancesPhase = runComplete && ctx.ranSimplified !== true;
    return {
      outcome: "advance",
      advancesPhase,
      consecutivePasses,
      reason: advancesPhase
        ? `Passed (${ctx.score}% ≥ ${passMark}%); ${consecutivePasses} consecutive passes met the ${requiredConsecutive}-session graduation criterion.`
        : runComplete
          ? `Passed (${ctx.score}% ≥ ${passMark}%) on the Simplified variant; the run of ${consecutivePasses} continues, but the graduating pass must be a standard session — the next standard pass advances.`
          : `Passed (${ctx.score}% ≥ ${passMark}%); ${consecutivePasses}/${requiredConsecutive} consecutive passes so far — proceed within phase.`,
    };
  }

  // Failed. First failure → retake; a failure that was already a retake →
  // simplified session.
  if (ctx.priorFailedAttemptsThisSession >= 1) {
    return {
      outcome: "simplify_triggered",
      advancesPhase: false,
      consecutivePasses: 0,
      reason: `Failed (${ctx.score}% < ${passMark}%) after a prior failed attempt at this session — trigger the Simplified Session.`,
    };
  }

  return {
    outcome: "retake",
    advancesPhase: false,
    consecutivePasses: 0,
    reason: `Failed (${ctx.score}% < ${passMark}%) — retake indicated.`,
  };
}

/**
 * Given the child's failed sessions in the current phase, pick which to retake
 * first: the lowest-scoring one (ties broken by earliest attempt). Returns null
 * if nothing needs retaking. This encodes only the "lowest-scoring first"
 * ordering from the locked rule; it does not decide advancement.
 */
export function nextRetakeSessionId(
  failed: { session_id: string; score: number; attempted_at: string }[],
): string | null {
  if (failed.length === 0) return null;
  const sorted = [...failed].sort(
    (a, b) => a.score - b.score || a.attempted_at.localeCompare(b.attempted_at),
  );
  return sorted[0].session_id;
}
