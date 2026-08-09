import type { ScriptVariant } from "@/lib/engine/session-script";
import type { PhaseSeed } from "./types";

/**
 * PHASE 7 — PECS PHASE 4: SENTENCE STRUCTURE
 * Transcribed from therapy_Exercises_12_phases_with_Simplified_Sections_2.docx.
 * CLINICAL CONTENT — verbatim where the source gives wording; derived text is
 * marked "derived (F2)".
 *
 * LOCKED DECISION: the sentence strip is a PHYSICAL velcro card exchange. The
 * app narrates, times, and scores; it does not render the exchange itself.
 *
 * BONUS (Appendix §3c — Attribute Expansion): +10, capped at 100, when the
 * child spontaneously adds a correct attribute card. No penalty tier. Applies
 * in Sessions 2–3 (Session 1 has no attribute cards yet).
 *
 * ── FLAGS FOR OWNER ─────────────────────────────────────────────────────────
 * P7-a  Scale (verbatim): Full Sentence 100 / Partial (item card only, no
 *       'I want') 75 / Prompted building 25 / Reversion to single card 0.
 *       Session 1's RL options don't include the Partial 75 tier explicitly
 *       ("No — handed only the item card" is treated as a retry prompt);
 *       options below use the full 4-tier scale everywhere. Confirm.
 * P7-b  Vocalisation co-tracking ("Did the child attempt any vocalisation
 *       while exchanging?") and partner-distribution summaries are unbuilt
 *       runtime features (vocalization_logs exists but the runner doesn't
 *       write it). The instruction to celebrate + document vocalisations is
 *       kept in the steps; the structured capture is flagged, not dropped.
 * ────────────────────────────────────────────────────────────────────────────
 */

const MINUTE_PACING = { interval_seconds: 60, count: 10 }; // derived: 8–15 trials over 10 minutes

// Scoring Criteria — PECS Phase 4 (verbatim credits; derived labels).
const STRIP_OPTIONS = [
  { label: "Built the full strip on their own (I want + item)", response_category: "Full Sentence Exchange", credit_value: 100 },
  { label: "Handed only the item card — no 'I want'", response_category: "Partial Sentence Exchange", credit_value: 75 },
  { label: "Needed a physical prompt to build the strip", response_category: "Prompted Sentence Building", credit_value: 25 },
  { label: "Reverted to a single-card exchange", response_category: "Reversion to Single Card", credit_value: 0 },
];

const ATTRIBUTE_BONUS = {
  kind: "attribute" as const,
  prompt: "Did they spontaneously add a correct attribute card (e.g., 'big', 'red') to the strip?",
};

// Simplified Session — One Card to Add (shared, F7).
const SIMPLIFIED: ScriptVariant = {
  title: "One Card to Add",
  overview:
    "Keeps the 'I want' card permanently attached to the sentence strip so the only motor step required of the child is placing a single item card, removing the multi-step sequencing demand of the standard session.",
  materials: [
    "The sentence strip with 'I want' permanently attached for the whole session",
    "One item card at a time, next to the strip",
  ],
  steps: [
    {
      title: "Pre-attach 'I want'",
      instruction:
        "Keep the 'I want' card permanently attached to the sentence strip for the whole session — the child never needs to pick it up or place it.",
    },
    { title: "One card only", instruction: "Show the child only one item card at a time next to the strip." },
    {
      title: "Model",
      instruction: "Model placing the single item card onto the open slot, then handing the whole strip over: 'I want [item]!'",
    },
    {
      title: "Guide",
      instruction:
        "Guide the child's hand to place just the item card, using hand-over-hand support if needed, then guide the strip into Caregiver A's hand.",
    },
    { title: "Read and reward", instruction: "Read the strip aloud immediately and give the item without any delay." },
    {
      title: "Repeat",
      instruction: "Repeat with the same one item card for 8–10 trials before introducing a second item card.",
    },
  ],
  checkin: {
    ...MINUTE_PACING,
    question: "Did the child place the item card and hand over the strip?", // verbatim
    options: [
      { label: "Yes — independently", response_category: "Completed — Independent", credit_value: 100 },
      { label: "Yes — with guidance", response_category: "Completed — Guided", credit_value: 100 }, // source: both recorded as completed
      { label: "No", response_category: "Not Completed", credit_value: 0 },
    ],
  },
};

export const PHASE_07: PhaseSeed = {
  phase_number: 7,
  name: "PECS Phase 4: Sentence Structure", // §13.2 canonical
  clinical_goal:
    "PECS Phase 4 introduces multi-symbol communication — the beginning of sentence construction. The child learns to build a simple sentence strip by placing an 'I want' symbol card on the strip, adding the picture card of the desired item, and handing the entire strip to the communication partner. The sentence strip gives the child their first experience of syntax — one of the most clinically significant milestones in the PECS programme.",
  phase_guidance: [
    "**Progress Indicators — What the Caregiver Should Look For**",
    "- Child independently places the 'I want' card on the sentence strip before selecting the item card.",
    "- Child hands the complete sentence strip — not just the item card alone — to the communication partner.",
    "- Child builds the sentence strip correctly across 3+ different item requests.",
    "- Caregiver reading the strip aloud triggers any vocalisation from the child (even a vowel sound — document it).",
    "- Child begins adding an attribute card (e.g., colour, size) to the sentence strip when prompted.",
    "",
    "**Important Therapy Tips**",
    "- Never skip the 'I want' card — even when it feels repetitive. The structure of the sentence strip is the skill being taught.",
    "- Read the strip aloud every single time. This consistent pairing of symbol → spoken word is what builds the bridge toward speech.",
    "- If a child begins to say 'I want' or just the item name while handing the strip over: respond with maximum reinforcement. Even an approximation ('I wa…' or just the vowel) is a milestone.",
    "- Attribute expansion (big, red, cold, crunchy) is optional in Phase 4 and should only be introduced when the base sentence is fully stable across 3 sessions.",
    "- The sentence strip must be physically accessible at all times. It should live at the child's preferred request location — not stored on a shelf.",
  ].join("\n"),
  has_simplified_session: true,
  content_version: 1,
  sessions: [
    // ── Session 1 — Introducing the Sentence Strip and 'I Want' ──────────────
    {
      session_number: 1,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Introducing the Sentence Strip and 'I Want'",
        overview:
          "Introduce the physical sentence strip and the 'I want' symbol card. Teach the child to place the 'I want' card in the first slot on the strip, then add the item card, then hand the complete strip to the communication partner — using the child's high-preference items and the least prompting needed.",
        materials: [
          "A velcro sentence strip — a long card with two velcro slots side by side. Pre-attach the 'I want' symbol card to the first slot; leave the second slot open for the item card",
          "2–3 of the child's highest-preference item cards on the binder alongside the sentence strip",
          "All corresponding items, available and visible to Caregiver A",
        ],
        steps: [
          {
            title: "Model the full sequence first",
            instruction:
              "Model the sentence strip sequence for the child first: pick up the 'I want' card, place it on the strip, pick up the item card, place it next to 'I want', then hand the entire strip to Caregiver A. Say 'I want [item]!' as you hand it over. Make it obvious, slow, and exciting.",
          },
          {
            title: "The child's turn",
            instruction:
              "Reset the strip and prompt the child to do the same. Use hand-over-hand guidance if needed — guiding them to place 'I want' first, then the item card, then hand the strip to Caregiver A.",
          },
          {
            title: "Read the strip aloud",
            instruction:
              "Caregiver A reads the strip aloud slowly, pointing to each symbol: 'I… want… [item]!' then gives the item immediately.",
          },
          {
            title: "Reset",
            instruction:
              "After each exchange: remove the item card from the strip and reset it on the binder. Leave the 'I want' card pre-attached so the child only needs to add the item card each trial.",
          },
          {
            title: "Fade prompts",
            instruction:
              "Fade physical prompts across trials: full hand-over-hand → wrist guidance → pointing to the strip → no prompt.",
          },
          {
            title: "Keep the focus narrow",
            instruction:
              "Run 8–10 trials. Use only 1–2 item cards in this first session to keep the child's focus on learning the strip structure rather than discriminating between cards.",
          },
        ],
        checkin: {
          ...MINUTE_PACING,
          question: "Did the child build the sentence strip correctly — 'I want' + item card?", // verbatim
          options: STRIP_OPTIONS, // P7-a
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 2 — Reading the Strip Aloud and Expanding with Attributes ────
    {
      session_number: 2,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Reading the Strip Aloud and Expanding with Attributes",
        overview:
          "Reinforce the sentence strip skill by having the caregiver read it aloud at every exchange — modelling the full spoken sentence paired with the symbol sequence. For children who are ready, introduce a simple attribute card (colour, size, or texture) to begin expanding the sentence.",
        materials: [
          "The same strip as Session 1 with both slots active: 'I want' + item card",
          "2–3 simple attribute cards (e.g., 'big', 'red', 'crunchy', 'cold') as an optional extension — do not introduce them unless the base sentence is fully stable",
          "3–5 preferred items — increase variety from Session 1",
        ],
        steps: [
          {
            title: "Build and exchange",
            instruction: "Child builds the sentence strip (I want + item card) and hands it to Caregiver A.",
          },
          {
            title: "Read aloud, every time",
            instruction:
              "Caregiver A reads the strip aloud every single time — slowly and clearly — pointing to each symbol: 'I… want… [item]!' then gives the item immediately. Never skip reading the strip aloud: this is how the child begins to associate the symbol sequence with the spoken sentence.",
          },
          {
            title: "Attributes for ready children",
            instruction:
              "After 4–5 successful base sentence trials, prompt the child to add an attribute card before the item card (e.g., 'I want big bubbles'). Model the expanded strip first. Use hand-over-hand if needed. Read the expanded strip aloud: 'I… want… big… bubbles!'",
          },
          {
            title: "Celebrate any vocalisation",
            instruction:
              "Do not require speech at this stage — the strip is the communication. If the child vocalises any sounds while handing over the strip, celebrate immediately with extra enthusiasm and document the sound produced.", // P7-b
          },
          {
            title: "Expand the variety",
            instruction: "Run 10–12 trials. Expand to 3–5 different item cards across the session.",
          },
        ],
        checkin: {
          ...MINUTE_PACING,
          question: "Did the child hand over a complete sentence strip — 'I want' + item card?", // verbatim
          options: STRIP_OPTIONS,
        },
        bonus: ATTRIBUTE_BONUS, // Appendix §3c
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 3 — Generalising Across Items and Partners ───────────────────
    {
      session_number: 3,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Generalising the Sentence Strip Across Items and Partners",
        overview:
          "Ensure the sentence strip becomes the child's default mode of requesting across a variety of items and with more than one communication partner. Any reversion to single-card exchange is blocked and redirected.",
        materials: [
          "4–6 item cards on the binder alongside the sentence strip",
          "A second communication partner (a different adult, therapist, or older sibling), introduced partway through the session",
          "If possible, a natural setting (kitchen, living room) for part of the session rather than a therapy table",
        ],
        steps: [
          {
            title: "Expanded choice",
            instruction:
              "Child selects from the expanded binder (4–6 cards), builds the sentence strip (I want + item card), and hands the complete strip to whichever communication partner is currently available.",
          },
          {
            title: "Two partners",
            instruction:
              "Both partners take turns receiving exchanges across the session — the child must approach whichever partner is nearest.",
          },
          {
            title: "Block reversion",
            instruction:
              "If the child attempts a single-card exchange (reverts): calmly block the exchange with a flat hand, point to the sentence strip without speaking, and wait. Do not provide a verbal prompt. Wait up to 10 seconds before using a minimum gestural prompt toward the strip.",
          },
          {
            title: "Keep cycling",
            instruction: "Continue for 12–15 trials, cycling through different items and different partners.",
          },
          {
            title: "Record vocalisations",
            instruction:
              "For any vocalisation that occurs with the strip exchange: celebrate loudly and record the sound, the item, and the context. These vocalisations are early speech attempts.", // P7-b
          },
        ],
        checkin: {
          ...MINUTE_PACING,
          question: "Did the child use the sentence strip, or revert to a single card?", // verbatim
          options: STRIP_OPTIONS,
        },
        bonus: ATTRIBUTE_BONUS, // Appendix §3c
        simplified: SIMPLIFIED,
      },
    },
  ],
};
