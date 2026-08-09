import type { ScriptVariant } from "@/lib/engine/session-script";
import type { PhaseSeed } from "./types";

/**
 * PHASE 6 — PECS PHASE 3: PICTURE DISCRIMINATION
 * Transcribed from therapy_Exercises_12_phases_with_Simplified_Sections_2.docx.
 * CLINICAL CONTENT — verbatim where the source gives wording; derived text is
 * marked "derived (F2)".
 *
 * EXCEPTION SCALE (Appendix §2a — authoritative over the in-phase table):
 * measures accuracy of card selection + self-correction, NOT prompt level.
 *   100 Correct Discrimination (correct card, first attempt)
 *    75 Self-Corrected Error (child corrects before completing the exchange,
 *       without caregiver intervention)
 *    25 Caregiver-Corrected Error (needed the 4-step error correction)
 *     0 Position-Based Selection (position/habit, not picture identity)
 * NOTE the in-phase table's older wording (self-correction after receiving the
 * wrong item = 75; no-self-correction = 0) differs from the appendix. The
 * appendix values are used; the check-in labels below describe the observable
 * behaviours from the phase text. CONFIRM the reconciliation (P6-a).
 *
 * ── FLAGS FOR OWNER ─────────────────────────────────────────────────────────
 * P6-a  In-phase scoring table vs Appendix §2a reconciliation (above).
 * P6-b  The source's RL uses a TWO-STEP question flow (which card? → did they
 *       self-correct?). Flattened to one four-option check-in. Confirm.
 * P6-c  Session 3's array-size tracker (3/4/5 cards) with auto-prompts to
 *       expand/contract is an unbuilt runtime feature; the expansion rules are
 *       carried in the steps so the caregiver applies them manually.
 * P6-d  Simplified: the source defines only two outcomes (Correct / Guided to
 *       correct — both successes, errors are prevented). Both credit 100; a
 *       derived 'No exchange' 0 option is added because the scale needs a
 *       non-success option.
 * ────────────────────────────────────────────────────────────────────────────
 */

const MINUTE_PACING = { interval_seconds: 60, count: 10 }; // derived: 10–12 trials over 10 minutes

// Appendix §2a exception scale, flattened per P6-b.
const DISCRIMINATION_OPTIONS = [
  { label: "Correct card — first try", response_category: "Correct Discrimination", credit_value: 100 },
  { label: "Wrong card, but self-corrected", response_category: "Self-Corrected Error", credit_value: 75 },
  { label: "Wrong card — needed the 4-step correction", response_category: "Caregiver-Corrected Error", credit_value: 25 },
  { label: "Chose by position (same side regardless of card)", response_category: "Position-Based Selection", credit_value: 0 },
];

// Simplified Session — Errorless Two-Card Choice (shared, F7).
const SIMPLIFIED: ScriptVariant = {
  title: "Errorless Two-Card Choice",
  overview:
    "Uses two highly distinct cards and gently guides the child's hand toward the correct card before an error can happen, rather than allowing the natural-consequence error used in the standard session.",
  materials: [
    "Two cards that look as different as possible from each other — for example, a photo of a favourite food next to a plain shape card the child has never wanted",
    "The corresponding preferred item, in view",
  ],
  steps: [
    {
      title: "Pick a distinct pair",
      instruction:
        "Choose two cards that look as different as possible from each other. Place both cards on the binder with the item in view.",
    },
    {
      title: "Prevent the error",
      instruction:
        "As the child's hand moves toward a card, gently guide it toward the correct card if it drifts toward the other one — the goal is to prevent the error rather than correct it afterward.",
    },
    {
      title: "Reward instantly",
      instruction: "The instant the correct card is exchanged, celebrate warmly and give the item right away.",
    },
    {
      title: "Repeat, then close the gap",
      instruction:
        "Run 8–10 trials with this same highly distinct pair before introducing a closer, more similar pair of cards.",
    },
    {
      title: "Rotate every trial",
      instruction:
        "Rotate the left/right position of the two cards every trial from the start, so position never becomes a habit.",
    },
  ],
  checkin: {
    ...MINUTE_PACING,
    question: "Did the child need guidance to reach the correct card?", // verbatim intent
    options: [
      { label: "No — reached the correct card on their own", response_category: "Correct Card — Independent", credit_value: 100 },
      { label: "Yes — guided to the correct card", response_category: "Guided to Correct Card", credit_value: 100 }, // P6-d
      { label: "No exchange this trial", response_category: "No Exchange", credit_value: 0 }, // derived (P6-d)
    ],
  },
};

export const PHASE_06: PhaseSeed = {
  phase_number: 6,
  name: "PECS Phase 3: Picture Discrimination", // §13.2 canonical
  clinical_goal:
    "PECS Phase 3 introduces choice and intentional selection: the child learns to discriminate between two or more picture cards — selecting the specific card that matches the item they actually want, rather than handing over any available card. Picture discrimination is the cognitive and communicative bridge between physical exchange and meaningful language.",
  phase_guidance: [
    "**Progress Indicators — What the Caregiver Should Look For**",
    "- Child selects the correct picture card from a 2-card array consistently (80%+ of trials across 3 sessions).",
    "- Child selects the correct card from a 3–5 card array.",
    "- Child self-corrects when given the wrong item — returns it and exchanges the correct card.",
    "- Child discriminates between two preferred item cards (not just preferred vs. non-preferred).",
    "- Card position rotation does not affect accuracy — confirming true discrimination rather than position learning.",
    "",
    "**Important Therapy Tips**",
    "- Never express disappointment when the child selects incorrectly — give the item neutrally. The natural consequence of receiving the wrong item is the teaching moment.",
    "- The 4-step error correction must be calm, fast, and consistent — same steps, every time, every trial.",
    "- Position rotation is non-negotiable. Without rotating card positions, you may be teaching left/right habits rather than discrimination.",
    "- If a child is stuck at 2-card discrimination, check whether the card images are visually distinct enough. Similar-looking or low-quality images create unnecessary perceptual difficulty.",
    "- Generalise across different communication partners throughout this phase — the child should discriminate accurately with any adult, not only the primary caregiver.",
    "- Generalise to different environments partway through Session 3 — move to a different room or surface to check that discrimination is not context-dependent.",
  ].join("\n"),
  has_simplified_session: true,
  content_version: 1,
  sessions: [
    // ── Session 1 — Preferred vs Non-Preferred Card ──────────────────────────
    {
      session_number: 1,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Discriminating Between a Preferred and a Non-Preferred Card",
        overview:
          "Teach the child to select one specific picture card from an array of two — the target preferred item card and a distractor card representing a non-preferred or unrelated item — confirming that the exchange is intentional and not random. Four-step error correction (when the child accepts the wrong item without attempting to self-correct): Step 1 Model — point to the correct card and say the item name once, no physical prompt yet. Step 2 Prompt — if no response within 5 seconds, lightly guide the child's hand to the correct card. Step 3 Switch — run one easy, distraction-free trial the child will succeed at. Step 4 Retry — return to the two-card array and repeat the discrimination trial.",
        materials: [
          "Two picture cards on the PECS binder: the target card (highly preferred item) and a distractor card (non-preferred item or unrelated object). Laminate both if possible",
          "Both items available — when the child exchanges the distractor card, give the non-preferred item: this is the error consequence, not a punishment",
          "A way to record position changes — swap the cards' left/right positions after every 2 trials",
        ],
        steps: [
          {
            title: "Present the array",
            instruction:
              "Caregiver A holds both items in view. The binder displays both picture cards — target and distractor.",
          },
          {
            title: "No early reaction",
            instruction: "Child approaches the binder and selects a card. Do not react before the card is handed over.",
          },
          {
            title: "Natural consequence",
            instruction:
              "Caregiver A immediately gives the item that matches the card exchanged — whether correct or not. No correction, no hesitation.",
          },
          {
            title: "Celebrate correct choices",
            instruction:
              "If the child selected the correct card: big celebration — 'YES! [Item]! You chose [item]!' and give the preferred item immediately.",
          },
          {
            title: "Allow self-correction",
            instruction:
              "If the child selected the distractor card: give the non-preferred item neutrally and silently. Wait 3–5 seconds. If the child rejects it or looks dissatisfied, allow them to return to the binder and exchange the correct card.",
          },
          {
            title: "Rotate and repeat",
            instruction: "Rotate card positions (left/right swap) after every 2 trials. Run 10–12 trials per session.",
          },
        ],
        checkin: {
          ...MINUTE_PACING,
          question: "How did the card selection go?", // derived flatten (P6-b)
          options: DISCRIMINATION_OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 2 — Two Preferred Items ──────────────────────────────────────
    {
      session_number: 2,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Discriminating Between Two Preferred Items",
        overview:
          "Increase the difficulty of discrimination by presenting two cards that both represent items the child wants — requiring a genuine choice between two preferred things rather than simply avoiding a non-preferred item. This confirms the child is reading the picture cards meaningfully.",
        materials: [
          "Two picture cards, both of preferred items: the one the child wants more right now (the target) and one also preferred but slightly less so in this moment (the foil)",
          "Both preferred items, visible and available — give whichever item the card represents without hesitation",
          "Rotate card positions every 2 trials; vary which item is presented more prominently",
        ],
        steps: [
          {
            title: "Present the choice",
            instruction: "Caregiver A holds both preferred items in view. Child approaches the binder and selects a card.",
          },
          {
            title: "Give what was asked",
            instruction: "Caregiver A gives the item matching the card exchanged immediately and without comment.",
          },
          {
            title: "Celebrate a happy match",
            instruction: "If the child accepts the item happily: correct and intentional choice — celebrate with enthusiasm.",
          },
          {
            title: "Self-correction, not a swap",
            instruction:
              "If the child rejects the item and appears to want the other one: do not swap items. Allow the child to return to the binder and exchange the other card. This teaches self-correction and persistent, accurate communication.",
          },
          {
            title: "Watch for position habits",
            instruction:
              "If the child consistently selects by position (always left or always right): increase rotation frequency to every trial and check whether the card images are visually distinct enough.",
          },
          {
            title: "Vary and repeat",
            instruction:
              "Run 10–12 trials. Vary which item is more available or prominently held across trials to ensure the child is truly discriminating based on the card image.",
          },
        ],
        checkin: {
          ...MINUTE_PACING,
          question: "How did the card selection go?", // derived flatten (P6-b)
          options: DISCRIMINATION_OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 3 — Expanding the Array to 3–5 Cards ─────────────────────────
    {
      session_number: 3,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Expanding the Array to 3–5 Cards",
        overview:
          "Progressively expand the picture array from 2 to 3, then 4, then 5 cards within the session — building the child's discrimination capacity toward a functional, multi-symbol communication board and preparing directly for Phase 4 sentence structure.",
        materials: [
          "3–5 picture cards: start with 3 on the binder; a mix of preferred and mildly preferred items with all corresponding items available",
          "Clear organisation: consistent spacing, no overlapping — the child must be able to scan the array comfortably",
        ],
        steps: [
          {
            title: "Start at 3 cards",
            instruction: "Start the session with 3 cards on the binder. Child selects a card and exchanges it for the matching item.",
          },
          {
            title: "Celebrate and correct",
            instruction:
              "Celebrate correct selections. Run the 4-step error correction procedure for any error with no self-correction.",
          },
          {
            title: "Expand on success",
            instruction:
              "After 4 consecutive correct trials at 3 cards: add the 4th card and continue. After 4 consecutive correct trials at 4 cards: add the 5th card and continue.", // P6-c
          },
          {
            title: "Contract on struggle",
            instruction:
              "If accuracy drops below 80% after adding a new card: remove the most recently added card and stabilise at the smaller array for 4 successful trials before attempting the expansion again.",
          },
          {
            title: "Rotate",
            instruction: "Rotate all card positions after every 3 trials throughout the session.",
          },
        ],
        checkin: {
          ...MINUTE_PACING,
          question: "How did the card selection go?", // derived flatten (P6-b)
          options: DISCRIMINATION_OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },
  ],
};
