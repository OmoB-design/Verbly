import { describe, it, expect } from "vitest";

import {
  PASS_MARK,
  computeScorePercent,
  decideAdvancement,
  nextRetakeSessionId,
} from "./advancement";

describe("computeScorePercent", () => {
  it("returns the mean of check-in credit values", () => {
    expect(computeScorePercent([{ credit_value: 100 }, { credit_value: 50 }])).toBe(75);
  });

  it("returns 0 for a session with no check-ins", () => {
    expect(computeScorePercent([])).toBe(0);
  });

  it("rounds to two decimal places", () => {
    expect(
      computeScorePercent([{ credit_value: 100 }, { credit_value: 100 }, { credit_value: 0 }]),
    ).toBe(66.67);
  });
});

describe("decideAdvancement — the three locked outcomes", () => {
  it("ADVANCE (within phase): passes but not yet 3 consecutive", () => {
    const d = decideAdvancement({
      score: 80,
      priorConsecutivePasses: 1,
      priorFailedAttemptsThisSession: 0,
    });
    expect(d.outcome).toBe("advance");
    expect(d.advancesPhase).toBe(false);
    expect(d.consecutivePasses).toBe(2);
  });

  it("ADVANCE (phase graduation): 3rd consecutive pass advances the phase", () => {
    const d = decideAdvancement({
      score: 75,
      priorConsecutivePasses: 2,
      priorFailedAttemptsThisSession: 0,
    });
    expect(d.outcome).toBe("advance");
    expect(d.advancesPhase).toBe(true);
    expect(d.consecutivePasses).toBe(3);
  });

  it("exactly at the pass mark counts as a pass", () => {
    expect(
      decideAdvancement({
        score: PASS_MARK,
        priorConsecutivePasses: 0,
        priorFailedAttemptsThisSession: 0,
      }).outcome,
    ).toBe("advance");
  });

  it("RETAKE: first failing attempt", () => {
    const d = decideAdvancement({
      score: 60,
      priorConsecutivePasses: 2,
      priorFailedAttemptsThisSession: 0,
    });
    expect(d.outcome).toBe("retake");
    expect(d.advancesPhase).toBe(false);
    expect(d.consecutivePasses).toBe(0); // a failure breaks the streak
  });

  it("SIMPLIFY: failing again after a prior failed attempt at the same session", () => {
    const d = decideAdvancement({
      score: 40,
      priorConsecutivePasses: 0,
      priorFailedAttemptsThisSession: 1,
    });
    expect(d.outcome).toBe("simplify_triggered");
    expect(d.advancesPhase).toBe(false);
  });

  it("just below the pass mark fails", () => {
    expect(
      decideAdvancement({
        score: 74.99,
        priorConsecutivePasses: 0,
        priorFailedAttemptsThisSession: 0,
      }).outcome,
    ).toBe("retake");
  });
});

describe("nextRetakeSessionId — lowest-scoring session first", () => {
  it("returns null when nothing failed", () => {
    expect(nextRetakeSessionId([])).toBeNull();
  });

  it("picks the lowest-scoring failed session", () => {
    expect(
      nextRetakeSessionId([
        { session_id: "a", score: 60, attempted_at: "2026-01-01" },
        { session_id: "b", score: 40, attempted_at: "2026-01-02" },
      ]),
    ).toBe("b");
  });

  it("breaks ties by earliest attempt", () => {
    expect(
      nextRetakeSessionId([
        { session_id: "late", score: 50, attempted_at: "2026-02-01" },
        { session_id: "early", score: 50, attempted_at: "2026-01-01" },
      ]),
    ).toBe("early");
  });
});
