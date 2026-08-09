import type { ScriptVariant } from "@/lib/engine/session-script";
import type { PhaseSeed } from "./types";

/**
 * PHASE 4 — PECS PHASE 1: HOW TO COMMUNICATE (PHYSICAL PICTURE EXCHANGE)
 * Transcribed from therapy_Exercises_12_phases_with_Simplified_Sections_2.docx.
 * CLINICAL CONTENT — verbatim where the source gives wording; derived text is
 * marked "derived (F2)".
 *
 * Caregiver A / Caregiver B roles are kept verbatim — per the locked
 * single-caregiver-session decision, B is the in-room helper following the
 * on-screen instructions (no login).
 *
 * ── FLAGS FOR OWNER ─────────────────────────────────────────────────────────
 * P4-a  Session 1's RL question offers only 3 options ('on their own' /
 *       'with physical help' / 'No') — the Gestural Prompt 50% tier from this
 *       phase's Scoring Criteria has no RL option in Session 1. Transcribed
 *       as authored (3 options); confirm whether a gestural option belongs.
 * P4-b  Session 2's RL is a PROMPT-LEVEL SELECTOR (Full / Wrist / Elbow /
 *       Shoulder / None) with no per-level credits defined. Mapped onto the
 *       phase scale: None → Spontaneous 100; every touch level → Physical
 *       Prompt 25; plus a derived 'No exchange' 0. The prompt-level detail is
 *       preserved in response_category so the fading trend is recoverable from
 *       check-in data. (A dedicated prompt_fading_log UI is an unbuilt
 *       feature — the DB table exists but the runner doesn't write it.)
 * P4-c  Session 3's RL asks a bare Yes/No; options below are the phase's
 *       4-tier Scoring Criteria instead (derived labels) so prompted
 *       exchanges aren't over-credited. Confirm.
 * P4-d  Per-item logging in Session 3 ("log which item's card was used") and
 *       the per-item success display are unbuilt features — flagged, not
 *       silently dropped.
 * ────────────────────────────────────────────────────────────────────────────
 */

const MINUTE_PACING = { interval_seconds: 60, count: 10 }; // verbatim: "at every 60-second interval", 10-minute session

// Scoring Criteria — PECS Phase 1 (verbatim credits).
const FOUR_TIER = [
  { label: "Yes — picked up and handed the card on their own", response_category: "Spontaneous Exchange", credit_value: 100 },
  { label: "Yes — after a pointing gesture toward the card", response_category: "Gestural Prompt", credit_value: 50 },
  { label: "Yes — with hand-over-hand guidance", response_category: "Physical Prompt", credit_value: 25 },
  { label: "No — did not attempt the exchange", response_category: "No Response", credit_value: 0 },
];

// Simplified Session — Errorless Hand-to-Hand Exchange (shared, F7).
const SIMPLIFIED: ScriptVariant = {
  title: "Errorless Hand-to-Hand Exchange",
  overview:
    "Uses continuous, un-faded hand-over-hand support and keeps the picture card and Caregiver A's hand within easy reach throughout, so every trial ends in a successful exchange while the basic pattern becomes familiar.",
  materials: [
    "One preferred item and its one picture card, positioned within easy reach for the whole session",
  ],
  steps: [
    {
      title: "Sit close",
      instruction:
        "Caregiver A sits directly facing the child, close enough that the picture card, the item, and Caregiver A's open hand are all within easy reach without any searching.",
    },
    {
      title: "Continuous support",
      instruction:
        "Caregiver B sits beside the child with a hand resting gently near the child's hand the entire time — support is present continuously, not just when needed.",
    },
    { title: "Show the item silently", instruction: "Caregiver A holds the preferred item in view and says nothing." },
    {
      title: "Guide right away",
      instruction:
        "Caregiver B guides the child's hand to the card right away and all the way into Caregiver A's open palm — there is no waiting period before guidance begins.",
    },
    {
      title: "Celebrate instantly",
      instruction: "The moment the card touches Caregiver A's hand, celebrate warmly and give the item at once.",
    },
    {
      title: "Repeat",
      instruction:
        "Use only one item and run 6–8 trials in a row so the sequence becomes fully predictable before any fading begins.",
    },
  ],
  checkin: {
    interval_seconds: 60,
    count: 8, // derived: 6–8 trials
    question: "Was the full hand-over-hand exchange completed?", // verbatim intent
    options: [
      { label: "Yes", response_category: "Guided Exchange", credit_value: 100 },
      { label: "No", response_category: "Not Completed", credit_value: 0 },
    ],
  },
};

export const PHASE_04: PhaseSeed = {
  phase_number: 4,
  name: "PECS Phase 1: How to Communicate", // §13.2 canonical
  clinical_goal:
    "PECS Phase 1 teaches the child the fundamental act of communication: that giving a picture to another person results in getting what they want. This phase does not require the child to speak, make eye contact, or point. The only goal is that the child picks up a picture card of a desired item and physically places it into the caregiver's hand in order to receive that item.",
  phase_guidance: [
    "**Progress Indicators — What the Caregiver Should Look For**",
    "- Child spontaneously picks up the picture card without being prompted to do so.",
    "- Child moves toward the caregiver to hand over the card — even across a short distance.",
    "- Child makes the exchange consistently across at least 3 different preferred items.",
    "- Child attempts the exchange with more than one communication partner (caregiver, another adult, sibling).",
    "",
    "**Important Therapy Tips**",
    "- Never ask 'What do you want?' or name the item before the child exchanges — this teaches waiting for a verbal cue, not initiating.",
    "- Caregiver B must NEVER speak during prompting. Physical guidance only.",
    "- The reward must be instant — any delay breaks the communication-consequence link.",
    "- Use only items the child genuinely wants right now. Motivation drives initiation.",
    "- Do not correct the child if they grab the item instead of the card — simply block access to the item gently and redirect to the card.",
    "- Sessions can be run multiple times per day. The more exchanges, the faster the skill develops.",
  ].join("\n"),
  has_simplified_session: true,
  content_version: 1,
  sessions: [
    // ── Session 1 — The First Exchange: Single Picture, High Motivation ──────
    {
      session_number: 1,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "The First Exchange: Single Picture, High Motivation",
        overview:
          "Teach the child that handing a picture card to the caregiver immediately produces the item shown on the card. This is the child's first experience of intentional, functional communication through PECS. Roles: Caregiver A (Communication Partner) sits facing the child, holds the desired item visibly, receives the picture card and immediately gives the item. Caregiver B (Physical Prompter) sits slightly behind or beside the child and provides hand-over-hand physical guidance — never verbal — fading physical support as quickly as possible.",
        materials: [
          "3–5 of the child's highest-preference items (snacks, toys, bubbles, sensory items) — items the child genuinely wants right now, not just sometimes",
          "One clear picture card of the most preferred item (real photo or simple illustration; laminate if possible). Start with just one card — do not place multiple cards in front of the child in this session",
          "A small PECS communication binder or board, with the picture card placed on it within reach of the child before the session begins",
        ],
        steps: [
          {
            title: "Positions",
            instruction:
              "Caregiver A sits facing the child at eye level and holds the preferred item visibly — in view but not yet within the child's reach. Caregiver B positions behind the child, ready to prompt physically without speaking.",
          },
          {
            title: "Wait in silence",
            instruction: "Caregiver A says nothing — no verbal prompt. Simply hold the item in view and wait.",
          },
          {
            title: "Guide the exchange",
            instruction:
              "Caregiver B uses hand-over-hand guidance to help the child pick up the picture card from the binder and physically place it into Caregiver A's open, waiting hand.",
          },
          {
            title: "Instant reward",
            instruction:
              "The instant the card touches Caregiver A's hand: Caregiver A says excitedly '[Item name]! You want [item]!' and immediately gives the child the item. No delay. No waiting. The reward is instant.",
          },
          {
            title: "Reset and repeat",
            instruction:
              "Allow the child to enjoy the item for 20–30 seconds, then gently take it back and reset the card on the binder. Repeat.",
          },
          {
            title: "Fade from the start",
            instruction:
              "Run 8–12 trials per session. Begin fading the physical prompt from the very first session — reduce hand-over-hand to wrist guidance, then elbow tap, then no touch.",
          },
        ],
        checkin: {
          ...MINUTE_PACING, // verbatim 60s interval
          question: "Did the child pick up and hand over the picture card?", // verbatim
          // P4-a: the source's three options for this session, as authored.
          options: [
            { label: "Yes — on their own", response_category: "Spontaneous Exchange", credit_value: 100 },
            { label: "Yes — with physical help", response_category: "Physical Prompt", credit_value: 25 },
            { label: "No", response_category: "No Response", credit_value: 0 },
          ],
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 2 — Fading the Physical Prompt ───────────────────────────────
    {
      session_number: 2,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Fading the Physical Prompt",
        overview:
          "Systematically reduce the physical guidance from Session 1 so that the child initiates the picture exchange independently, without hand-over-hand support from Caregiver B. Prompt fading hierarchy, in order: Level 1 Full hand-over-hand (only if the child does not initiate at all) → Level 2 Wrist tap (do not guide the full movement) → Level 3 Elbow tap (child reaches and hands the card independently) → Level 4 Shoulder tap (a minimal cue that fades quickly) → Level 5 No prompt (the child initiates entirely independently — this is the target).",
        materials: [
          "The same 3–5 high-preference items from Session 1 — rotate items across trials to maintain motivation",
          "The same single picture card as Session 1, on the PECS binder within the child's reach",
        ],
        steps: [
          {
            title: "Start at the lowest level needed",
            instruction:
              "Begin each trial at the lowest prompt level the child needs — never start at a higher level of support than necessary.",
          },
          {
            title: "Minimum prompt",
            instruction: "Caregiver A holds the item in view and waits. Caregiver B uses the minimum prompt required.",
          },
          {
            title: "Instant reward",
            instruction:
              "When the child hands over the card: Caregiver A immediately says '[Item]! You want [item]!' and gives the item.",
          },
          {
            title: "Fade one level per success",
            instruction:
              "After each successful trial, attempt the next trial with one prompt level less than the previous.",
          },
          {
            title: "Stabilise on failure",
            instruction:
              "If the child fails with less prompting, return one level and stabilise before fading again.",
          },
          {
            title: "Target",
            instruction:
              "By the end of Session 2, the child should be completing exchanges at Level 3 (elbow tap) or better.",
          },
        ],
        checkin: {
          ...MINUTE_PACING,
          question: "Which prompt level did this exchange need?", // derived (P4-b)
          // P4-b mapping: None → Spontaneous 100; any touch level → Physical 25.
          options: [
            { label: "None — fully independent", response_category: "Spontaneous Exchange", credit_value: 100 },
            { label: "Shoulder tap", response_category: "Physical Prompt — Shoulder", credit_value: 25 },
            { label: "Elbow tap", response_category: "Physical Prompt — Elbow", credit_value: 25 },
            { label: "Wrist tap", response_category: "Physical Prompt — Wrist", credit_value: 25 },
            { label: "Full hand-over-hand", response_category: "Physical Prompt — Full", credit_value: 25 },
            { label: "No exchange this trial", response_category: "No Response", credit_value: 0 }, // derived
          ],
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 3 — Multiple Items, Multiple Exchanges ───────────────────────
    {
      session_number: 3,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Multiple Items, Multiple Exchanges",
        overview:
          "Generalise the exchange skill across multiple different preferred items, confirming that the child understands the communication concept — not just that handing a specific card produces a specific item in a rote way.",
        materials: [
          "3–5 picture cards, each showing a different preferred item — placed one at a time on the binder (never all simultaneously in this session)",
          "All corresponding items, ready and visible to the child",
          "The PECS binder, within easy reach of the child throughout the session",
        ],
        steps: [
          {
            title: "One card at a time",
            instruction: "Place one picture card on the binder. Hold the corresponding item in view.",
          },
          {
            title: "Minimum prompt",
            instruction: "Wait. Use the minimum prompt level the child required at the end of Session 2.",
          },
          {
            title: "Instant reward",
            instruction:
              "When the child exchanges the card: immediately say '[Item]! You want [item]!' and give the item.",
          },
          {
            title: "Rotate items",
            instruction:
              "After the child enjoys the item briefly, swap the card on the binder for a different item's picture card. Hold the new item in view. Repeat across all 3–5 items, rotating through them across the session's trials.",
          },
          {
            title: "Second partner",
            instruction:
              "Begin introducing a second communication partner partway through the session — a different adult or an older sibling — so the child practises exchanging with someone other than the primary caregiver.",
          },
        ],
        checkin: {
          ...MINUTE_PACING, // verbatim 60s interval
          question: "Did the child exchange the card for the correct item?", // verbatim
          options: FOUR_TIER, // derived (P4-c): full Scoring Criteria tiers
        },
        simplified: SIMPLIFIED,
      },
    },
  ],
};
