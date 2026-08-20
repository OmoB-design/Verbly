import type { ScriptVariant } from "@/lib/engine/session-script";
import type { PhaseSeed } from "./types";

/**
 * PHASE 3 — ORAL MOTOR EXERCISES
 * Transcribed from therapy_Exercises_12_phases_with_Simplified_Sections_2.docx.
 * CLINICAL CONTENT — verbatim where the source gives wording; derived text is
 * marked "derived (F2)".
 *
 * ── FLAGS FOR OWNER ─────────────────────────────────────────────────────────
 * P3-a  Sessions 2–4 are 45-MINUTE sessions with a staged timetable. Modeled
 *       as 15 check-ins @ 120s (≈30 min of scored trials — the video-recording
 *       segment of the timetable is not a scored block). Derived; confirm.
 * P3-b  Session 4 is a VERBATIM DUPLICATE of Session 3 in the source (its own
 *       timetable block is even titled "Session 3 — Timetable"). Transcribed
 *       as a fourth session on the assumption the tongue work is intentionally
 *       practised twice — CONFIRM this is intended and not a copy-paste slip.
 * P3-c  IN-APP FEATURES the source describes that the runtime does NOT have:
 *       Stage-1 "visual representation of how to pronounce each sound",
 *       Stage-2 games (bubble pops / finger taps nose on a clear production —
 *       Knowledge of Results feedback), and per-activity start/stop buttons.
 *       Steps transcribe the caregiver-side flow; these interactive pieces are
 *       an unbuilt-feature inventory, not silently dropped.
 * P3-d  Sound Reference tables + the video-clip protocol are carried in
 *       materials/steps so the caregiver still gets them.
 * ────────────────────────────────────────────────────────────────────────────
 */

const LONG_PACING = { interval_seconds: 120, count: 15 }; // derived (P3-a)
const SHORT_PACING = { interval_seconds: 60, count: 10 }; // derived, 10-min session

// Scoring Criteria — Phase 3 (verbatim categories/credits; labels from the RL
// behaviour wording).
const OPTIONS = [
  { label: "Yes — independently", response_category: "Spontaneous Imitation", credit_value: 100 },
  { label: "Yes — with a physical prompt or extra modelling", response_category: "Prompted Imitation", credit_value: 25 },
  { label: "No response", response_category: "No Response", credit_value: 0 },
];

// Simplified Session — One Sound, One Sense (shared, F7).
const SIMPLIFIED: ScriptVariant = {
  title: "One Sound, One Sense",
  mouth_animation_ref: "p3-single-sound", // placeholder — asset pending SLP sign-off (owner spec)
  overview:
    "Narrows practice to a single sound target for the whole session and adds a direct touch cue, so the child is not asked to process a mirror, a sequence of sounds, and a new motor pattern all at once.",
  materials: [
    "One snack or bubble wand (the single sound's reward and touch cue)",
    "A child-safe mirror — optional in this simplified mode, not required",
  ],
  steps: [
    {
      title: "Choose one sound",
      instruction:
        "Choose only one sound to target for the whole session (e.g., /m/ using the bubble-blowing or humming game).",
    },
    {
      title: "Sit close",
      instruction:
        "Sit close, at the child's eye level. Use the mirror only if the child finds it helpful — otherwise, focus on the caregiver's face alone.",
    },
    {
      title: "Model three times",
      instruction:
        "Bring the snack or bubble wand right up near your own mouth and make the single sound slowly and clearly three times in a row: 'Mmm… Mmm… Mmm.'",
    },
    {
      title: "Touch cue",
      instruction:
        "Touch the child's lips gently with the snack or wand to draw attention to the mouth area, then wait up to 10 seconds.",
    },
    {
      title: "Reward any movement",
      instruction:
        "Reward any mouth movement at all — a lip purse, a puff of air, an open mouth, or an actual sound — with the snack, bubble, or big praise immediately.",
    },
    {
      title: "Repeat the same sound",
      instruction: "Repeat the same single sound 10–12 times in the session rather than introducing new sounds.",
    },
  ],
  checkin: {
    ...SHORT_PACING,
    question: "Did the child make any mouth movement toward the sound?", // derived (F2)
    options: [
      { label: "Yes — any movement or sound", response_category: "Mouth Movement Attempt", credit_value: 100 },
      { label: "No", response_category: "No Response", credit_value: 0 },
    ],
  },
};

// Sessions 3 and 4 are identical in the source (P3-b) — one definition, seeded twice.
const TONGUE_SESSION: ScriptVariant = {
  title: "Tongue Exercises: /t/ /d/ /l/ /n/ Sounds",
  mouth_animation_ref: "p3-tongue-elevation", // placeholder — asset pending SLP sign-off (owner spec)
  overview: [
    "Build tongue tip placement and coordination while introducing the sounds /t/, /d/, /l/, and /n/ through structured play with edible rewards and interactive games. A 45-minute session.",
    "Timetable: 0–15 min warm-up with mirror and modelling (Activity 1); 15–25 min record 4–5 short video clips, watch together, celebrate the good ones; 25–35 min modelling practice (Activity 2); 35–45 min Nose Tap game (many trials + mirror).",
    "Sound reference: /t/ tongue tip up (touches behind the top teeth) + air burst (no voice); /d/ tongue tip up + air burst (voice on); /l/ tongue tip up + voice on (air flow); /n/ tongue tip up + voice on + air through the nose.",
  ].join("\n"),
  materials: [
    "Safe edible reward items in front of the child: lollipop, yogurt on a spoon, small amount of chocolate spread",
    "A child-safe mirror",
    "Highly preferred items (bubbles, toy car, favourite character, snack) as additional reinforcement",
    "Three cards: 'Watch Me' (eye-contact icon), 'Tongue Move' (tongue icon), 'Play' (picture of a child playing)",
    "A phone to record short 5-second clips — caregiver records first, then the child; play both back-to-back so the child can compare and self-correct",
  ],
  steps: [
    {
      title: "Activity 1 — model the lick",
      instruction:
        "Model first: take the edible reward, hold it up near the left side of your face. Exaggerate moving your tongue to the left to lick it. Make it obvious and playful.",
    },
    {
      title: "Activity 1 — the child's turn",
      instruction:
        "Place the edible reward near the left side of the child's face. Say 'Your turn' or 'Lick here' and point. Wait. Even a small tongue movement toward the left counts — not perfect licking, just movement in the correct direction is a success.",
    },
    {
      title: "Activity 1 — all four directions",
      instruction:
        "Repeat the same steps for the right side, then upward, then downward. Important: do not push the lollipop inside the child's mouth — only near the lips. The goal is intentional tongue movement, not passive licking.",
    },
    {
      title: "Activity 2 — mirror",
      instruction: "Model in the mirror: 'Watch my tongue… now watch yours.' Fade cues gradually.",
    },
    {
      title: "Activity 2 — /t/",
      instruction:
        "Start with /t/. Model 'Tttt… Tap' with big facial expression. Use finger tapping on the table while holding a snack for the child. Pause and wait for the child to imitate (even a small 'Tap' counts). On success: give a tiny bite immediately.",
    },
    {
      title: "Activity 2 — /d/",
      instruction:
        "Next, /d/. Pull out a toy drum or drum on the table. Hit it dramatically: 'Dddd… Drum'. Pause and wait. On success: more drumming.",
    },
    {
      title: "Activity 2 — /l/",
      instruction:
        "Next, /l/. Point at a light and say 'Llll… Light' while looking up at a bulb or using a flashlight. Pause and wait. On success: give a reward.",
    },
    {
      title: "Activity 2 — /n/",
      instruction:
        "Finally, /n/. Point to your nose or a toy and say 'Nnn… Nose'. Pause and wait. On success: encourage the child to touch their own nose and give a reward.",
    },
  ],
  checkin: {
    ...LONG_PACING, // derived (P3-a)
    question: "Did the child imitate the movement or sound?", // derived (F2)
    options: OPTIONS,
  },
  simplified: SIMPLIFIED,
} as ScriptVariant & { simplified: ScriptVariant };

export const PHASE_03: PhaseSeed = {
  phase_number: 3,
  name: "Oral Motor Exercises", // §13.2 canonical
  clinical_goal:
    "Phase 3 targets awareness, coordination, and control of the lips, tongue, jaw, cheeks, and breath support — all essential for speech production and feeding. The goal of Phase 3 is: better control → easier sound production → stronger communication attempts.",
  phase_guidance: [
    "**Especially useful for children who show**",
    "- Very limited vocal attempts",
    "- Drooling or low oral muscle tone",
    "- Difficulty chewing or swallowing",
    "- Open-mouth posture or weak lip closure",
    "- Suspected motor speech difficulties (e.g., childhood apraxia features)",
    "- Difficulty copying mouth movements",
    "",
    "**Age adaptation — older children (ages 8–14)**",
    "- Instead of a toy drum: use desk tapping with a rhythm.",
    "- Instead of a ceiling bulb: use the phone flashlight.",
    "- Instead of the cartoon nose game: use a mirror challenge.",
    "- Same sounds. Better presentation. Respect matters.",
  ].join("\n"),
  has_simplified_session: true,
  content_version: 1,
  sessions: [
    // ── Session 1 — Facial Awareness Warm-Up (10 minutes) ────────────────────
    {
      session_number: 1,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Facial Awareness Warm-Up",
  mouth_animation_ref: "p3-facial-awareness", // placeholder — asset pending SLP sign-off (owner spec)
        overview:
          "Help the child become aware of their own face and begin noticing mouth movements — the foundation for all oral motor exercises that follow.",
        materials: [
          "4–5 highly preferred items as immediate reinforcement",
          "A child-safe mirror — lets the child see their own mouth and the caregiver's mouth simultaneously",
          "Three cards: 'Watch Me' (eye-contact icon), 'Mouth Move' (mouth icon), 'Play' (picture of a child playing)",
        ],
        steps: [
          { title: "Set up", instruction: "Set preferred items in front of the child. Sit at the child's eye level." },
          { title: "Look at my mouth", instruction: "Using the mirror, say: 'Look at my mouth.'" },
          {
            title: "Happy face",
            instruction:
              "Once the child is looking at you: smile big and say 'Look! Happy face!' Tap your cheeks and exaggerate a big smile, open mouth, and big puffed cheeks.",
          },
        ],
        checkin: {
          ...SHORT_PACING, // derived
          question: "Did the child imitate the facial expression?", // derived (F2)
          options: OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 2 — Lip Exercises: /m/ /p/ /b/ Sounds (45 minutes) ───────────
    {
      session_number: 2,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Lip Exercises: /m/ /p/ /b/ Sounds",
  mouth_animation_ref: "p3-lip-closure", // placeholder — asset pending SLP sign-off (owner spec)
        overview: [
          "Strengthen lip closure and breath control while introducing the child to the sounds /m/, /p/, and /b/ through a playful, game-based format. A 45-minute session.",
          "Timetable: 0–15 min warm-up with mirror and modelling (Activity 1); 15–25 min record 4–5 short video clips, watch together, celebrate the good ones; 25–35 min modelling practice (Activity 2); 35–45 min Bubble Pop game (many trials + mirror).",
          "Sound reference: /m/ lips together + voice on (humming sound); /p/ lips together + air burst (no voice); /b/ lips together + voice on (air burst).",
        ].join("\n"),
        materials: [
          "Bubbles",
          "A tissue",
          "A child-safe mirror — lets the child see their tongue and mouth movements alongside the caregiver's",
          "A phone to record short 5-second clips — caregiver records first, then the child; play both back-to-back so the child can compare and self-correct",
          "A mystery box containing a snack and a bubble wand",
        ],
        steps: [
          {
            title: "Activity 1 — bubble blowing",
            instruction:
              "Set the bubbles in front of the child. Sit at the child's eye level. Say 'Ready… blow!' and model blowing bubbles. Blow a bubble while the child watches, then help the child blow a bubble.",
          },
          {
            title: "Activity 1 — tissue puff",
            instruction:
              "Set a tissue near or on your lips. Model 'puh!' and show the tissue moving from your lip. Child then tries.",
          },
          {
            title: "Activity 2 — mirror",
            instruction:
              "Model in the mirror: 'Watch my tongue… now watch yours.' Fade cues gradually so the child begins catching their own errors.",
          },
          {
            title: "Activity 2 — /m/",
            instruction:
              "Start with /m/. With a big facial expression, model 'Mmmm… More' while holding a snack for the child. Pause and wait for the child to imitate (even a small 'hmmm' counts). Once the child imitates, give a tiny bite immediately.",
          },
          {
            title: "Activity 2 — /p/",
            instruction:
              "Next, /p/. Reach into the mystery box and pull out the bubble wand with excitement. Say 'Pppp… Pop' while popping a bubble. Pause and wait for the child to attempt (even a small 'p' counts). On success: blow more bubbles.",
          },
          {
            title: "Activity 2 — /b/",
            instruction:
              "Finally, /b/. Point at the bubble and say 'Bbbb… Bubble' while blowing. Pause and wait. On success: blow more bubbles.",
          },
        ],
        checkin: {
          ...LONG_PACING, // derived (P3-a)
          question: "Did the child imitate the movement or sound?", // derived (F2)
          options: OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Sessions 3 & 4 — Tongue Exercises (45 minutes each; P3-b duplicate) ──
    { session_number: 3, age_bracket: null, script: { script_version: 1, ...TONGUE_SESSION } },
    { session_number: 4, age_bracket: null, script: { script_version: 1, ...TONGUE_SESSION } },
  ],
};
