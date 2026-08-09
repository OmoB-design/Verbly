import { describe, it, expect } from "vitest";

import { applyBonus, scoreSessionPercent, rollingBaselineStep } from "./scoring";

describe("applyBonus — general rule", () => {
  it("never applies a bonus to a 0% trial (§3)", () => {
    expect(applyBonus(0, { kind: "attribute", added: true })).toBe(0);
    expect(applyBonus(0, { kind: "stem", correct: true })).toBe(0);
    expect(applyBonus(0, { kind: "approximation", exceededBaseline: true })).toBe(0);
  });
  it("returns base unchanged when no bonus", () => {
    expect(applyBonus(75, null)).toBe(75);
  });
});

describe("§3c PECS Phase 4 — Attribute Expansion", () => {
  it("+10 capped at 100 when a correct attribute is added", () => {
    expect(applyBonus(100, { kind: "attribute", added: true })).toBe(100); // cap
    expect(applyBonus(75, { kind: "attribute", added: true })).toBe(85);
  });
  it("no penalty when no attribute added", () => {
    expect(applyBonus(100, { kind: "attribute", added: false })).toBe(100);
  });
});

describe("§3a PECS Phase 6 — Correct Stem Selection", () => {
  it("correct: +10 capped at 100", () => {
    expect(applyBonus(100, { kind: "stem", correct: true })).toBe(100);
    expect(applyBonus(75, { kind: "stem", correct: true })).toBe(85);
    expect(applyBonus(50, { kind: "stem", correct: true })).toBe(60);
  });
  it("incorrect: -10 floored at 50 (spontaneous-wrong beats prompted-correct)", () => {
    expect(applyBonus(100, { kind: "stem", correct: false })).toBe(90); // 100 wrong
    expect(applyBonus(50, { kind: "stem", correct: false })).toBe(50); // floor holds
    // Spontaneous-wrong (90) must exceed prompted-correct (60):
    expect(applyBonus(100, { kind: "stem", correct: false })).toBeGreaterThan(
      applyBonus(50, { kind: "stem", correct: true }),
    );
  });
});

describe("§3b Phase 12 — Closer Approximation", () => {
  it("+10 on a base-25 imitated attempt that exceeds baseline", () => {
    expect(applyBonus(25, { kind: "approximation", exceededBaseline: true })).toBe(35);
  });
  it("no change on a base-25 attempt that does not exceed baseline", () => {
    expect(applyBonus(25, { kind: "approximation", exceededBaseline: false })).toBe(25);
  });
  it("does not alter non-25 (e.g. spontaneous 100) trials numerically", () => {
    expect(applyBonus(100, { kind: "approximation", exceededBaseline: true })).toBe(100);
    expect(applyBonus(50, { kind: "approximation", exceededBaseline: true })).toBe(50);
  });
});

describe("scoreSessionPercent", () => {
  it("means the bonus-adjusted trial credits", () => {
    // 100 (independent) + 85 (75 + correct stem) → mean 92.5
    expect(
      scoreSessionPercent([
        { baseCredit: 100 },
        { baseCredit: 75, bonus: { kind: "stem", correct: true } },
      ]),
    ).toBe(92.5);
  });
  it("returns 0 for an empty session", () => {
    expect(scoreSessionPercent([])).toBe(0);
  });
});

describe("rollingBaselineStep", () => {
  it("returns 0 with no history (first attempt cannot exceed a baseline)", () => {
    expect(rollingBaselineStep([])).toBe(0);
  });
  it("uses the most frequent step across the last 5 attempts", () => {
    expect(rollingBaselineStep([1, 2, 2, 3, 2])).toBe(2);
  });
  it("only considers the last 5 attempts", () => {
    // last 5 are [2,2,2,1,1] → mode 2
    expect(rollingBaselineStep([5, 5, 5, 2, 2, 2, 1, 1])).toBe(2);
  });
  it("breaks ties toward the higher step (conservative)", () => {
    expect(rollingBaselineStep([2, 3])).toBe(3);
  });
});
