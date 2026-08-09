import type { ScriptVariant } from "@/lib/engine/session-script";
import type { PhaseSeed } from "./types";

/**
 * PHASE 8 — PECS PHASE 5: RESPONSIVE REQUESTING (ANSWERING QUESTIONS)
 * Transcribed from therapy_Exercises_12_phases_with_Simplified_Sections_2.docx.
 * CLINICAL CONTENT — verbatim where the source gives wording; derived text is
 * marked "derived (F2)".
 *
 * EXCEPTION SCALE (Appendix §2b — response latency):
 *   100 Spontaneous Response (0–5s, unprompted)
 *    75 Delayed Response (6–15s, unprompted)
 *    25 Prompted Response (a prompt was required, regardless of speed)
 *     0 No Response (>15s)
 *
 * ── FLAGS FOR OWNER ─────────────────────────────────────────────────────────
 * P8-a  The source's per-trial 5-second countdown ("RL displays a 5-second
 *       countdown when the caregiver taps 'Question Asked'") is an unbuilt
 *       runtime feature — the caregiver times the window themselves; the
 *       check-in captures the latency band after the fact.
 * P8-b  Spontaneous-vs-question-prompted dual counters and the auto-flag when
 *       spontaneous rate drops below 40% (Session 3) are unbuilt features;
 *       the trial-balance rule is carried in the steps.
 * ────────────────────────────────────────────────────────────────────────────
 */

const MINUTE_PACING = { interval_seconds: 60, count: 10 }; // derived: 10–12 trials over 10 minutes

// Appendix §2b latency scale (derived labels).
const LATENCY_OPTIONS = [
  { label: "Responded within 5 seconds — unprompted", response_category: "Spontaneous Response (0-5s)", credit_value: 100 },
  { label: "Responded in 6–15 seconds — unprompted", response_category: "Delayed Response (6-15s)", credit_value: 75 },
  { label: "Needed a gesture toward the binder", response_category: "Prompted Response", credit_value: 25 },
  { label: "No response within 15 seconds", response_category: "No Response (>15s)", credit_value: 0 },
];

// Simplified Session — Question Paired with an Immediate Gesture (shared, F7).
const SIMPLIFIED: ScriptVariant = {
  title: "Question Paired with an Immediate Gesture",
  overview:
    "Pairs the spoken question with a gesture toward the binder every time, rather than holding a silent waiting window, so the child is never left without support while learning to respond.",
  materials: ["Only 2–3 item cards on the binder — reducing the visual search the child must complete before responding"],
  steps: [
    {
      title: "Question + gesture together",
      instruction:
        "Hold the preferred item in view and ask 'What do you want?' — and, at the very same moment, gesture toward the binder.",
    },
    {
      title: "No silent window",
      instruction:
        "Do not hold the 5-second silent waiting window used in the standard session — the gesture is given alongside the question every time.",
    },
    {
      title: "Reward",
      instruction:
        "When the child builds and exchanges the strip: celebrate warmly, read the strip aloud, and give the item at once.",
    },
    {
      title: "Keep it stable",
      instruction:
        "Run 8–10 question-and-gesture trials in a row with the same caregiver and setting before varying anything else.",
    },
  ],
  checkin: {
    ...MINUTE_PACING,
    question: "Did the child complete the exchange after the paired question and gesture?", // verbatim intent
    options: [
      { label: "Yes", response_category: "Completed Exchange", credit_value: 100 },
      { label: "No", response_category: "Not Completed", credit_value: 0 },
    ],
  },
};

export const PHASE_08: PhaseSeed = {
  phase_number: 8,
  name: "PECS Phase 5: Responsive Requesting", // §13.2 canonical
  clinical_goal:
    "PECS Phase 5 introduces responsive communication — answering a direct question. The child learns to respond to the spoken question 'What do you want?' by building and exchanging a sentence strip. This phase is the bridge between requesting and conversation; spontaneous requesting must be maintained alongside responsive requesting throughout.",
  phase_guidance: [
    "**Progress Indicators — What the Caregiver Should Look For**",
    "- Child responds to 'What do you want?' by building and handing over a sentence strip within 5 seconds — without additional prompting.",
    "- Child does not become confused or inactive when the question is asked.",
    "- Child continues to initiate spontaneous exchanges independently (from Phases 1–4) alongside responding to questions.",
    "- Child generalises the response to different communication partners asking the question.",
    "- Child begins to vocalise any sounds during the response — document every attempt.",
    "",
    "**Important Therapy Tips**",
    "- 'What do you want?' must be delivered without gesture, without pointing, and without repeating. The spoken question alone is the cue.",
    "- Never allow responsive requesting to replace spontaneous requesting. A child who only communicates when asked is not yet a functional communicator.",
    "- If the child becomes dependent on the question as a prompt, reduce question-prompted trials significantly and increase spontaneous trial opportunities.",
    "- Celebrate any vocalisation that co-occurs with a strip exchange — even a single vowel sound paired with the exchange is the beginning of speech. Document it, date it, and report it to the SLP.",
    "- Generalise the question across all daily routines: breakfast, playtime, getting dressed, bath time.",
  ].join("\n"),
  has_simplified_session: true,
  content_version: 1,
  sessions: [
    // ── Session 1 — Responding to 'What Do You Want?' ────────────────────────
    {
      session_number: 1,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Responding to 'What Do You Want?'",
        overview:
          "Teach the child to consistently build and exchange a sentence strip in direct response to the spoken question 'What do you want?' — without any additional gestural, verbal, or physical prompting beyond the question itself. The question is delivered clearly ONCE; allow a 5-second response window, then use the minimum prompt (a single gesture toward the binder) and record as prompted.",
        materials: [
          "PECS binder with 3–5 item cards and the sentence strip with 'I want' pre-attached — within the child's reach",
          "All corresponding items, ready and visible with Caregiver A",
        ],
        steps: [
          {
            title: "Ask before they initiate",
            instruction:
              "Caregiver A holds a preferred item in view. Before the child can spontaneously initiate an exchange, ask clearly: 'What do you want?'",
          },
          {
            title: "Hold the window",
            instruction:
              "Wait. Do not gesture toward the binder, point at items, or repeat the question. Hold the 5-second response window.", // P8-a
          },
          {
            title: "Reward the response",
            instruction:
              "If the child builds the sentence strip and exchanges it: celebrate — read the strip aloud: 'I want [item]! Here you go!' and give the item immediately.",
          },
          {
            title: "Minimum prompt after 5s",
            instruction:
              "If the child does not respond within 5 seconds: Caregiver B uses a single gesture toward the binder (no speech). Record as a prompted response.",
          },
          {
            title: "Keep spontaneity alive",
            instruction:
              "Alternate trials between question-prompted exchanges and spontaneous exchanges (no question asked — child must initiate independently). Do not let Phase 5 replace spontaneous requesting — both must be active.",
          },
          {
            title: "Trial count",
            instruction: "Run 10–12 trials with at least 5 question-prompted trials per session.",
          },
        ],
        checkin: {
          ...MINUTE_PACING,
          question: "How did the child respond to 'What do you want?'", // derived (F2)
          options: LATENCY_OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 2 — Generalising Across Partners and Settings ────────────────
    {
      session_number: 2,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Generalising the Response Across Partners and Settings",
        overview:
          "Ensure the child can respond to 'What do you want?' from different communication partners, in different physical settings, and across a wider variety of items — confirming that the responsive requesting skill is genuinely generalised and not limited to one person or environment.",
        materials: [
          "At least two different adults who will take turns asking 'What do you want?' across the session",
          "If possible, a different room or table from Session 1 for part of the session",
          "5–6 item cards on the binder to increase demand and prevent rote selection",
        ],
        steps: [
          {
            title: "Partner 1",
            instruction: "Partner 1 asks 'What do you want?' and waits for the sentence strip exchange. Runs 3–4 trials.",
          },
          {
            title: "Partner 2",
            instruction:
              "After 3–4 trials, Partner 2 takes over and asks the same question — same delivery, same response window.",
          },
          {
            title: "Vary the items",
            instruction:
              "Vary the items offered across trials to ensure the child is responding to genuine current want rather than habit.",
          },
          {
            title: "Keep spontaneous trials",
            instruction:
              "Continue to include spontaneous trials (no question asked) to maintain independent requesting throughout.",
          },
          {
            title: "Change the setting",
            instruction:
              "For the final 2–3 trials: move to a different setting (different room or seating arrangement) and run both a question-prompted trial and a spontaneous trial.",
          },
          {
            title: "Target",
            instruction: "By end of session: child responds correctly to both partners within 5 seconds across 80%+ of trials.",
          },
        ],
        checkin: {
          ...MINUTE_PACING,
          question: "How did the child respond to the question this time?", // derived (F2)
          options: LATENCY_OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 3 — Maintaining Spontaneous Alongside Responsive ─────────────
    {
      session_number: 3,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Maintaining Spontaneous Requesting Alongside Responsive Requesting",
        overview:
          "Confirm that the child maintains spontaneous communication initiation (without being asked) while also responding reliably to direct questions. Responsive requesting must never replace spontaneous requesting — if spontaneous initiation drops, the balance of trials must be adjusted.",
        materials: ["PECS binder, sentence strip, and preferred items as in Sessions 1–2"],
        steps: [
          {
            title: "Mixed trials",
            instruction:
              "Run mixed trials throughout the session: some where no question is asked (child must initiate spontaneously) and some where 'What do you want?' is asked first.",
          },
          {
            title: "Question sparingly",
            instruction:
              "Do not ask the question every time — allow the child to initiate unprompted for the majority of trials, then introduce the question selectively.",
          },
          {
            title: "Rebalance if needed",
            instruction:
              "If the child stops initiating spontaneously and begins waiting for the question: immediately shift the trial balance — run 3–4 spontaneous trials in a row without any question-prompted trials until independent initiation re-emerges.", // P8-b
          },
          {
            title: "Equal celebration",
            instruction: "Celebrate both types of communication with equal enthusiasm. Both are valid and clinically important.",
          },
          {
            title: "Target",
            instruction:
              "By the end of this session: spontaneous exchanges should account for at least 50% of the child's total communication attempts.",
          },
        ],
        checkin: {
          ...MINUTE_PACING,
          question: "How did this exchange go (spontaneous or question-prompted)?", // derived (F2)
          options: LATENCY_OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },
  ],
};
