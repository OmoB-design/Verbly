import type { ScriptVariant } from "@/lib/engine/session-script";
import type { PhaseSeed } from "./types";

/**
 * PHASE 12 — VOCAL APPROXIMATION AND SOUND SHAPING (EMERGING SPEECH)
 * Transcribed from therapy_Exercises_12_phases_with_Simplified_Sections_2.docx.
 * CLINICAL CONTENT — verbatim where the source gives wording; derived text is
 * marked "derived (F2)".
 *
 * SCALE (verbatim): Spontaneous Vocal Attempt 100 / Imitated Vocal Attempt 25 /
 * No Vocal Attempt 0.
 * BONUS (Appendix §3b — Closer Approximation): applies only to Imitated (25%)
 * trials; +10 when the attempt exceeds the child's rolling baseline — the most
 * frequent step across their last 5 attempts at that sound/word. The rolling
 * baseline is computed SERVER-SIDE from recorded {target, step} observations;
 * the caregiver only records which step the attempt reached.
 *
 * ── FLAGS FOR OWNER ─────────────────────────────────────────────────────────
 * P12-a Target words are CHILD-SPECIFIC in the source (chosen from the child's
 *       Session 1 sound log). The seeded target list below uses the source's
 *       own examples ('more', 'bubble', 'all gone', 'daddy') as starters —
 *       per-child target selection is a future feature.
 * P12-b The 5 shaping-step labels generalise the source's worked example for
 *       'more' (any vocalisation → vowel → consonant approximation → close
 *       approximation → target word). Derived; confirm the generalisation.
 * P12-c 15-minute sessions; modeled as 10 check-ins @ 90s (derived).
 * P12-d Unbuilt runtime features flagged: sound log (free text / phoneme
 *       selector), audio record-and-playback flow, per-word shaping-curve
 *       display (shaping_curve tables exist; the runner doesn't write them),
 *       and Session 3's two-part tracker split.
 * ────────────────────────────────────────────────────────────────────────────
 */

const ROUTINE_PACING = { interval_seconds: 90, count: 10 }; // derived (P12-c)

// Verbatim scale (derived labels).
const VOCAL_OPTIONS = [
  { label: "Made a sound on their own — no model needed", response_category: "Spontaneous Vocal Attempt", credit_value: 100 },
  { label: "Made a sound after you modelled it", response_category: "Imitated Vocal Attempt", credit_value: 25 },
  { label: "No sound, after waiting and modelling", response_category: "No Vocal Attempt", credit_value: 0 },
];

// Appendix §3b bonus. Steps generalised from the 'more' example (P12-b);
// targets are the source's example words (P12-a).
const APPROXIMATION_BONUS = {
  kind: "approximation" as const,
  prompt: "Which sound was it, and how close did the attempt get?",
  targets: ["more", "bubble", "all gone", "daddy"],
  step_labels: [
    "Any vocalisation — any sound at all",
    "A vowel sound (e.g., 'ah', 'oh')",
    "A consonant approximation (e.g., 'mmm', 'moh')",
    "A close approximation (e.g., 'mo', 'mor')",
    "The target word",
  ],
};

// Simplified Session — Any-Sound Capture (shared, F7).
const SIMPLIFIED: ScriptVariant = {
  title: "Any-Sound Capture",
  overview:
    "Removes the demand for closer approximations entirely and rewards any mouth movement or sound, using one repeated item to build a reliable habit of vocalising.",
  materials: ["The single item the child wants most right now"],
  steps: [
    { title: "One item", instruction: "Choose the single item the child wants most right now." },
    {
      title: "Wait expectantly",
      instruction: "Hold the item up and wait with an excited, expectant face — no spoken model yet.",
    },
    {
      title: "Anything counts",
      instruction:
        "Reward any attempt at all: a sound, an open mouth, a lip movement, a breath — anything counts as success in this simplified mode.",
    },
    {
      title: "Instant warmth",
      instruction: "Give the item immediately and celebrate warmly, even for the smallest attempt.",
    },
    {
      title: "Model a movement",
      instruction:
        "If nothing happens after 10 seconds, model a single exaggerated mouth movement (a full sound is not required) and wait 5 more seconds before rewarding any response.",
    },
    {
      title: "Repeat",
      instruction:
        "Repeat with the same single item for 10–12 trials so the child experiences many quick, guaranteed successes.",
    },
  ],
  checkin: {
    ...ROUTINE_PACING,
    question: "Did the child make any attempt at all, however small?", // verbatim
    options: [
      { label: "Yes — a sound, breath, or mouth movement", response_category: "Any Attempt", credit_value: 100 },
      { label: "No", response_category: "No Attempt", credit_value: 0 },
    ],
  },
};

export const PHASE_12: PhaseSeed = {
  phase_number: 12,
  name: "Vocal Approximation and Sound Shaping", // §13.2 canonical
  clinical_goal:
    "Designed for children who are beginning to produce vocal sounds — even inconsistently — this final phase systematically shapes those sounds into functional, recognisable speech approximations. It does not require perfect pronunciation. It requires vocal movement — any sound approximation, any consistent pairing of a sound with meaning, any volitional use of the voice.",
  phase_guidance: [
    "**Progress Indicators — What the Caregiver Should Look For**",
    "- Child consistently produces a vowel or consonant sound when shown a high-preference item — even if it does not resemble the target word yet.",
    "- Child produces the same approximate sound for the same item across multiple sessions (consistent mapping — a key indicator of intentional vocalisation).",
    "- Child's approximations become meaningfully closer to the target word over successive sessions.",
    "- Child initiates vocal attempts spontaneously in at least one daily routine — without being prompted.",
    "- Child combines two sounds or approximations (e.g., 'mo ba' for 'more bubble') — the first sign of multi-syllabic speech.",
    "",
    "**Important Therapy Tips**",
    "- Celebrate every single vocal attempt — no matter how small, how brief, or how far from the target. Over-correction or visible disappointment at an approximation causes children to stop vocalising altogether.",
    "- Never correct an approximation by emphasising the error ('No — say MORE, not mo'). Instead, model the target word naturally with warmth: 'More! Yes — more bubbles!' and move on.",
    "- Shaping takes weeks per sound for most children. Do not rush the shaping steps. A stable Step 3 approximation produced consistently is more valuable clinically than a brief, inconsistent Step 5 production.",
    "- If the child produces good approximations in structured sessions but not in daily life: reduce expectations at home and create more low-pressure, high-motivation vocalisation opportunities.",
    "- Every approximation should be documented with the date, the context, the form of the sound, and whether it was spontaneous. This record is essential for the SLP.",
    "",
    "This is the final phase of the programme. Continued growth beyond this phase is supported by an SLP with a personalised, child-specific speech therapy plan.",
  ].join("\n"),
  has_simplified_session: true,
  content_version: 1,
  sessions: [
    // ── Session 1 — Capturing and Rewarding Any Vocal Attempt (15 min) ───────
    {
      session_number: 1,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Capturing and Rewarding Any Vocal Attempt",
        overview:
          "Create optimal conditions for the child to produce any vocalisation — then immediately capture and reinforce it to increase its frequency and reliability. The first goal is simply more vocal output, from any source, for any reason. A 15-minute session.",
        materials: [
          "4–5 of the child's highest-preference items — the child's desire for the item is what motivates the attempt",
          "A child-safe mirror — both caregiver and child watch their own mouths during modelling",
          "A phone or tablet to record 5-second clips of the child vocalising — immediate playback is powerful auditory self-feedback",
          "A quiet environment — reduce background noise so quiet or brief vocalisations are easier to detect and reward",
        ],
        steps: [
          {
            title: "Hold up and wait",
            instruction:
              "Hold up a preferred item and wait — no model, no prompt, no spoken word. Look at the child with an expectant, excited expression. Hold the 10-second waiting space.",
          },
          {
            title: "Any sound wins",
            instruction:
              "If the child produces any sound — any vowel, any consonant, any vocalisation at all — immediately give the item with maximum reinforcement: 'YES! I heard you! Here it is!' The voice got the result. That is the lesson.",
          },
          {
            title: "Model if needed",
            instruction:
              "If the child produces no sound after 10 seconds: model the first sound of the item's name slowly and clearly (e.g., 'buh…' for bubble, 'mmmm' for more) and wait another 5 seconds. If the child just opens their mouth or approximates a lip movement: reward it.",
          },
          {
            title: "Play their voice back",
            instruction:
              "Record any vocalisation that occurs. Play it back to the child immediately: 'Listen — that's YOUR voice!' Point to the child and then to the speaker. Make it exciting.", // P12-d
          },
          {
            title: "Document",
            instruction:
              "Run 10–12 trials across 3–4 different preferred items. Document every sound produced: which sound, which item, spontaneous or imitated.",
          },
        ],
        checkin: {
          ...ROUTINE_PACING, // derived (P12-c)
          question: "Did the child produce any vocal sound?", // verbatim
          options: VOCAL_OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 2 — Shaping Approximations Toward Target Words (15 min) ──────
    {
      session_number: 2,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Shaping Approximations Toward Target Words",
        overview:
          "Take the vocalisations captured in Session 1 and begin systematically shaping them toward the actual target words — using differential reinforcement to reward sounds that are progressively closer to the correct pronunciation. Shaping means rewarding successive approximations: reward the best attempt in each trial, not only perfect productions. Progress is measured in steps, not words. Example sequence for 'more': Step 1 any vocalisation → Step 2 vowel sound ('ah'/'oh') → Step 3 nasal approximation ('mmm'/'moh') → Step 4 close approximation ('mo'/'mor') → Step 5 the target word. A 15-minute session.",
        materials: [
          "The Session 1 sound log — identify which shaping step the child is currently at for each target item, written down before the session begins",
          "A child-safe mirror — the child watches your mouth shape as you model, then their own as they attempt (watch me → listen → now you)",
          "A recording device — play the best attempt from the previous session first so the child hears their own progress",
        ],
        steps: [
          {
            title: "Know the starting step",
            instruction:
              "Review the Session 1 sound log. For each target item, identify the child's current shaping step.",
          },
          {
            title: "Model in the mirror",
            instruction:
              "Hold up the preferred item. Model the target word slowly and clearly in the mirror: 'Watch my mouth… [word].' Point to your mouth, then to the child's mouth in the mirror. Wait.",
          },
          {
            title: "Maintained skill — calm reward",
            instruction:
              "If the child produces their current-level sound (same step as last session): give the item but no extra celebration. They have maintained the skill.",
          },
          {
            title: "Closer step — differential reward",
            instruction:
              "If the child produces a sound that is one step closer to the target word: give the item AND extra reinforcement — louder praise, more of the item, longer access, record the moment. This differential reinforcement is what drives the shaping.",
          },
          {
            title: "Never punish regression",
            instruction:
              "If the child produces a sound that is further from the target or no sound: give the item after a maximum of 3 models, without withdrawing reinforcement for the attempt. Never punish a regression — simply model and try again.",
          },
          {
            title: "Depth over breadth",
            instruction:
              "Run 8–10 trials per target word. Focus on 2 target words per session maximum — depth of practice per word matters more than breadth. End by playing back the child's best vocalisation: 'Listen to your voice — you did it!'",
          },
        ],
        checkin: {
          ...ROUTINE_PACING, // derived (P12-c)
          question: "Did the child produce a vocal sound this trial?", // derived (F2)
          options: VOCAL_OPTIONS,
        },
        bonus: APPROXIMATION_BONUS, // Appendix §3b — server computes the rolling baseline
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 3 — Combining Sounds and Generalising (15 min) ───────────────
    {
      session_number: 3,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Combining Sounds and Generalising to Daily Routines",
        overview:
          "Build on shaped approximations by encouraging the child to combine two sounds — the first step toward multi-word communication — and by embedding vocalisation practice into natural daily routines. First 8 minutes: combining sounds. Final 7 minutes: generalising to a daily routine. A 15-minute session.",
        materials: [
          "2 approximations the child has successfully produced in Session 2, paired into a natural two-word combination: 'mo' + 'ba' → 'more bubble', 'ah' + 'go' → 'all gone', 'da' + 'di' → 'daddy'",
          "One identified daily routine (mealtime, bath time, playtime, getting dressed) prepared so at least 3 vocalisation opportunities will arise",
          "The mirror and recording device, available throughout",
        ],
        steps: [
          {
            title: "Model the combination",
            instruction:
              "Hold up two preferred items together simultaneously (e.g., a snack and a bubble wand). Model the combined approximation with exaggerated excitement: 'mo ba!' or 'more bubble!' — say it slowly, watch it in the mirror, then repeat.",
          },
          {
            title: "Any two sounds count",
            instruction:
              "Wait for the child to produce any combination attempt — even two separate sounds with a gap between them counts: 'mo' (pause) 'ba'. Two sounds in sequence, even slowly, is a two-word combination.",
          },
          {
            title: "Milestone celebration",
            instruction:
              "When the child produces a two-sound combination: maximum reinforcement — both items immediately, loudest celebration, record the moment. This is a clinical milestone.",
          },
          {
            title: "Half is still progress",
            instruction:
              "If the child produces only one of the two sounds: give one of the two items and model the full combination again. Accept and celebrate the single sound while modelling the target. Run 6–8 combination trials using 2–3 different target pairs across the first 8 minutes.",
          },
          {
            title: "Move to the routine",
            instruction:
              "Move to the identified daily routine environment. At each planned vocalisation opportunity: pause and apply a 5-second Time Delay before offering assistance — creating a space for the child to vocalise spontaneously.",
          },
          {
            title: "Respond to content AND voice",
            instruction:
              "When the child vocalises during the routine: respond immediately to the communication content ('You said more — here you go!') AND celebrate the vocalisation separately ('I heard your voice — great talking!'). If the child does not vocalise within 5 seconds: provide a single model, wait 3 more seconds, then assist. Document each vocalisation: sound, context, item/event, spontaneous or prompted.",
          },
        ],
        checkin: {
          ...ROUTINE_PACING, // derived (P12-c)
          question: "Did the child vocalise at this opportunity?", // derived (F2)
          options: VOCAL_OPTIONS,
        },
        bonus: APPROXIMATION_BONUS, // Appendix §3b
        simplified: SIMPLIFIED,
      },
    },
  ],
};
