/**
 * "Ask Verbly" — templated progress assistant. NO language model, no external
 * API (owner spec): answers are fixed sentence templates filled with app data
 * from /api/ask-verbly/[child_id]. Swappable for an LLM later without touching
 * the UI — that is future work, explicitly not now.
 */

export interface AskFacts {
  child_name: string;
  phase_number: number | null;
  phase_name: string | null;
  phase_one_liner: string | null;
  phase_guidance: string | null;
  sessions_completed: number;
  first_score: number | null;
  latest_score: number | null;
  best_score: number | null;
  last_outcome: string | null;
}

export const ASK_QUESTIONS = [
  { id: "current_phase", label: "Current phase" },
  { id: "recent_progress", label: "Recent progress" },
  { id: "phase_about", label: "What is this phase about?" },
  { id: "sessions_going", label: "How are sessions going?" },
] as const;
export type AskQuestionId = (typeof ASK_QUESTIONS)[number]["id"];

/** Referral guardrail (owner spec, verbatim response): clinical / diagnostic /
 *  prognosis intent is never answered from templates. */
const CLINICAL_INTENT =
  /\b(autis\w*|diagnos\w*|worried|worry|worrying|concern\w*|normal|prognosis|why can'?t|should i be|wrong with|behind|disorder|delay\w*)\b/i;

export const REFERRAL_ANSWER =
  "Ask Verbly can tell you about your child's progress and activities, but questions like this are best answered by a speech-language professional. If you have concerns, please share them with an SLP.";

export function isClinicalIntent(freeText: string): boolean {
  return CLINICAL_INTENT.test(freeText);
}

const OUTCOME_PLAIN: Record<string, string> = {
  advance:
    "a pass — a lovely session. Keeping that rhythm going is exactly how the next phase gets closer.",
  retake:
    "one to try again — completely normal. Repeating an activity is how these skills settle in, and the score often jumps on the next go.",
  simplify_triggered:
    "a sign to go gentler — the next session uses an easier version of the same activity, so it can be built back up step by step.",
};

export function buildAnswer(question: AskQuestionId, f: AskFacts): string {
  if (f.phase_number === null || f.phase_name === null) {
    return `${f.child_name} hasn't been placed in a phase yet — the Communication Compass picks the starting point.`;
  }
  switch (question) {
    case "current_phase":
      return (
        `${f.child_name} is on Phase ${f.phase_number}: ${f.phase_name}.` +
        (f.phase_one_liner ? ` This phase works on: ${f.phase_one_liner}` : "")
      );
    case "recent_progress": {
      if (f.sessions_completed === 0)
        return `${f.child_name} hasn't completed any sessions in this phase yet — the first one is ready when you are.`;
      const range =
        f.first_score !== null && f.latest_score !== null && f.sessions_completed > 1
          ? ` Scores have gone from ${f.first_score}% to ${f.latest_score}%.`
          : f.latest_score !== null
            ? ` The latest score was ${f.latest_score}%.`
            : "";
      return `${f.child_name} has completed ${f.sessions_completed} session${f.sessions_completed === 1 ? "" : "s"} in this phase.${range}`;
    }
    case "phase_about":
      // The phase_guidance summary, verbatim (owner spec).
      return f.phase_guidance ?? f.phase_one_liner ?? `Phase ${f.phase_number} is ${f.phase_name}.`;
    case "sessions_going": {
      if (!f.last_outcome)
        return `No finished sessions in this phase yet — nothing to report until the first one is done.`;
      const plain = OUTCOME_PLAIN[f.last_outcome] ?? "recorded.";
      return `${f.child_name}'s last session was ${plain}`;
    }
  }
}
