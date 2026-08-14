import { describe, it, expect } from "vitest";

import { calculateProgressionState, type ProgressionAttempt } from "./progression";
import { decideAdvancement, PASS_MARK, REQUIRED_CONSECUTIVE_PASSES } from "./advancement";

/** Sessions in the phase under test, plus one that belongs to another phase. */
const S1 = "sess-1";
const S2 = "sess-2";
const S3 = "sess-3";
const OTHER_PHASE = "sess-other";
const PHASE_IDS = [S1, S2, S3];

const pass = (session_id: string, ran_simplified = false): ProgressionAttempt => ({
  session_id,
  score_percent: 80,
  ran_simplified,
});
const fail = (session_id: string, score = 40): ProgressionAttempt => ({
  session_id,
  score_percent: score,
  ran_simplified: false,
});

const state = (attempts: ProgressionAttempt[], sessionId?: string) =>
  calculateProgressionState({ attempts, phaseSessionIds: PHASE_IDS, sessionId });

describe("consecutive-pass run", () => {
  it("is 0 with no history", () => {
    const s = state([]);
    expect(s.consecutivePasses).toBe(0);
    expect(s.passesRemaining).toBe(REQUIRED_CONSECUTIVE_PASSES);
    expect(s.runComplete).toBe(false);
    expect(s.attemptsInPhase).toBe(0);
  });

  it("counts a trailing run of passes", () => {
    const s = state([pass(S1), pass(S2)]);
    expect(s.consecutivePasses).toBe(2);
    expect(s.passesRemaining).toBe(1);
    expect(s.runComplete).toBe(false);
  });

  it("resets on a failure and counts only the trailing run", () => {
    const s = state([pass(S1), pass(S2), fail(S3), pass(S1)]);
    expect(s.consecutivePasses).toBe(1);
  });

  it("completes the run at the required number of passes", () => {
    const s = state([pass(S1), pass(S2), pass(S3)]);
    expect(s.consecutivePasses).toBe(3);
    expect(s.runComplete).toBe(true);
    expect(s.passesRemaining).toBe(0);
  });

  it("treats a score exactly at the pass mark as a pass", () => {
    const s = state([{ session_id: S1, score_percent: PASS_MARK }]);
    expect(s.consecutivePasses).toBe(1);
  });

  it("treats a score just below the pass mark as a failure", () => {
    const s = state([{ session_id: S1, score_percent: PASS_MARK - 0.01 }]);
    expect(s.consecutivePasses).toBe(0);
  });
});

describe("phase scoping", () => {
  it("ignores attempts from other phases, including trailing ones", () => {
    // The other-phase attempt is most recent and would break the run if counted.
    const s = state([pass(S1), pass(S2), { session_id: OTHER_PHASE, score_percent: 10 }]);
    expect(s.consecutivePasses).toBe(2);
    expect(s.attemptsInPhase).toBe(2);
  });

  it("accepts a Set as well as an array of phase session ids", () => {
    const attempts = [pass(S1), pass(S2)];
    const asArray = calculateProgressionState({ attempts, phaseSessionIds: PHASE_IDS });
    const asSet = calculateProgressionState({ attempts, phaseSessionIds: new Set(PHASE_IDS) });
    expect(asSet).toEqual(asArray);
  });
});

describe("score coercion", () => {
  it("treats a null score as a non-pass, never a pass", () => {
    const s = state([pass(S1), { session_id: S2, score_percent: null }]);
    expect(s.consecutivePasses).toBe(0);
  });

  it("handles numeric strings, as PostgREST returns for numeric columns", () => {
    const s = state([
      { session_id: S1, score_percent: "80.00" },
      { session_id: S2, score_percent: "76.5" },
    ]);
    expect(s.consecutivePasses).toBe(2);
  });
});

describe("prior failures at one session (retake → Simplified chain)", () => {
  it("is 0 when no sessionId is supplied", () => {
    expect(state([fail(S1), fail(S1)]).priorFailedAttemptsThisSession).toBe(0);
  });

  it("counts failures at that exact session only", () => {
    const s = state([fail(S1), fail(S2), fail(S1)], S1);
    expect(s.priorFailedAttemptsThisSession).toBe(2);
  });

  it("does not count passes at that session", () => {
    const s = state([fail(S1), pass(S1)], S1);
    expect(s.priorFailedAttemptsThisSession).toBe(1);
  });
});

describe("Simplified graduation rule (owner ruling 2026-08-09)", () => {
  it("flags a completed run whose last pass was Simplified as awaiting a standard pass", () => {
    const s = state([pass(S1), pass(S2), pass(S3, true)]);
    expect(s.consecutivePasses).toBe(3);
    expect(s.runComplete).toBe(true);
    expect(s.graduationAwaitingStandardPass).toBe(true);
  });

  it("does not flag a completed run whose last pass was standard", () => {
    const s = state([pass(S1), pass(S2), pass(S3)]);
    expect(s.runComplete).toBe(true);
    expect(s.graduationAwaitingStandardPass).toBe(false);
  });

  it("does not flag an incomplete run even if its last pass was Simplified", () => {
    const s = state([pass(S1, true)]);
    expect(s.runComplete).toBe(false);
    expect(s.graduationAwaitingStandardPass).toBe(false);
  });

  it("counts Simplified passes toward the run — they never reset it", () => {
    const s = state([pass(S1, true), pass(S2, true), pass(S3, true)]);
    expect(s.consecutivePasses).toBe(3);
  });
});

describe("agreement with the decision engine — the reason this module exists", () => {
  /** Feed the same state into decideAdvancement the way the route handler does. */
  const decide = (history: ProgressionAttempt[], attempt: { score: number; simplified?: boolean; sessionId: string }) => {
    const s = state(history, attempt.sessionId);
    return {
      state: s,
      decision: decideAdvancement({
        score: attempt.score,
        priorConsecutivePasses: s.consecutivePasses,
        priorFailedAttemptsThisSession: s.priorFailedAttemptsThisSession,
        ranSimplified: attempt.simplified,
      }),
    };
  };

  it("a standard 3rd pass graduates, and the display agrees it was the last one needed", () => {
    const { state: s, decision } = decide([pass(S1), pass(S2)], { score: 80, sessionId: S3 });
    expect(s.passesRemaining).toBe(1); // screen: "1 more to go"
    expect(decision.advancesPhase).toBe(true); // server: graduates
  });

  it("a Simplified 3rd pass does NOT graduate, and the display no longer claims it did", () => {
    const history = [pass(S1), pass(S2)];
    const { decision } = decide(history, { score: 80, simplified: true, sessionId: S3 });
    expect(decision.advancesPhase).toBe(false);

    // The state AFTER that attempt is recorded — what the practice page renders.
    const after = state([...history, pass(S3, true)]);
    expect(after.runComplete).toBe(true);
    expect(after.graduationAwaitingStandardPass).toBe(true); // so the UI says "one standard session"
  });

  it("the next standard pass after a Simplified completion graduates", () => {
    const history = [pass(S1), pass(S2), pass(S3, true)];
    const { decision } = decide(history, { score: 80, sessionId: S1 });
    expect(decision.advancesPhase).toBe(true);
  });

  it("a second failure at the same session triggers the Simplified Session", () => {
    const { decision } = decide([fail(S1)], { score: 40, sessionId: S1 });
    expect(decision.outcome).toBe("simplify_triggered");
  });

  it("a first failure triggers a retake", () => {
    const { decision } = decide([], { score: 40, sessionId: S1 });
    expect(decision.outcome).toBe("retake");
  });
});
