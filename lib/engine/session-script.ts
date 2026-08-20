/**
 * RL behavior-script contract — the SHAPE of curriculum_content.sessions.content_json.
 *
 * This file is the code side of the content-vs-code boundary (CLAUDE.md): it
 * defines the versioned structure the runtime can execute; the clinical content
 * itself (instructions, question wording, credit values, intervals) lives in
 * seeded, versioned content records and is never authored in application code.
 *
 * Per ARCHITECTURE.md, each session's RL behavior is its own versioned config —
 * trigger interval, question text, answer options, credit value per option —
 * because the variance between sessions (60s vs 15s intervals, 2- vs 3- vs
 * 4-option check-ins) is data, not special-cased components. The runtime UI
 * renders whatever a valid script says; it makes no clinical decisions.
 *
 * DETERMINISTIC RULES ENGINE, not ML (CLAUDE.md). Credit values recorded at
 * check-in time come from the version-pinned script; /sessions/complete
 * recomputes the score server-side from the recorded rows.
 */

/** One selectable answer at a check-in. `credit_value` is 0–100 (the 5-level
 *  base scale or a phase's exception scale — both output 0–100). */
export interface CheckinOption {
  label: string;
  /** Stored verbatim to session_checkins.response_category (clinical taxonomy,
   *  e.g. "Spontaneous", "Prompted", "Reversion-to-Single-Card"). */
  response_category: string;
  credit_value: number;
}

/** Per-trial bonus capture (Scoring Appendix §3). Which kind a session uses —
 *  and its caregiver-facing prompt — is content; the observation shapes match
 *  what /sessions/complete consumes (attribute {added}, stem {correct},
 *  approximation {target, step}). */
export interface ScriptBonus {
  kind: "attribute" | "stem" | "approximation";
  /** Caregiver-facing question, e.g. "Did they add a describing word (e.g. 'big cookie')?" */
  prompt: string;
  /** approximation only: the target sounds being shaped this session. */
  targets?: string[];
  /** approximation only: labels for the shaping steps, lowest→highest
   *  (index+1 is recorded as the step number). */
  step_labels?: string[];
}

/** One caregiver-facing activity step (may address the in-room helper too). */
export interface ScriptStep {
  title: string;
  instruction: string;
}

/** A runnable variant — the main session and the Simplified Session share this
 *  shape (the Simplified one is typically shorter/gentler content). */
export interface ScriptVariant {
  title: string;
  /** Short caregiver-facing framing shown before starting. */
  overview?: string;
  /** What to have ready before starting. */
  materials?: string[];
  steps: ScriptStep[];
  checkin: {
    /** Seconds between check-in prompts (the RL trigger interval). */
    interval_seconds: number;
    /** Planned number of check-ins for a full session. */
    count: number;
    question: string;
    options: CheckinOption[];
  };
  bonus?: ScriptBonus;
  /**
   * Phases 3 & 12 only (owner spec): reference to the looping 2D mouth-shape
   * animation modelling this exercise's target. Content-driven — the mapping
   * lives HERE in versioned content, never in runtime code. Optional: no ref,
   * no animation. Assets ship only after SLP sign-off of the shapes; until
   * then refs point at not-yet-present files and the player hides itself.
   */
  mouth_animation_ref?: string;
}

/** content_json root. `simplified` is the session's Simplified variant
 *  (every phase has one per the curriculum); /sessions/start decides which
 *  variant to serve — the client never chooses. */
export interface SessionScript extends ScriptVariant {
  script_version: 1;
  simplified?: ScriptVariant;
}

function isOption(o: unknown): o is CheckinOption {
  if (typeof o !== "object" || o === null) return false;
  const x = o as Record<string, unknown>;
  return (
    typeof x.label === "string" &&
    typeof x.response_category === "string" &&
    typeof x.credit_value === "number" &&
    x.credit_value >= 0 &&
    x.credit_value <= 100
  );
}

function isVariant(v: unknown): v is ScriptVariant {
  if (typeof v !== "object" || v === null) return false;
  const x = v as Record<string, unknown>;
  if (typeof x.title !== "string") return false;
  if (!Array.isArray(x.steps) || x.steps.some((s) => typeof (s as ScriptStep)?.title !== "string" || typeof (s as ScriptStep)?.instruction !== "string")) return false;
  const c = x.checkin as Record<string, unknown> | undefined;
  if (typeof c !== "object" || c === null) return false;
  if (typeof c.interval_seconds !== "number" || c.interval_seconds <= 0) return false;
  if (typeof c.count !== "number" || c.count < 1) return false;
  if (typeof c.question !== "string") return false;
  if (!Array.isArray(c.options) || c.options.length < 2 || !c.options.every(isOption)) return false;
  if (x.bonus !== undefined) {
    const b = x.bonus as Record<string, unknown>;
    if (!["attribute", "stem", "approximation"].includes(b.kind as string) || typeof b.prompt !== "string") return false;
  }
  return true;
}

/**
 * Validate a content_json blob as a runnable script. Returns null when the
 * shape doesn't match — the runtime shows a "content not runnable" message and
 * the inconsistency is flagged to content review, never patched in code.
 */
export function parseSessionScript(contentJson: unknown): SessionScript | null {
  if (typeof contentJson !== "object" || contentJson === null) return null;
  const x = contentJson as Record<string, unknown>;
  if (x.script_version !== 1) return null;
  if (!isVariant(x)) return null;
  if (x.simplified !== undefined && !isVariant(x.simplified)) return null;
  if (x.mouth_animation_ref !== undefined && typeof x.mouth_animation_ref !== "string") return null;
  return contentJson as SessionScript;
}
