import type { ScriptVariant } from "@/lib/engine/session-script";
import type { PhaseSeed } from "./types";

/**
 * PHASE 1 — JOINT ATTENTION ACTIVITIES
 * Transcribed from therapy_Exercises_12_phases_with_Simplified_Sections_2.docx.
 *
 * CLINICAL CONTENT — reviewed 2026-08-07 (CLAUDE.md content governance).
 * Verbatim wherever the source gives wording; derived text carries an inline
 * "derived (F2)" marker — the verbatim/derived distinction is kept deliberately
 * for the §12 content-validity review (F2 ruling).
 *
 * ── FLAG RULINGS (owner, 2026-08-07) — all 7 resolved ───────────────────────
 * F1  RULED: 20 check-ins at 30s intervals for Sessions 1–2 (source's literal
 *     15s×10min=40 judged unrealistic caregiver behaviour). Pacing lives in
 *     the seed as per-phase constants (CORE_PACING below) — tunable per phase
 *     without a code change; values to be re-tuned after real sessions.
 * F2  RULED: derived wording accepted; inline verbatim-vs-derived markings are
 *     KEPT for the §12 content-validity review (different confidence levels).
 * F3  RULED: count 10 @ 60s accepted for Session 3; the runner provides a
 *     "Check in now" button alongside the timer (round-based pacing).
 * F4  RULED: physical Velcro cards; the screen is the caregiver's scoring
 *     interface only. No on-screen card widget (a future change would be a
 *     deliberate product decision + new content version).
 * F5  RULED: simplified options collapse the base-support tiers —
 *     Independent(100) kept; Verbal(75)/Gestural-Visual(50)/Physical(25)
 *     merged into one "Prompted" bucket credited at the median 50;
 *     No response(0) kept. See SIMPLIFIED.checkin.options.
 * F6  RULED: phase-level guidance (Progress Indicators + Therapy Tips) lives
 *     in `phase_guidance` on the phase record (display-only, not scored, not
 *     RL-consumed). Transcribed verbatim below.
 * F7  RULED: modeling accepted — authored once per phase, embedded per session
 *     (the session is the unit of scoring/advance, so it is self-contained).
 * ────────────────────────────────────────────────────────────────────────────
 */

// F1 ruling: per-phase check-in pacing, one place to tune. Sessions 1–2 use
// CORE_PACING; Session 3 variants use ROUND_PACING (F3 ruling).
const CORE_PACING = { interval_seconds: 30, count: 20 };
const ROUND_PACING = { interval_seconds: 60, count: 10 };

// Phase-wide scoring scale (verbatim: Scoring Criteria — Phase 1 + Session 1's
// option labels).
const OPTIONS = [
  { label: "Yes, completely on their own!", response_category: "Spontaneous Gaze Shift", credit_value: 100 },
  { label: "Yes, but I had to say 'Look' or tap them.", response_category: "Prompted Gaze Shift", credit_value: 50 },
  { label: "No, they stayed focused on the toy.", response_category: "Missed Opportunity", credit_value: 0 },
];

// derived (F2): adapted third label for contexts where the toy is hidden or
// on a screen.
const OPTIONS_GENERIC = [
  OPTIONS[0],
  OPTIONS[1],
  { label: "No, they didn't look.", response_category: "Missed Opportunity", credit_value: 0 },
];

// Simplified Session — Velcro Card Visual Schedule (shared across the phase, F7).
const SIMPLIFIED: ScriptVariant = {
  title: "Velcro Card Visual Schedule",
  overview:
    "A three-card visual sequence to reduce the child's anxiety and make the structure of joint attention predictable and game-like.",
  materials: [
    "Card 1 — Look: picture of two eyes / a child looking at an adult (eye-contact icon)",
    "Card 2 — Play: picture of the specific toy being used (e.g., photo of bubbles or a toy car)",
    "Card 3 — Look: same eye-contact icon as Card 1",
    "A 'Done' pocket, or space to flip completed cards over",
  ],
  steps: [
    { title: "Walk the sequence", instruction: "Point to each card and say: 'First look… then play… then look again.'" },
    { title: "Tap each card", instruction: "After each step, tap on the card." },
    {
      title: "Repeat",
      instruction:
        "Repeat this until the child taps a card by himself or looks at you to prompt the tapping or move to the next card.",
    },
    {
      title: "Show progress",
      // F4 ruling: physical cards; screen is scoring-only.
      instruction: "When a card is done, move it to the 'Done' pocket or flip it over so the child can see their progress.",
    },
  ],
  checkin: {
    interval_seconds: 240, // "After every 4 minutes"
    count: 2, // within the 10-minute session
    question: "Did the child make eye contact or try to tap a card?", // derived (F2)
    // F5 ruling — documented collapse of the base-support scale:
    //   Independent (100)                        → "Independent", 100
    //   Verbal (75) + Gestural-Visual (50) +
    //   Physical (25)  → merged "Prompted" bucket, credited at the median → 50
    //   No response (0)                          → "No response", 0
    options: [
      { label: "Yes, completely on their own!", response_category: "Independent", credit_value: 100 },
      { label: "Yes, with my help or a cue.", response_category: "Prompted", credit_value: 50 },
      { label: "Not this time.", response_category: "No response", credit_value: 0 },
    ],
  },
};

export const PHASE_01: PhaseSeed = {
  phase_number: 1,
  name: "Joint Attention Activities", // §13.2 canonical
  clinical_goal:
    "Joint attention is the ability to share focus on an object or event with another person. This phase trains the child to shift their gaze between a preferred object and the caregiver's face — a foundational skill for all communication and social learning.",
  // F6 ruling — verbatim from the source's phase-level sections.
  phase_guidance: [
    "**Progress Indicators — What the Caregiver Should Look For**",
    "- Child shifts gaze between toy and caregiver's face at least 4–5 times per 10-minute play period.",
    "- Child begins to initiate joint attention independently (shows you something or points).",
    "- Child stays engaged in shared play for 8–10 minutes without leaving the activity.",
    "",
    "**Important Therapy Tips**",
    "- Keep sessions playful and pressure-free — never force eye contact.",
    "- Track data consistently: % of trials with spontaneous gaze shift (target: 70%+ before advancing).",
    "- Fade the 'Ready… set… GO!' cue over time so the child begins anticipating on their own.",
    "- Always end with the child feeling successful and in control.",
  ].join("\n"),
  has_simplified_session: true,
  content_version: 1,
  sessions: [
    // ── Session 1 — Mirror Play & Gaze Shift (10 minutes) ────────────────────
    {
      session_number: 1,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Mirror Play & Gaze Shift",
        overview:
          "Introduce gaze shifting through imitation of the child's own play, using a mirror so the child can see both faces simultaneously.",
        materials: [
          "4–6 of the child's highest-preference items (bubbles, spinning toys, favourite character figures, snacks, light-up toys, etc.)",
          "A small, unbreakable hand mirror, or a standing child-safe mirror on the floor or table — so the child can see both their own face and yours at the same time",
        ],
        steps: [
          {
            title: "Set up",
            instruction:
              "Set the preferred items in front of the child. Sit at the child's eye level, facing them, and watch what they do.",
          },
          {
            title: "Imitate their play",
            instruction:
              "Imitate exactly what the child is doing — same toy, same speed, same order (e.g., if they are stacking blocks, stack the exact same way).",
          },
          {
            title: "Pause and wait",
            instruction:
              "Every 10–15 seconds, pause and hold the toy up near your face. Wait up to 10 seconds for the child to look at you or shift gaze between the toy and your eyes.",
          },
          {
            title: "Reinforce",
            instruction:
              "When the child looks, give big, natural reinforcement: a wide smile, an excited voice ('Wow! You looked!'), then immediately continue the play.",
          },
          {
            title: "If they don't look",
            instruction: "Try again from the 'Imitate their play' step.", // derived (F2): from "On 'No': try again, from task 2"
          },
        ],
        checkin: {
          ...CORE_PACING, // F1 ruling (source: every 15s × 10 min)
          question: "Pause play. Did the child look at your eyes/face?", // verbatim
          options: OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 2 — Mirror Narration & Three-Way Gaze Shift (10 minutes) ─────
    {
      session_number: 2,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Mirror Narration & Three-Way Gaze Shift",
        overview:
          "Extend the child's gaze shift to a three-way pattern: toy → mirror → caregiver's eyes, using verbal narration to make the shared attention moment explicit.",
        materials: [
          "4–6 of the child's highest-preference items",
          "A child-safe mirror (hand mirror or standing mirror on floor/table)",
        ],
        steps: [
          {
            title: "Set up",
            instruction: "Set preferred items in front of the child. Sit at the child's eye level, facing them.",
          },
          {
            title: "Imitate their play",
            instruction: "Imitate exactly what the child is doing — same toy, same speed, same order.",
          },
          {
            title: "Narrate at the mirror",
            instruction:
              "Every 15 seconds, pause, look at the mirror, and say: 'Look — our eyes are both looking at the toy!' Wait up to 10 seconds for the child to look at you or shift gaze between the toy, the mirror, and your eyes.",
          },
          {
            title: "Reinforce",
            instruction:
              "When the child looks, give big, natural reinforcement ('Wow! You looked!') and immediately continue the play.",
          },
          {
            title: "If they don't look",
            instruction: "Try again from the 'Imitate their play' step.", // derived (F2)
          },
        ],
        checkin: {
          ...CORE_PACING, // F1 ruling
          question: "Pause play. Did the child look at you or shift gaze between the toy, the mirror, and your eyes?", // derived (F2)
          options: OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 3 — Age-Adapted Joint Attention Games (10 minutes) ───────────
    // "The RL selects or rotates the appropriate activity variant based on the
    // child's age group." Bracket variants below + one all-ages variant.

    // Ages 3–7 — Peek-a-Boo / Anticipation Game
    {
      session_number: 3,
      age_bracket: "3-7",
      script: {
        script_version: 1,
        title: "Peek-a-Boo / Anticipation Game",
        overview:
          "Build anticipation and joint attention through age-appropriate, high-motivation game formats.",
        materials: [
          "A highly preferred toy",
          "A cloth to hide it under (optional)", // derived (F2): inferred from the steps
        ],
        steps: [
          { title: "Hide the toy", instruction: "Hide a highly preferred toy behind the caregiver's back or under a cloth." },
          { title: "Build anticipation", instruction: "Say 'Where's the toy?' with exaggerated anticipation." },
          {
            title: "Wait for the look",
            instruction: "Wait for the child to make eye contact before revealing it with 'There it is!' and big excitement.",
          },
          {
            title: "Repeat",
            instruction: "Repeat 8–12 times in a row to create a clear, predictable routine that feels like a game.",
          },
          {
            title: "If they don't look",
            instruction: "Try again from the 'Build anticipation' step.", // derived (F2)
          },
        ],
        checkin: {
          ...ROUND_PACING, // F3 ruling
          question: "Did the child make eye contact before you revealed the toy?", // derived (F2)
          options: OPTIONS_GENERIC,
        },
        simplified: SIMPLIFIED,
      },
    },

    // Ages 8–12 — Favourite Character Figure
    {
      session_number: 3,
      age_bracket: "8-12",
      script: {
        script_version: 1,
        title: "Favourite Character Figure",
        overview:
          "Build anticipation and joint attention through age-appropriate, high-motivation game formats.",
        materials: [
          "A small action figure or printed picture of the child's current obsession (e.g., Spider-Man, Sonic, Pokémon, Fortnite character)",
          "A child-safe mirror",
        ],
        steps: [
          {
            title: "Get positioned",
            instruction:
              "Set preferred items in front of the child. Sit side-by-side (on the floor or at a table) so both are looking at the same thing.",
          },
          {
            title: "Hold the figure near your face",
            instruction: "Hold the character figure up near your face so your eyes and the figure are close together.",
          },
          {
            title: "Cue",
            instruction:
              "Say slowly and excitedly: 'Ready… set… GO!' while pointing back and forth between the character's face and your own eyes.",
          },
          {
            title: "Make it fun",
            instruction:
              "Make the character do something the child loves (e.g., Spider-Man shoots a web, Sonic runs, character does a cool dance).",
          },
          {
            title: "Pause and wait",
            instruction: "Pause and wait 5–10 seconds for the child to look at you or shift gaze between the figure and your eyes.",
          },
          {
            title: "Reinforce",
            instruction:
              "The moment they look, give big, natural reinforcement: 'You looked! Spider-Man is happy you looked!' and let the character do another fun action.",
          },
          {
            title: "Repeat",
            instruction: "Repeat 8–12 times in a row to create a clear, predictable routine that feels like a game.",
          },
          {
            title: "If they don't look",
            instruction: "Try again from the start.", // derived (F2): source says "from task 1"
          },
        ],
        checkin: {
          ...ROUND_PACING, // F3 ruling
          question: "Did the child look at you or shift gaze between the character and your eyes?", // derived (F2)
          options: OPTIONS_GENERIC,
        },
        simplified: SIMPLIFIED,
      },
    },

    // Ages 10–14 — Tablet Video
    {
      session_number: 3,
      age_bracket: "10-14",
      script: {
        script_version: 1,
        title: "Tablet Video",
        overview:
          "Build anticipation and joint attention through age-appropriate, high-motivation game formats.",
        materials: [
          "The child's favourite 10–15 second video clip, ready to play (YouTube short, Minecraft gameplay, Pokémon battle, sports highlight) — mute sound if needed so the caregiver controls the audio",
          "A child-safe mirror",
        ],
        steps: [
          {
            title: "Get positioned",
            instruction: "Set preferred items in front of the child. Sit side-by-side so both can see the tablet screen easily.",
          },
          {
            title: "Hold the tablet between you",
            instruction: "Hold the tablet between you and the child so both can see the screen.",
          },
          {
            title: "Pause and cue",
            instruction:
              "Pause the video at an exciting moment. Say 'Ready… set… GO!' while pointing back and forth between the screen and your own eyes.",
          },
          {
            title: "Play a little, then wait",
            instruction: "Press play for 3–5 seconds of the clip. Pause again and wait for the child to look at you.",
          },
          {
            title: "Reinforce",
            instruction:
              "When they make eye contact or shift gaze, immediately say 'You looked!' and play the next exciting part.",
          },
          { title: "Keep the cue", instruction: "Repeat the 'Ready… set… GO!' cue every time." },
          {
            title: "If they don't look",
            instruction: "Try again from the 'Hold the tablet between you' step.", // derived (F2): source says "from task 2"
          },
        ],
        checkin: {
          ...ROUND_PACING, // F3 ruling
          question: "Did the child look at you or shift gaze between the screen and your eyes?", // derived (F2)
          options: OPTIONS_GENERIC,
        },
        simplified: SIMPLIFIED,
      },
    },

    // All Ages — Song / Music Routine
    {
      session_number: 3,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Song / Music Routine",
        overview:
          "Build anticipation and joint attention through age-appropriate, high-motivation game formats.",
        materials: [
          "The child's favourite song, ready to sing or play on a device. For younger children: 'Wheels on the Bus', 'If You're Happy and You Know It'. For older children: more complex songs or short video clips where they take turns pressing play/pause",
          "A child-safe mirror",
        ],
        steps: [
          {
            title: "Get positioned",
            instruction: "Sit side-by-side (on the floor or at a table) so both are looking at the same thing.",
          },
          { title: "Sing with big gestures", instruction: "Sing or play each verse with big gestures." },
          {
            title: "Pause and wait",
            instruction: "Pause after each verse and wait for the child to look at you before continuing.",
          },
          {
            title: "Reinforce",
            instruction:
              "When they make eye contact or shift gaze, immediately say 'You looked!' and continue with the next verse.",
          },
          { title: "Keep the cue", instruction: "Repeat the 'Ready… set… GO!' cue every time." },
          {
            title: "If they don't look",
            instruction: "Try again from the start.", // derived (F2): source says "from task 1"
          },
        ],
        checkin: {
          ...ROUND_PACING, // F3 ruling
          question: "Did the child look at you or shift their gaze?", // derived (F2)
          options: OPTIONS_GENERIC,
        },
        simplified: SIMPLIFIED,
      },
    },
  ],
};
