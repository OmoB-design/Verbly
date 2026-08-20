import { describe, it, expect } from "vitest";

import { planNotifications, isEligible, DAILY_MS, WEEKLY_MS, type PlannerContext } from "./engine";

const DAY = 24 * 60 * 60 * 1000;
const now = 1_800_000_000_000; // fixed ms

const base: PlannerContext = {
  frequency: "daily",
  now,
  lastSentAt: null,
  reminderThresholdMs: 3 * DAY,
  children: [],
  pendingMilestones: [],
  pendingRetakes: [],
  pendingReassessments: [],
  encouragementLine: "You're doing it.",
  periodBucket: "d20833",
};

describe("isEligible", () => {
  it("off is never eligible", () => {
    expect(isEligible({ frequency: "off", now, lastSentAt: null })).toBe(false);
  });
  it("eligible when never sent", () => {
    expect(isEligible({ frequency: "daily", now, lastSentAt: null })).toBe(true);
  });
  it("daily: not eligible within the window, eligible after", () => {
    expect(isEligible({ frequency: "daily", now, lastSentAt: now - (DAILY_MS - 1000) })).toBe(false);
    expect(isEligible({ frequency: "daily", now, lastSentAt: now - DAILY_MS })).toBe(true);
  });
  it("weekly: honours the ~weekly window", () => {
    expect(isEligible({ frequency: "weekly", now, lastSentAt: now - 2 * DAY })).toBe(false);
    expect(isEligible({ frequency: "weekly", now, lastSentAt: now - WEEKLY_MS })).toBe(true);
  });
});

describe("planNotifications", () => {
  it("returns nothing when frequency is off", () => {
    expect(planNotifications({ ...base, frequency: "off", children: [{ id: "c", name: "A", lastSessionAt: null }] })).toEqual([]);
  });

  it("returns nothing when not yet due", () => {
    expect(planNotifications({ ...base, lastSentAt: now - 1000 })).toEqual([]);
  });

  it("always includes one encouragement when eligible", () => {
    const out = planNotifications(base);
    const enc = out.filter((n) => n.type === "encouragement");
    expect(enc).toHaveLength(1);
    expect(enc[0].dedupeKey).toBe("encouragement:d20833");
  });

  it("emits a milestone and a retake with source-id dedupe keys", () => {
    const out = planNotifications({
      ...base,
      pendingMilestones: [{ id: "ph1", childId: "c1", childName: "Ada", phaseNumber: 2 }],
      pendingRetakes: [{ id: "si9", childId: "c1", childName: "Ada" }],
    });
    expect(out.find((n) => n.type === "milestone")?.dedupeKey).toBe("milestone:ph1");
    expect(out.find((n) => n.type === "retake_suggestion")?.dedupeKey).toBe("retake:si9");
  });

  it("reminds only for stale children (never played, or beyond threshold)", () => {
    const out = planNotifications({
      ...base,
      children: [
        { id: "fresh", name: "Fresh", lastSessionAt: now - 1 * DAY }, // within threshold → no reminder
        { id: "stale", name: "Stale", lastSessionAt: now - 5 * DAY }, // beyond → reminder
        { id: "never", name: "Never", lastSessionAt: null }, // never → reminder
      ],
    });
    const reminders = out.filter((n) => n.type === "session_reminder").map((n) => n.childId).sort();
    expect(reminders).toEqual(["never", "stale"]);
  });

  it("reminder dedupe key is per child per period", () => {
    const out = planNotifications({ ...base, children: [{ id: "x", name: "X", lastSessionAt: null }] });
    expect(out.find((n) => n.type === "session_reminder")?.dedupeKey).toBe("reminder:x:d20833");
  });
});

describe("reassessment_due (§11 check-in nudge)", () => {
  it("plans a once-per-assessment nudge when the interval has elapsed", () => {
    const planned = planNotifications({
      ...base,
      pendingReassessments: [{ id: "assess-1", childId: "c1", childName: "Eniola" }],
    });
    const nudge = planned.find((p) => p.type === "reassessment_due");
    expect(nudge).toBeDefined();
    expect(nudge!.dedupeKey).toBe("reassess:assess-1");
    expect(nudge!.subject).toContain("how things are going");
    // §11: never framed as "retake the test".
    expect(nudge!.subject.toLowerCase()).not.toContain("retake");
    expect(nudge!.body.toLowerCase()).not.toContain("test");
  });
});
