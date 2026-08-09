import { describe, expect, it } from "vitest";

import { parseSessionScript } from "@/lib/engine/session-script";
import { PHASE_NAMES } from "@/lib/compass/contract";
import { ALL_PHASES } from "./index";

/**
 * Structural validation of the transcribed curriculum content. This does NOT
 * validate clinical correctness (that's the owner's review); it guarantees that
 * everything we seed is runnable by the session runtime and consistent with the
 * §13.2 canonical phase identity.
 */
describe("curriculum content seeds", () => {
  it("every session script parses as runnable (script_version 1)", () => {
    for (const phase of ALL_PHASES) {
      for (const s of phase.sessions) {
        const parsed = parseSessionScript(s.script);
        expect(parsed, `phase ${phase.phase_number} session ${s.session_number} (${s.age_bracket ?? "all"})`).not.toBeNull();
      }
    }
  });

  it("all 12 phases are present exactly once", () => {
    const numbers = ALL_PHASES.map((p) => p.phase_number).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("phase names match the §13.2 canonical names", () => {
    for (const phase of ALL_PHASES) {
      expect(phase.name).toBe(PHASE_NAMES[phase.phase_number]);
    }
  });

  it("session identity (number + bracket) is unique within each phase", () => {
    for (const phase of ALL_PHASES) {
      const seen = new Set<string>();
      for (const s of phase.sessions) {
        const key = `${s.session_number}|${s.age_bracket ?? "all"}`;
        expect(seen.has(key), `duplicate ${key} in phase ${phase.phase_number}`).toBe(false);
        seen.add(key);
      }
    }
  });

  it("simplified variants exist where the phase declares one", () => {
    for (const phase of ALL_PHASES) {
      if (!phase.has_simplified_session) continue;
      for (const s of phase.sessions) {
        expect(s.script.simplified, `phase ${phase.phase_number} session ${s.session_number} missing simplified`).toBeDefined();
      }
    }
  });

  it("credit values stay on the 0–100 scale", () => {
    for (const phase of ALL_PHASES) {
      for (const s of phase.sessions) {
        const variants = [s.script, s.script.simplified].filter(Boolean);
        for (const v of variants) {
          for (const o of v!.checkin.options) {
            expect(o.credit_value).toBeGreaterThanOrEqual(0);
            expect(o.credit_value).toBeLessThanOrEqual(100);
          }
        }
      }
    }
  });
});
