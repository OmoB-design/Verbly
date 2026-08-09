import type { ScriptVariant } from "@/lib/engine/session-script";
import type { PhaseSeed } from "./types";

/**
 * PHASE 2 — IMITATION TRAINING
 * Transcribed from therapy_Exercises_12_phases_with_Simplified_Sections_2.docx.
 * CLINICAL CONTENT — verbatim where the source gives wording; derived text is
 * marked "derived (F2)".
 *
 * ── FLAGS FOR OWNER ─────────────────────────────────────────────────────────
 * P2-a  Session numbering: the source runs three tracks (Gross Motor 1;
 *       Fine Motor 1–5). Flattened to session_number 1–6 (1 = Gross Motor).
 * P2-b  Fine Motor Session 5 is "Ages 8–14" — that spans TWO brackets, so it
 *       is seeded twice (8-12 and 10-14) with the same script. No 3-7 variant
 *       exists for session 6 (faithful: the source defines none).
 * P2-c  No check-in interval is given anywhere in this phase (RL behaviour is
 *       task-event-driven). Modeled as 10 check-ins @ 60s (derived); the
 *       "Check in now" button covers per-repetition pacing.
 * P2-d  The source's "RL Display — Three Velcro Cards" blocks are physical
 *       card supports → listed under materials (per the F4 ruling pattern).
 * P2-e  Simplified: the source says "RL does not separate independent from
 *       prompted — every completed repetition counts." Both completed options
 *       therefore credit 100; the "Not completed" 0 option is derived (the
 *       source defines no failure option, but the scale needs one).
 * ────────────────────────────────────────────────────────────────────────────
 */

const ROUND_PACING = { interval_seconds: 60, count: 10 }; // derived (P2-c)

// Scoring Criteria — Phase 2 (verbatim categories/credits; option labels are
// the RL behaviour's own wording).
const OPTIONS = [
  { label: "Yes — independently", response_category: "Spontaneous Imitation", credit_value: 100 },
  { label: "Yes — with hand-over-hand help", response_category: "Prompted Imitation", credit_value: 25 },
  { label: "No response", response_category: "No Response", credit_value: 0 },
];

// Simplified Session — Mirror-Me Single Action (shared, F7).
const SIMPLIFIED: ScriptVariant = {
  title: "Mirror-Me Single Action",
  overview:
    "Reduces imitation to a single, very large action modelled with zero delay, with hand-over-hand guidance built into every repetition from the start rather than faded in over time.",
  materials: [
    "Two cards only: 'Watch Me' and 'Copy Me' — the separate 'Get Reward' card is removed because the reward is now automatic and immediate every time",
    "One favourite toy",
  ],
  steps: [
    {
      title: "Set up",
      instruction:
        "Sit face-to-face at the child's eye level with one favourite toy in view — only one action option is offered at a time.",
    },
    {
      title: "Model one big action",
      instruction:
        "Model one large, exaggerated whole-body action (e.g., clap hands overhead) while saying 'Watch me… copy me!'",
    },
    {
      title: "Guide immediately",
      instruction:
        "Immediately guide the child's hands through the same action using hand-over-hand support — do not wait for an independent attempt first.",
    },
    {
      title: "Celebrate every completion",
      instruction:
        "The instant the movement is completed, with or without help, celebrate warmly and give the toy or a few seconds of play right away.",
    },
    {
      title: "Repeat the same action",
      instruction:
        "Repeat the same single action 8–10 times before introducing a second action, so the child experiences many quick, guaranteed successes.",
    },
  ],
  checkin: {
    ...ROUND_PACING,
    question: "Was the movement completed (with or without hand-over-hand help)?", // derived (F2)
    options: [
      { label: "Yes — independently", response_category: "Completed — Independent", credit_value: 100 },
      { label: "Yes — with hand-over-hand guidance", response_category: "Completed — Guided", credit_value: 100 }, // P2-e
      { label: "Not completed this time", response_category: "Not Completed", credit_value: 0 }, // derived (P2-e)
    ],
  },
};

export const PHASE_02: PhaseSeed = {
  phase_number: 2,
  name: "Imitation Training", // §13.2 canonical
  clinical_goal:
    "Imitation teaches the child how to learn from others. Copying actions and sounds builds motor planning, sustained attention, and the foundation for language acquisition. Phase 2 is divided into three skill areas: Gross Motor Imitation (whole-body, large movements), Fine Motor Imitation (smaller, hand and finger movements), and Vocal Imitation (sound and speech approximations — leads into Phase 3).",
  has_simplified_session: true,
  content_version: 1,
  sessions: [
    // ── Session 1 (Gross Motor 1) — Watch Me → Copy Me → Get Reward ──────────
    {
      session_number: 1,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Watch Me → Copy Me → Get Reward",
        overview:
          "Establish the core imitation routine using whole-body actions and highly preferred toys as immediate reinforcement.",
        materials: [
          "4–5 highly preferred items (bubbles, toy car, favourite character, snack) for use as immediate reinforcement",
          "A child-safe mirror (hand mirror or standing mirror on floor/table)",
          "Three cards: 'Watch Me' (picture of eyes / child looking at adult), 'Copy Me' (picture of child mirroring an adult), 'Get Reward' (reward icon)", // P2-d
        ],
        steps: [
          {
            title: "Set up",
            instruction: "Set preferred items in front of the child. Sit at the child's eye level, facing them.",
          },
          {
            title: "Model big actions",
            instruction:
              "Model big, fun whole-body actions using the child's favourite toy. Examples: clap hands, jump up and down, wave arms like a superhero.",
          },
          {
            title: "Cue",
            instruction: "Say clearly: 'Watch me… ready… set… GO!' then perform the action.",
          },
          {
            title: "Start simultaneous",
            instruction: "Start with a 0-second delay — caregiver and child do the action simultaneously.",
          },
          {
            title: "Introduce a pause",
            instruction:
              "Once the child copies easily, introduce a 1–2 second pause so the child imitates after the caregiver finishes.",
          },
          { title: "Keep the cue", instruction: "Repeat the 'Ready… set… GO!' cue every time." },
          {
            title: "For older children (ages 8–14)",
            instruction:
              "Use interest-based actions (e.g., 'Do the Spider-Man web shooter move' or 'Copy the Fortnite dance').",
          },
        ],
        checkin: {
          ...ROUND_PACING, // derived (P2-c)
          question: "Did the child imitate the action?", // derived (F2)
          options: OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 2 (Fine Motor 1) — Pointing to a Preferred Toy ───────────────
    {
      session_number: 2,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Pointing to a Preferred Toy",
        overview: "Teach pointing imitation with immediate reward — even reaching toward the toy counts.",
        materials: [
          "The child's favourite toy and another toy on the table; highly preferred items ready as immediate reinforcement",
        ],
        steps: [
          { title: "Set up", instruction: "Set items on the table. Sit at the child's eye level, facing them." },
          {
            title: "Point and cue",
            instruction: "Point clearly to the most preferred toy (the favourite) and say: 'Watch me…'",
          },
          {
            title: "Cue again",
            instruction: "When the child looks at you, say: 'Ready… set… GO!' and point again dramatically.",
          },
          {
            title: "Pause and wait",
            instruction:
              "Pause and wait. The goal is for the child to copy by pointing to the toy. Even reaching toward it counts.",
          },
          {
            title: "Reward instantly",
            instruction:
              "Once they point or reach, immediately say: 'YES! You pointed! Great job!' and hand them the favourite toy instantly. The reward must happen immediately.",
          },
          { title: "Keep the cue", instruction: "Repeat the 'Ready… set… GO!' cue every time." },
        ],
        checkin: {
          ...ROUND_PACING, // derived (P2-c)
          question: "Did the child point or reach toward the toy?", // derived (F2)
          options: OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 3 (Fine Motor 2) — Waving ────────────────────────────────────
    {
      session_number: 3,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Waving",
        overview: "Teach waving imitation using a surprise reward — even a small hand movement counts.",
        materials: ["A favourite toy (or snack) held behind your back as a surprise reward"],
        steps: [
          { title: "Hide the reward", instruction: "Hold the favourite toy behind your back." },
          {
            title: "Model the wave",
            instruction: "Wave and say 'Bye bye!' or 'Hi!' while smiling and exaggerating the movement.",
          },
          {
            title: "Your turn",
            instruction:
              "Say 'Your turn' and wait. The child is to copy the waving motion — even a small hand movement counts.",
          },
          {
            title: "Reward",
            instruction:
              "Once they wave, immediately say 'YES! You waved! Great job!' Reveal and hand them the toy or blow bubbles.",
          },
        ],
        checkin: {
          ...ROUND_PACING, // derived (P2-c)
          question: "Did the child wave or make a hand movement?", // derived (F2)
          options: OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 4 (Fine Motor 3) — Touching Nose ─────────────────────────────
    {
      session_number: 4,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Touching Nose",
        overview: "Teach nose-touch imitation with exaggerated modelling and instant reinforcement.",
        materials: [
          "Highly preferred items in front of the child (bubbles, toy car, favourite character, snack) as immediate reinforcement",
        ],
        steps: [
          { title: "Model", instruction: "Tap your nose and say: 'Watch me…'" },
          {
            title: "Cue and wait",
            instruction: "Say 'Touch nose!' — exaggerate it ('tap tap tap') — then wait for the child to imitate.",
          },
          {
            title: "Reward",
            instruction:
              "Once the child touches their nose, immediately say: 'You touched your nose!' then hand them the favourite toy, a snack, or blow bubbles.",
          },
        ],
        checkin: {
          ...ROUND_PACING, // derived (P2-c)
          question: "Did the child touch their nose?", // derived (F2)
          options: OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 5 (Fine Motor 4) — Block Stacking ────────────────────────────
    {
      session_number: 5,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Block Stacking",
        overview: "Teach sequence imitation through block stacking, ending with the highly motivating crash game.",
        materials: ["Lego blocks (for block stacking) in front of the child"],
        steps: [
          { title: "Set up", instruction: "Sit at the child's eye level, facing them." },
          { title: "Model the stack", instruction: "Stack a red block, then a blue block." },
          { title: "Your turn", instruction: "Say 'Your turn!' and hand the child the blocks." },
          {
            title: "Reinforce",
            instruction:
              "When the child copies the same stacking order, give big reinforcement: wide smile, excited voice ('You did exactly what I did!'), and continue the play immediately.",
          },
          {
            title: "Crash game",
            instruction:
              "Follow up with the crash game: 'READY… SET… CRASH!' — children find this highly motivating.",
          },
        ],
        checkin: {
          ...ROUND_PACING, // derived (P2-c)
          question: "Did the child make an attempt (picked up a block or tried to stack)?", // derived (F2)
          options: OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 6 (Fine Motor 5) — Age-Adapted Imitation Games (Ages 8–14) ───
    // P2-b: "Ages 8–14" spans two brackets → seeded for both; no 3-7 variant.
    ...(["8-12", "10-14"] as const).map((bracket) => ({
      session_number: 6,
      age_bracket: bracket,
      script: {
        script_version: 1 as const,
        title: "Superhero Pose & Dance Move",
        overview: "Age-adapted imitation for older children using interest-based poses and dance moves.",
        materials: [],
        steps: [
          { title: "Set up", instruction: "Sit at the child's eye level." },
          { title: "Strike a pose", instruction: "Strike a superhero pose." },
          { title: "Your turn", instruction: "Say 'Your turn!' and wait for the child to copy." },
          {
            title: "Reinforce",
            instruction: "When the child copies, give big reinforcement: 'You did exactly what I did!'",
          },
          { title: "Dance move", instruction: "Next, do a dance move." },
          { title: "Your turn again", instruction: "Say 'Your turn!' again and wait for the child to copy the dance move." },
          { title: "Reinforce and continue", instruction: "When the child copies, give big reinforcement and continue the play." },
        ],
        checkin: {
          ...ROUND_PACING, // derived (P2-c)
          question: "Did the child make an attempt to copy?", // derived (F2)
          options: OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    })),
  ],
};
