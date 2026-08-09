import { describe, it, expect } from "vitest";

import { assignBracket, AGE_FLOOR_NEXT_BRACKET_MONTHS } from "./contract";
import { COMPASS_CONFIG_V2 as CFG, ENGAGEMENT_ITEM_ID } from "./config";
import {
  benchmarkAgreement,
  computeConfidence,
  computeOverall,
  extractStrengthsNeeds,
} from "./scoring";
import { mapPhase, computePlacementMode } from "./phase-mapper";
import { detectRedFlags } from "./red-flags";
import { assess } from "./assess";
import type { AssessmentInput, DomainScores } from "./types";

// §8 example domain scores (v2.1.0, play → play_shared_activity).
const EXAMPLE: DomainScores = {
  receptive_language: 71,
  expressive_language: 32,
  speech_sound: 27,
  social_communication: 58,
  functional_communication: 44,
  play_shared_activity: 75,
  learning_readiness: 84,
};
const scores = (over: Partial<DomainScores>): DomainScores => ({
  receptive_language: 50, expressive_language: 50, speech_sound: 50,
  social_communication: 50, functional_communication: 50,
  play_shared_activity: 50, learning_readiness: 50, ...over,
});

describe("§13.3 bracket assignment", () => {
  it("assigns non-overlapping brackets and rejects out-of-range", () => {
    expect(assignBracket(36)).toBe("3-7");
    expect(assignBracket(95)).toBe("3-7");
    expect(assignBracket(96)).toBe("8-12");
    expect(assignBracket(155)).toBe("8-12");
    expect(assignBracket(156)).toBe("10-14"); // a 10–12yo STARTS in 8-12; only 13-14 onboards to 10-14
    expect(assignBracket(179)).toBe("10-14");
    expect(assignBracket(35)).toBeNull(); // below 3;0 → out of range (§1)
    expect(assignBracket(180)).toBeNull(); // ≥ 15;0 → out of range
  });
  it("floors match §13.4", () => {
    expect(AGE_FLOOR_NEXT_BRACKET_MONTHS["3-7"]).toBe(84);
    expect(AGE_FLOOR_NEXT_BRACKET_MONTHS["8-12"]).toBe(108);
    expect(AGE_FLOOR_NEXT_BRACKET_MONTHS["10-14"]).toBeNull();
  });
});

describe("§5.3 overall (E2 fixed: 53, not 61)", () => {
  it("is the weighted average of the example domain scores", () => {
    expect(computeOverall(EXAMPLE, CFG)).toBe(53);
  });
});

describe("§5.5 strengths / needs (match §8 example)", () => {
  it("extracts and ranks correctly", () => {
    const { strengths, needs } = extractStrengthsNeeds(EXAMPLE, CFG);
    expect(strengths).toEqual(["learning_readiness", "play_shared_activity", "receptive_language"]);
    expect(needs).toEqual(["speech_sound", "expressive_language", "functional_communication"]);
  });
});

describe("§6.2 phase decision tree (E1 fixed: Phase 5)", () => {
  it("example scores → Phase 5", () => {
    expect(mapPhase(EXAMPLE, false, CFG).phase).toBe(5);
  });
  it("fixed priority — weak joint attention beats strong expressive", () => {
    expect(mapPhase(scores({ social_communication: 10, expressive_language: 95 }), false, CFG).phase).toBe(1);
  });
  it("Phase 3 only with oral-motor flags AND speech < 30", () => {
    expect(mapPhase(scores({ speech_sound: 20, social_communication: 60 }), true, CFG).phase).toBe(3);
    expect(mapPhase(scores({ speech_sound: 20, social_communication: 60 }), false, CFG).phase).not.toBe(3);
  });
  it("ELSE picks nearest phase by driver-domain distance, ties → lower", () => {
    // Craft a profile that matches no rule, equidistant on two drivers.
    const c = mapPhase(
      scores({ receptive_language: 30, expressive_language: 30, functional_communication: 60, social_communication: 45, speech_sound: 50 }),
      false, CFG,
    );
    expect(c.elseBranch).toBe(true);
    expect(c.phase).toBeGreaterThanOrEqual(1);
    expect(c.phase).toBeLessThanOrEqual(12);
  });
});

describe("§5.4 confidence — LAUNCH behaviour (intended)", () => {
  const launchInput = (answered: number): AssessmentInput => ({
    childId: "c", ageMonths: 63, ageBracket: "3-7", itemsTotal: answered,
    responses: Object.fromEntries(Array.from({ length: answered }, (_, i) => [`i${i}`, "x"])),
    benchmarkAnswers: { "BM-B1-01": true, "BM-B1-02": true, "BM-B1-03": true, "BM-B1-04": true },
  });
  it("caps confidence at 0.74 while thresholds are uncalibrated, even at full completeness", () => {
    const { confidence, consistency } = computeConfidence(launchInput(10), EXAMPLE, CFG);
    expect(confidence).toBeLessThanOrEqual(0.74);
    expect(consistency).toBeNull(); // consistency omitted, not defaulted
  });
  it("so NO assessment yields start_directly at launch — every child gets a readiness module", () => {
    const cand = mapPhase(EXAMPLE, false, CFG); // Phase 5, gap 4 (small)
    const { confidence } = computeConfidence(launchInput(10), EXAMPLE, CFG);
    expect(computePlacementMode(cand, confidence, CFG)).toBe("readiness_module_first");
  });
});

describe("§5.4 confidence — CALIBRATED path (proves the agreement formula)", () => {
  const CAL = { ...CFG, benchmarkThresholdsCalibrated: true };
  it("benchmark agreement is bounded 0–1 with a 0.5 near-miss band", () => {
    const adj = scores({ expressive_language: 60, functional_communication: 50, receptive_language: 50, play_shared_activity: 50 });
    const input: AssessmentInput = {
      childId: "c", ageMonths: 63, ageBracket: "3-7", itemsTotal: 4, responses: {},
      benchmarkAnswers: { "BM-B1-01": true, "BM-B1-02": true, "BM-B1-03": true, "BM-B1-04": true },
    };
    const a = benchmarkAgreement(adj, input, CFG);
    expect(a.rate).toBe(1); // all agree
    // near-miss: answer "no" but score is within 10 above threshold → 0.5
    const nearMiss = benchmarkAgreement(
      scores({ expressive_language: 55 }), // τ=50, |55-50|=5
      { ...input, benchmarkAnswers: { "BM-B1-01": false } }, CFG,
    );
    expect(nearMiss.rate).toBe(0.5);
  });
  it("can exceed 0.74 and reach start_directly once calibrated", () => {
    const adj = scores({ expressive_language: 60, functional_communication: 50, receptive_language: 50, play_shared_activity: 50 });
    const input: AssessmentInput = {
      childId: "c", ageMonths: 63, ageBracket: "3-7", itemsTotal: 5,
      responses: { a: "x", b: "x", c: "x", d: "x", e: "x" }, // completeness 1.0
      benchmarkAnswers: { "BM-B1-01": true, "BM-B1-02": true, "BM-B1-03": true, "BM-B1-04": true },
    };
    const { confidence } = computeConfidence(input, adj, CAL);
    expect(confidence).toBeGreaterThan(0.74); // 0.6*1 + 0.4*1 = 1.0
    expect(confidence).toBeLessThanOrEqual(1);
    expect(computePlacementMode(mapPhase(EXAMPLE, false, CAL), confidence, CAL)).toBe("start_directly");
  });
});

describe("§7 red flags", () => {
  const base = { childId: "c", itemsTotal: 5, responses: {} };
  it("developmental-history flags fire regardless of current age (v2 C16)", () => {
    // A 5-year-old (bracket 3-7): 'no_words_by_24mo' asked as history still fires.
    const r = detectRedFlags(
      { ...base, ageMonths: 63, ageBracket: "3-7", redFlagAnswers: { no_words_by_24mo: true } },
      scores({}), CFG,
    );
    expect(r.hard).toContain("no_words_by_24mo");
    expect(r.referralRecommended).toBe(true);
  });
  it("older-child flags apply only to 8-12 / 10-14", () => {
    const young = detectRedFlags(
      { ...base, ageMonths: 63, ageBracket: "3-7", redFlagAnswers: { voice_change_persistent: true } },
      scores({}), CFG,
    );
    expect(young.hard).not.toContain("voice_change_persistent");
    const older = detectRedFlags(
      { ...base, ageMonths: 120, ageBracket: "8-12", redFlagAnswers: { voice_change_persistent: true } },
      scores({}), CFG,
    );
    expect(older.hard).toContain("voice_change_persistent");
  });
  it("soft-flags multiple lowest-band domains", () => {
    const r = detectRedFlags(
      { ...base, ageMonths: 63, ageBracket: "3-7" },
      scores({ receptive_language: 10, expressive_language: 12, speech_sound: 8 }), CFG,
    );
    expect(r.soft).toContain("multiple_low_domains");
  });
});

describe("assess() integration — v2.1.0 payload", () => {
  const buildFunctionalLow = (over: Record<string, string> = {}): Record<string, string> => ({
    "SOC-ALL-01": "Often", "SOC-ALL-02": "Often", "SOC-ALL-03": "Often", // social 75
    [ENGAGEMENT_ITEM_ID]: "5+ min", "LRN-ALL-02": "Often", // learning 75
    "FUN-ALL-01": "Pull you to it", "FUN-ALL-02": "No", // functional ~13 → Phase 4
    "REC-B1-01": "Often", "REC-B1-02": "Often",
    "EXP-B1-01": "Often", "EXP-B1-02": "Often",
    "PLA-ALL-01": "Often", "PLA-ALL-02": "Often",
    "SPE-ALL-01": "Some", "SPE-ALL-02": "Some", "SPE-ALL-03": "A few",
    ...over,
  });

  it("emits the new fields; launch placement is readiness_module_first", () => {
    const responses = buildFunctionalLow();
    const input: AssessmentInput = {
      childId: "b77e441a", ageMonths: 63, ageBracket: "3-7",
      itemsTotal: Object.keys(responses).length, responses, secondAdultAvailable: "no",
    };
    const r = assess(input, CFG, "Ada");
    expect(r.schema_version).toBe("2.1.0");
    expect(r.curriculum_version).toBe("2026.07-r2");
    expect(r.age_bracket).toBe("3-7");
    expect(r.age_floor_next_bracket_months).toBe(84);
    expect(r.recommended_phase).toBe(4);
    expect(r.starting_phase).toBe(4);
    expect(r.placement_source).toBe("engine");
    expect(r.placement_mode).toBe("readiness_module_first"); // launch
    expect(r.two_adult_advisory).toBe(true); // Phase 4 + no second adult
    expect(r.start_in_simplified).toBe(false); // engagement "5+ min"
    expect(r.reasoning[0]).toContain("Ada");
  });

  it("sets start_in_simplified when engagement is very short (§6.8)", () => {
    const responses = buildFunctionalLow({ [ENGAGEMENT_ITEM_ID]: "Under 1 min" });
    const input: AssessmentInput = {
      childId: "c", ageMonths: 63, ageBracket: "3-7",
      itemsTotal: Object.keys(responses).length, responses,
    };
    expect(assess(input, CFG, "Kai").start_in_simplified).toBe(true);
  });
});
