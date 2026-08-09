/**
 * Verbly per-trial scoring — base credit + additive bonuses.
 *
 * DETERMINISTIC RULES ENGINE, not ML (CLAUDE.md). The numbers here come
 * verbatim from the curriculum's "Appendix — Scoring Reference (All Phases)".
 *
 * Base scale (Appendix §1, 5 levels): 100 Independent / 75 Verbal /
 * 50 Gestural-Visual / 25 Physical / 0 None. Three phases use their own
 * exception scales (§2, PECS Phase 3 / PECS Phase 5 / Turn-Taking) but still
 * output 0–100, so the aggregation below is identical for every phase — the
 * per-trial base credit is supplied by the version-pinned content, not decided
 * here.
 *
 * Bonuses (Appendix §3) are per-trial and additive, and — per the appendix —
 * "only apply to trials that already scored above 0%".
 */

/** A per-trial bonus observation. The caller resolves history-dependent facts
 *  (e.g. Phase 12's baseline comparison) into `exceededBaseline` before calling. */
export type Bonus =
  | { kind: "attribute"; added: boolean } // §3c PECS Phase 4
  | { kind: "stem"; correct: boolean } // §3a PECS Phase 6
  | { kind: "approximation"; exceededBaseline: boolean }; // §3b Phase 12

/**
 * Apply a per-trial bonus to a base credit, returning the final trial credit.
 * Exact rules from Appendix §3:
 *   • Attribute (§3c): +10, cap 100, when a correct attribute card is added;
 *     NO penalty otherwise (elective refinement, not an error).
 *   • Stem (§3a): correct +10 (cap 100); incorrect -10 (FLOORED at 50, the
 *     Prompted-tier equivalent — an initiated exchange with the wrong stem
 *     never scores below a prompted exchange with the correct one).
 *   • Approximation (§3b): +10 (cap 100) when the attempt exceeds the rolling
 *     baseline. Applies ONLY to Imitated-Vocal-Attempt trials (base 25);
 *     spontaneous trials are already 100 and show no numeric change.
 */
export function applyBonus(baseCredit: number, bonus?: Bonus | null): number {
  if (!bonus || baseCredit <= 0) return baseCredit; // §3: bonuses only on >0% trials

  switch (bonus.kind) {
    case "attribute":
      return bonus.added ? Math.min(baseCredit + 10, 100) : baseCredit;

    case "stem":
      return bonus.correct
        ? Math.min(baseCredit + 10, 100)
        : Math.max(baseCredit - 10, 50);
      // NOTE (flagged): the -10/floor-50 rule is applied literally. For a base
      // below 50 the floor would RAISE the trial to 50; the appendix's wording
      // ("floored at 50") implies commenting trials are expected at ≥50. Left
      // literal rather than reinterpreted — flag to the SLP if low-base stem
      // trials occur in practice.

    case "approximation":
      // §3b: only Imitated Vocal Attempt (base 25) trials earn this numerically.
      if (baseCredit !== 25) return baseCredit;
      return bonus.exceededBaseline ? Math.min(baseCredit + 10, 100) : baseCredit;
  }
}

export interface ScoredTrial {
  /** Base credit from version-pinned content (0–100). */
  baseCredit: number;
  /** Present only for the three bonus phases. */
  bonus?: Bonus | null;
}

/**
 * Session score = mean of each trial's FINAL (bonus-adjusted) credit, rounded
 * to two decimals. Returns 0 for a session with no trials (cannot pass).
 */
export function scoreSessionPercent(trials: ScoredTrial[]): number {
  if (trials.length === 0) return 0;
  const sum = trials.reduce((acc, t) => acc + applyBonus(t.baseCredit, t.bonus), 0);
  return Math.round((sum / trials.length) * 100) / 100;
}

/**
 * Phase 12 rolling baseline (Appendix §3b): "the most frequent step reached
 * across their last 5 attempts at that sound or word." Caller passes the prior
 * steps for one target (already filtered to that target, chronological order);
 * this uses the last 5. Ties resolve to the HIGHER step (conservative — makes
 * the bonus harder to earn; flagged as a default pending SLP confirmation).
 * Returns 0 when there is no history, so a first-ever attempt cannot "exceed"
 * a baseline that doesn't exist.
 */
export function rollingBaselineStep(priorSteps: number[]): number {
  const window = priorSteps.slice(-5);
  if (window.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const s of window) counts.set(s, (counts.get(s) ?? 0) + 1);
  let best = 0;
  let bestCount = 0;
  for (const [step, count] of counts) {
    if (count > bestCount || (count === bestCount && step > best)) {
      best = step;
      bestCount = count;
    }
  }
  return best;
}
