import { SCORED_DOMAINS, type AssessmentInput, type CompassConfig, type DomainScores } from "./types";

/** §7 red-flag / referral logic. Checked independently of scoring; a hard flag
 *  always surfaces the referral message and never blocks a placement. */

const ORAL_MOTOR_CODES: Record<string, string> = {
  "ORM-ALL-01": "drooling",
  "ORM-ALL-02": "chewing_difficulty",
};

export function computeOralMotorFlags(input: AssessmentInput, config: CompassConfig): string[] {
  const flags: string[] = [];
  for (const item of config.items) {
    if (item.domain !== "oral_motor") continue;
    const value = input.responses[item.id];
    if (value === undefined) continue;
    if ((item.points[value] ?? 0) > 0) flags.push(ORAL_MOTOR_CODES[item.id] ?? item.id);
  }
  return flags;
}

export interface RedFlagResult {
  hard: string[];
  soft: string[];
  referralRecommended: boolean;
}

/**
 * §7 hard + soft flags.
 * - §7.1 age-invariant: asked present-tense at every bracket.
 * - §7.2 developmental-history: asked once as history; a "yes" fires REGARDLESS
 *   of the child's current age (v2 C16 — no age-gating, unlike v1).
 * - §7.3 older-child: only for brackets 8-12 / 10-14.
 */
export function detectRedFlags(
  input: AssessmentInput,
  adjusted: DomainScores,
  config: CompassConfig,
): RedFlagResult {
  const answers = input.redFlagAnswers ?? {};
  const hard: string[] = [];

  for (const def of config.redFlagDefs) {
    const appliesToBracket =
      def.brackets.includes("ALL") || def.brackets.includes(input.ageBracket);
    if (!appliesToBracket) continue; // older_child flags skipped for bracket 3-7
    const present =
      def.code === "free_text_concern" ? input.freeTextConcern === true : answers[def.code] === true;
    if (present) hard.push(def.code);
  }

  const soft: string[] = [];
  // §7.4 "Multiple domains scoring in the lowest band simultaneously."
  if (SCORED_DOMAINS.filter((d) => adjusted[d] < 35).length >= 3) soft.push("multiple_low_domains");
  // Other §7.4 soft flags (speech avoidance §3.3, unfamiliar-vs-familiar gap,
  // persistently-low confidence across two assessments) need item-level or
  // history signals wired at the endpoint layer — TODO with the endpoints slice.

  return { hard, soft, referralRecommended: hard.length > 0 };
}
