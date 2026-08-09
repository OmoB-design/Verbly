import type { ScriptVariant } from "@/lib/engine/session-script";
import type { PhaseSeed } from "./types";

/**
 * PHASE 11 — FUNCTIONAL COMMUNICATION IN DAILY ROUTINES
 * Transcribed from therapy_Exercises_12_phases_with_Simplified_Sections_2.docx.
 * CLINICAL CONTENT — verbatim where the source gives wording; derived text is
 * marked "derived (F2)".
 *
 * SCALE (verbatim): Spontaneous Functional Communication 100 / Prompted
 * Communication 50 / No Communication Attempt 0 / Distress Without
 * Communication 0 — the two zero categories are logged as distinct
 * response_categories (diagnostic distinction, like Turn-Taking's).
 *
 * ── FLAGS FOR OWNER ─────────────────────────────────────────────────────────
 * P11-a These are 15-MINUTE sessions. Modeled as 10 check-ins @ 90s (derived).
 * P11-b The source's communication-METHOD logging (PECS / gesture /
 *       vocalisation / AAC / gaze per attempt) is an unbuilt runtime feature —
 *       the communication_method_log table exists but the runner doesn't
 *       write it. Flagged, not silently dropped.
 * P11-c Routine-step trackers and per-category breakdowns (help requests vs
 *       protests vs transitions) are unbuilt display features.
 * ────────────────────────────────────────────────────────────────────────────
 */

const ROUTINE_PACING = { interval_seconds: 90, count: 10 }; // derived (P11-a): 15-minute session

// Verbatim scale (derived labels); two distinct zero categories.
const ROUTINE_OPTIONS = [
  { label: "Communicated on their own (any method)", response_category: "Spontaneous Functional Communication", credit_value: 100 },
  { label: "Communicated after a prompt", response_category: "Prompted Communication", credit_value: 50 },
  { label: "No attempt, despite an opportunity", response_category: "No Communication Attempt", credit_value: 0 },
  { label: "Became distressed without communicating", response_category: "Distress Without Communication", credit_value: 0 },
];

// Simplified Session — One Routine, One Card (shared, F7).
const SIMPLIFIED: ScriptVariant = {
  title: "One Routine, One Card",
  overview:
    "Narrows practice to a single daily routine — mealtime is recommended first, as it is the most frequent — and a single communication card, modelled constantly by the caregiver throughout.",
  materials: [
    "Only the 'more' card, visible and accessible at the table — not the full set of mealtime cards",
    "A small portion of a favourite food",
  ],
  steps: [
    {
      title: "One routine only",
      instruction: "Choose only mealtime for this simplified session — set aside dressing, transitions, and play routines for now.",
    },
    {
      title: "One card only",
      instruction: "Keep only the 'more' card visible and accessible at the table, rather than the full set of mealtime cards.",
    },
    {
      title: "Model every time",
      instruction:
        "Serve a small portion of a favourite food. As soon as it is gone, hold up the 'more' card yourself and say 'More!' before guiding the child's hand to it.",
    },
    {
      title: "Reward every touch",
      instruction:
        "The moment the child touches or exchanges the card, with or without guidance, give more food immediately and warmly.",
    },
    {
      title: "Stay consistent",
      instruction:
        "Repeat this same single-card routine at every meal for several days before introducing the 'finished' card or a second routine.",
    },
  ],
  checkin: {
    ...ROUTINE_PACING,
    question: "Did the child touch or exchange the 'more' card?", // verbatim intent
    options: [
      { label: "Yes — on their own", response_category: "Card Use — Independent", credit_value: 100 },
      { label: "Yes — guided", response_category: "Card Use — Guided", credit_value: 100 }, // source: guided or independent both count
      { label: "No", response_category: "No Card Use", credit_value: 0 },
    ],
  },
};

export const PHASE_11: PhaseSeed = {
  phase_number: 11,
  name: "Functional Communication in Daily Routines", // §13.2 canonical
  clinical_goal:
    "All of the communication skills developed across the PECS phases and the turn-taking sessions must now be embedded into the child's everyday life: mealtimes, getting dressed, bath time, bedtime, playtime, and transitions. This phase is not about teaching new skills — it is about making existing skills automatic, generalised, and meaningfully useful in real life.",
  phase_guidance: [
    "**Progress Indicators — What the Caregiver Should Look For**",
    "- Child uses PECS, gestures, vocalisations, or AAC spontaneously during at least 3 different daily routines.",
    "- Child communicates needs, wants, or comments during routines without being prompted to do so.",
    "- Child uses communication to manage transitions — signals when they want an activity to end or to change.",
    "- Child generalises communication across all family members and regular caregivers — not only the primary caregiver.",
    "- Frequency of communication attempts increases noticeably across daily routines over 2–3 weeks.",
    "",
    "**Important Therapy Tips**",
    "- Communication tools must be accessible at all times in every room the child uses — not stored on a shelf or in a bag.",
    "- Every family member and regular caregiver must respond to communication attempts consistently and immediately.",
    "- Respond to every communication attempt, however small. A reach, a sound, a look toward the tool — all are communication.",
    "- The Sabotage technique is powerful but must be used lightly and resolved quickly. Always resolve the sabotage within 15 seconds of the communication attempt.",
    "- Document daily: which routines the child communicated in, what method they used, and whether it was spontaneous or prompted.",
  ].join("\n"),
  has_simplified_session: true,
  content_version: 1,
  sessions: [
    // ── Session 1 — Mealtimes (15 minutes) ───────────────────────────────────
    {
      session_number: 1,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Mealtimes as Communication Opportunities",
        overview:
          "Transform mealtimes — one of the most frequent, predictable, and motivating daily routines — into rich communication opportunities: requesting food, commenting on food, signalling for more, and indicating when finished. A 15-minute session.",
        materials: [
          "The child's PECS binder, AAC device, or communication support — physically present at the table (non-negotiable)",
          "Food served in very small portions — a few pieces at a time; each small portion creates a natural communication opportunity",
          "Key mealtime cards: 'more', 'finished' / 'all done', picture cards for preferred foods, and an 'I don't want' or 'no' option",
          "Consistent response rule: every family member at the table follows the same rule — no more food until the child communicates, by any method",
        ],
        steps: [
          {
            title: "Small portions",
            instruction:
              "Place a small portion of the child's preferred food on their plate. Wait. Do not offer more until the child communicates by any means.",
          },
          {
            title: "Block and point",
            instruction:
              "If the child reaches for more food without communicating: gently block the reach with a flat hand, point to the communication tool, and wait 5 seconds. No speech — pointing only.",
          },
          {
            title: "Reward any method",
            instruction:
              "When the child communicates using any method (PECS card, gesture, vocalisation, gaze, sign): immediately give more food and respond verbally: 'More! Great asking!'", // P11-b
          },
          {
            title: "'Finished' before leaving",
            instruction:
              "When the child appears finished: prompt them to communicate 'finished' before leaving the table. If they leave without communicating: calmly bring them back, help them locate the 'finished' card, and model its use before releasing them.",
          },
          {
            title: "Model comments",
            instruction:
              "Throughout the meal: comment on the food yourself — 'Mmm, it is warm!' / 'I see chicken!' — modelling commenting during natural routines as established in PECS Phase 6.",
          },
          {
            title: "Every meal, every day",
            instruction:
              "Apply this exact approach at every mealtime, every day. Daily consistency has a greater effect on generalisation than any single structured session.",
          },
        ],
        checkin: {
          ...ROUTINE_PACING, // derived (P11-a)
          question: "At the last opportunity, did the child communicate?", // derived (F2)
          options: ROUTINE_OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 2 — Getting Dressed and Transitions (15 minutes) ─────────────
    {
      session_number: 2,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Getting Dressed and Transitions as Communication Routines",
        overview:
          "Use the daily routines of getting dressed and transitioning between activities as structured communication opportunities — particularly for practising protest communication ('no', 'stop', 'I don't want'), requesting help, and understanding visual schedules. A 15-minute session.",
        materials: [
          "A simple picture-based visual schedule of the morning routine: Wake Up → Toilet → Wash Hands → Get Dressed → Breakfast — displayed at the child's eye level",
          "A First-Then visual board (e.g., 'First get dressed — Then tablet')",
          "Key cards: 'help', 'stop' / 'no', 'wait', 'finished', and 'I don't want' — so the child can communicate protest and need rather than expressing them through behaviour",
        ],
        steps: [
          {
            title: "Walk the schedule",
            instruction:
              "Point to the visual schedule at the start of the routine together: 'First we get dressed — look — then breakfast.' Touch each picture as you name it.",
          },
          {
            title: "Engineer a help moment",
            instruction:
              "During dressing, pause deliberately at a step that requires help (a tricky button, a zip, shoes on the correct feet) and wait for the child to request help using the 'help' card or any other communication tool.",
          },
          {
            title: "Protest is communication",
            instruction:
              "If the child shows signs of distress during a transition: acknowledge the feeling verbally — 'I know you don't want to stop' — and then immediately prompt the 'stop' or 'no' card as an appropriate way to communicate the protest.",
          },
          {
            title: "Validate before redirecting",
            instruction:
              "When the child uses any communication during the routine: respond immediately and warmly — validate the communication before redirecting: 'You said stop — I hear you. Two more minutes, then we go.'",
          },
          {
            title: "Close the loop",
            instruction:
              "After completing the routine: show the child the visual schedule and check off the completed steps together.",
          },
        ],
        checkin: {
          ...ROUTINE_PACING, // derived (P11-a)
          question: "At the last routine step, did the child communicate?", // derived (F2)
          options: ROUTINE_OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 3 — Play and Leisure (15 minutes) ────────────────────────────
    {
      session_number: 3,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Play and Leisure as Communication Opportunities",
        overview:
          "Embed communication into free play and leisure time using the Sabotage technique — creating natural, non-intrusive communication opportunities within preferred play without imposing structured demands. A 15-minute session.",
        materials: [
          "The child's chosen preferred play activity (child-led choice maximises motivation)",
          "The binder or communication device — accessible but not directly in the play space; the child should retrieve it when they need to communicate",
          "3–4 planned sabotage opportunities: hide a toy piece, lock a container that requires help to open, run out of a preferred material (last bubble), or turn off a toy unexpectedly",
        ],
        steps: [
          {
            title: "Free play first",
            instruction:
              "Allow the child to play freely for the first 3–4 minutes. Join in naturally — follow the child's lead using the parallel play imitation from Phase 1 of this programme.",
          },
          {
            title: "First sabotage",
            instruction:
              "Introduce the first sabotage without announcement: remove a favourite toy piece and set it just out of reach. Wait 5–10 seconds (Time Delay). Do not prompt.",
          },
          {
            title: "Communication works",
            instruction:
              "When the child communicates (any method): respond immediately — 'You want the piece! Here it is!' — and return it. The communication worked. This is the essential teaching moment.",
          },
          {
            title: "Mand-Model if needed",
            instruction:
              "If the child does not communicate within 10 seconds: gesture toward the communication tool and say 'Tell me' — then wait another 5 seconds before providing the piece anyway.",
          },
          {
            title: "Space the sabotages",
            instruction:
              "Introduce the second and third sabotages across the session, spacing them approximately 3 minutes apart so the play feels natural between communication opportunities.",
          },
          {
            title: "Model comments; end on their terms",
            instruction:
              "Comment on the play yourself throughout — 'I see you building!' / 'It is so tall!' — and end the session on the child's terms: allow them to signal 'finished' rather than ending it from the adult's side.",
          },
        ],
        checkin: {
          ...ROUTINE_PACING, // derived (P11-a)
          question: "At the last opportunity (or sabotage), did the child communicate?", // derived (F2)
          options: ROUTINE_OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },
  ],
};
