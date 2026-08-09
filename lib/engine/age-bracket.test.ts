import { describe, it, expect } from "vitest";

import {
  evaluateAgeBracketTransition,
  evaluateDownwardAdvisory,
  type AgeWindowSession,
} from "./age-bracket";

const pass: AgeWindowSession = { scorePercent: 90, topTierShare: 0.8, triggeredRetake: false };
const base = {
  window: [pass, pass, pass],
  childAgeMonths: 120,
  nextVariantFloorMonths: 108, // e.g. age 9
  sessionsSinceLastTransition: 5,
};

describe("evaluateAgeBracketTransition — upward gates", () => {
  it("promotes when all three gates pass, age floor met, cooldown elapsed", () => {
    const d = evaluateAgeBracketTransition(base);
    expect(d.transition).toBe(true);
    expect(d.gates).toEqual({ g1Mean: true, g2TopTier: true, g3NoRetakes: true });
  });

  it("Gate 1 fails when mean < 85%", () => {
    const d = evaluateAgeBracketTransition({
      ...base,
      window: [{ ...pass, scorePercent: 80 }, { ...pass, scorePercent: 80 }, { ...pass, scorePercent: 80 }],
    });
    expect(d.transition).toBe(false);
    expect(d.gates.g1Mean).toBe(false);
  });

  it("Gate 2 requires ≥70% top-tier in EVERY session, not on average", () => {
    // Mean top-tier share is high, but one session dips below 70%.
    const d = evaluateAgeBracketTransition({
      ...base,
      window: [
        { scorePercent: 95, topTierShare: 0.95, triggeredRetake: false },
        { scorePercent: 95, topTierShare: 0.95, triggeredRetake: false },
        { scorePercent: 90, topTierShare: 0.5, triggeredRetake: false },
      ],
    });
    expect(d.transition).toBe(false);
    expect(d.gates.g2TopTier).toBe(false);
  });

  it("Gate 3 fails if any retake occurred in the window", () => {
    const d = evaluateAgeBracketTransition({
      ...base,
      window: [pass, { ...pass, triggeredRetake: true }, pass],
    });
    expect(d.transition).toBe(false);
    expect(d.gates.g3NoRetakes).toBe(false);
  });

  it("holds (advisory) when gates pass but child is below the age floor", () => {
    const d = evaluateAgeBracketTransition({ ...base, childAgeMonths: 100 }); // < 108
    expect(d.transition).toBe(false);
    expect(d.blockedByAgeFloor).toBe(true);
    expect(d.gates).toEqual({ g1Mean: true, g2TopTier: true, g3NoRetakes: true });
  });

  it("blocks during cooldown", () => {
    const d = evaluateAgeBracketTransition({ ...base, sessionsSinceLastTransition: 1 });
    expect(d.transition).toBe(false);
    expect(d.blockedByCooldown).toBe(true);
  });

  it("no move when already at the top variant", () => {
    const d = evaluateAgeBracketTransition({ ...base, nextVariantFloorMonths: null });
    expect(d.transition).toBe(false);
  });

  it("holds on an insufficient window", () => {
    const d = evaluateAgeBracketTransition({ ...base, window: [pass, pass] });
    expect(d.transition).toBe(false);
  });
});

describe("evaluateDownwardAdvisory — per-activity, advisory only", () => {
  it("advises when an activity stays clearly below baseline across ≥5 sessions", () => {
    const d = evaluateDownwardAdvisory({
      activityId: "peekaboo",
      recentScores: [50, 45, 40, 50, 48],
      baseline: 80,
    });
    expect(d.advise).toBe(true);
  });

  it("does not advise on too little history", () => {
    expect(evaluateDownwardAdvisory({ activityId: "x", recentScores: [40, 40], baseline: 80 }).advise).toBe(false);
  });

  it("does not advise when scores are near baseline", () => {
    const d = evaluateDownwardAdvisory({
      activityId: "x",
      recentScores: [78, 80, 75, 82, 79],
      baseline: 80,
    });
    expect(d.advise).toBe(false);
  });

  it("does not advise if even one recent session recovered", () => {
    const d = evaluateDownwardAdvisory({
      activityId: "x",
      recentScores: [50, 45, 40, 78, 48], // one near-baseline session breaks the streak
      baseline: 80,
    });
    expect(d.advise).toBe(false);
  });
});
