import { describe, it, expect } from "vitest";

import {
  READINESS_CONTENT_V1,
  READINESS_PASS_YES_MIN,
} from "@/content/readiness/readiness-checks";
import { scoreReadiness } from "./score";

const P5 = READINESS_CONTENT_V1.phases.find((p) => p.phase_number === 5)!;
const allYes = (ids: string[], except: string[] = []) =>
  Object.fromEntries(ids.map((id) => [id, !except.includes(id)]));
const ids = P5.items.map((i) => i.id);
const hardId = P5.items.find((i) => i.hard)!.id;
const softId = P5.items.find((i) => !i.hard)!.id;

describe("readiness content — structural invariants (approved v1.0.0)", () => {
  it("covers all 12 phases with exactly 5 items each", () => {
    expect(READINESS_CONTENT_V1.phases.map((p) => p.phase_number)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
    for (const p of READINESS_CONTENT_V1.phases) expect(p.items).toHaveLength(5);
  });

  it("has exactly ONE hard item and a flag phrase per phase", () => {
    for (const p of READINESS_CONTENT_V1.phases) {
      expect(p.items.filter((i) => i.hard)).toHaveLength(1);
      expect(p.flag_phrase.length).toBeGreaterThan(0);
    }
  });

  it("has globally unique item ids in R<phase>.<n> form", () => {
    const all = READINESS_CONTENT_V1.phases.flatMap((p) => p.items.map((i) => i.id));
    expect(new Set(all).size).toBe(60);
    for (const p of READINESS_CONTENT_V1.phases)
      p.items.forEach((i, n) => expect(i.id).toBe(`R${p.phase_number}.${n + 1}`));
  });

  it("encodes owner edit E2: Phase 12 hard item is R12.1", () => {
    const p12 = READINESS_CONTENT_V1.phases.find((p) => p.phase_number === 12)!;
    expect(p12.items.find((i) => i.hard)!.id).toBe("R12.1");
    expect(p12.flag_phrase).toBe("communicating without relying on speech");
  });
});

describe("scoreReadiness — owner rulings 3 & 4", () => {
  it("5/5 yes passes with no flag", () => {
    const r = scoreReadiness(P5, allYes(ids), READINESS_PASS_YES_MIN);
    expect(r).toMatchObject({ yesCount: 5, passed: true, hardItemFlagged: false, flagPhrase: null });
  });

  it("4/5 with a SOFT no passes, no flag", () => {
    const r = scoreReadiness(P5, allYes(ids, [softId]), READINESS_PASS_YES_MIN);
    expect(r).toMatchObject({ yesCount: 4, passed: true, hardItemFlagged: false });
  });

  it("4/5 with the HARD no passes WITH the keep-an-eye flag (never blocks)", () => {
    const r = scoreReadiness(P5, allYes(ids, [hardId]), READINESS_PASS_YES_MIN);
    expect(r).toMatchObject({ yesCount: 4, passed: true, hardItemFlagged: true });
    expect(r.flagPhrase).toBe("the basic picture exchange");
  });

  it("3/5 fails (→ Simplified start; phase unchanged) and carries no flag", () => {
    const r = scoreReadiness(P5, allYes(ids, [hardId, softId]), READINESS_PASS_YES_MIN);
    expect(r).toMatchObject({ yesCount: 3, passed: false, hardItemFlagged: false, flagPhrase: null });
  });

  it("unanswered items count as not-yes", () => {
    const r = scoreReadiness(P5, { [ids[0]]: true }, READINESS_PASS_YES_MIN);
    expect(r).toMatchObject({ yesCount: 1, answeredCount: 1, passed: false });
  });
});
