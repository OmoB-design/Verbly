import type { ScriptVariant } from "@/lib/engine/session-script";
import type { PhaseSeed } from "./types";

/**
 * PHASE 9 — PECS PHASE 6: COMMENTING
 * Transcribed from therapy_Exercises_12_phases_with_Simplified_Sections_2.docx.
 * CLINICAL CONTENT — verbatim where the source gives wording; derived text is
 * marked "derived (F2)".
 *
 * SCALE (verbatim): Spontaneous Comment 100 / Responsive Comment 50 /
 * Request Instead of Comment 0.
 * BONUS (Appendix §3a — Correct Stem Selection): multi-stem sessions only.
 * Correct stem +10 capped at 100; incorrect stem −10 floored at 50 (a
 * spontaneous exchange with the wrong stem never scores below a prompted
 * exchange with the correct stem). Applies in Sessions 1–3 (all multi-stem);
 * the Simplified Session uses ONE stem, so the bonus does NOT apply there.
 *
 * ── FLAGS FOR OWNER ─────────────────────────────────────────────────────────
 * P9-a  Per-stem accuracy breakdowns, live spontaneous-comment counters with
 *       target ("Spontaneous Comments: X / Target: 3"), and the 4-minute
 *       no-comment auto-flag are unbuilt runtime features; the targets and
 *       trigger rules are carried in the steps.
 * ────────────────────────────────────────────────────────────────────────────
 */

const MINUTE_PACING = { interval_seconds: 60, count: 10 }; // derived: 6–10 trials over 10 minutes

// Verbatim scale (derived labels).
const COMMENT_OPTIONS = [
  { label: "Commented on their own — without being asked", response_category: "Spontaneous Comment", credit_value: 100 },
  { label: "Commented after being asked ('What do you see/hear?')", response_category: "Responsive Comment", credit_value: 50 },
  { label: "Built an 'I want' strip instead", response_category: "Request Instead of Comment", credit_value: 0 },
];

const STEM_BONUS = {
  kind: "stem" as const,
  prompt: "Did they pick the contextually correct stem (e.g., 'I hear' for a sound)?",
};

// Simplified Session — One Comment Stem, Big Reactions (shared, F7). Single
// stem → NO stem bonus (Appendix §3a: multi-stem sessions only).
const SIMPLIFIED: ScriptVariant = {
  title: "One Comment Stem, Big Reactions",
  overview:
    "Narrows practice to the single 'I see' stem with one highly obvious, motivating trigger, modelled with maximum caregiver enthusiasm and immediate hand-over-hand guidance.",
  materials: [
    "Only the 'I see' strip — 'I hear', 'I feel', and 'It is' are set aside until this stem is stable",
    "One big, obvious, highly motivating trigger the child already loves noticing (e.g., blowing bubbles across the room, a favourite wind-up toy)",
  ],
  steps: [
    { title: "One stem only", instruction: "Use only the 'I see' strip for the whole session — set the other stems aside for now." },
    {
      title: "Trigger and model",
      instruction:
        "Trigger the event and immediately model the comment yourself with big excitement: 'I see bubbles!' while attaching the picture card to the strip.",
    },
    {
      title: "Guide right away",
      instruction:
        "Guide the child's hand through the same sequence right away — do not wait for a spontaneous attempt in this simplified mode.",
    },
    {
      title: "Social reward only",
      instruction:
        "Respond to the strip with maximum social enthusiasm only — no tangible item, matching the standard Phase 6 rule.",
    },
    {
      title: "Repeat the same trigger",
      instruction:
        "Repeat the same single trigger 8–10 times so the 'I see' pattern becomes familiar before introducing a second trigger or stem.",
    },
  ],
  checkin: {
    ...MINUTE_PACING,
    question: "Did the child complete the comment strip exchange (guided or independent)?", // verbatim intent
    options: [
      { label: "Yes — independently", response_category: "Comment Completed — Independent", credit_value: 100 },
      { label: "Yes — guided", response_category: "Comment Completed — Guided", credit_value: 100 },
      { label: "No", response_category: "Not Completed", credit_value: 0 },
    ],
  },
};

export const PHASE_09: PhaseSeed = {
  phase_number: 9,
  name: "PECS Phase 6: Commenting", // §13.2 canonical
  clinical_goal:
    "PECS Phase 6 teaches the child that communication is not only about requesting things — it is also about sharing observations, reactions, and thoughts with another person simply because they want to share them ('I see…', 'I hear…', 'I feel…', 'It is…'). Commenting is what transforms functional requesting into true social communication, laying the foundation for conversation, joint attention, and social relationships.",
  phase_guidance: [
    "**Progress Indicators — What the Caregiver Should Look For**",
    "- Child builds and exchanges a comment sentence strip ('I see…', 'I hear…') in response to interesting events or objects.",
    "- Child uses commenting spontaneously — without being asked — in at least 2 different natural situations per session.",
    "- Child uses different commenting stems (I see / I hear / I feel / It is) appropriately across different contexts.",
    "- Child selects the correct commenting stem (not 'I want') when responding to a novel event.",
    "- Child begins to vocalise any part of the comment while handing the strip — even an approximation is significant.",
    "",
    "**Important Therapy Tips**",
    "- Never reward a comment with a tangible item. Social praise — enthusiasm, shared attention, mirroring the child's emotion — is the only appropriate reinforcer for commenting.",
    "- Accept any comment that is genuine — even if the stem selected is slightly wrong. The intent to share an observation matters more than perfect form at this stage.",
    "- If the child is vocalising any sounds alongside their comment strip exchanges, shape and celebrate those vocalisations immediately. Phase 6 is often when spontaneous speech first emerges in children who have been non-verbal.",
    "- Document every vocalisation: the date, the sound produced, the item or event that triggered it, and whether it was spontaneous.",
    "- Continue all PECS phases simultaneously in daily routines — requesting, responding, and commenting are now all active communication skills.",
  ].join("\n"),
  has_simplified_session: true,
  content_version: 1,
  sessions: [
    // ── Session 1 — 'I See' and 'I Hear' ─────────────────────────────────────
    {
      session_number: 1,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Introducing Comment Stems: 'I See' and 'I Hear'",
        overview:
          "Introduce the concept of commenting by teaching two new sentence strip starters — 'I see' and 'I hear' — and making a clear, explicit distinction between these commenting stems and the 'I want' requesting stem. This distinction between requesting and commenting is the core clinical goal of this phase.",
        materials: [
          "Two new sentence strips: one with 'I see' in the first slot, one with 'I hear' — placed alongside the 'I want' strip so all three are visible",
          "3–4 interesting objects or events the child notices or reacts to but does not necessarily want: a spinning top, a musical toy, a blinking light, a funny sound, a pet walking past",
          "Picture cards of the interesting objects, to attach to the comment strip alongside the stem",
        ],
        steps: [
          {
            title: "Trigger, then wait",
            instruction:
              "Present an interesting object or event (e.g., spin a top in front of the child). Say nothing. Wait for any reaction.",
          },
          {
            title: "Model the comment",
            instruction:
              "Pick up the 'I see' strip, attach the picture card of the top, and hand the complete strip to Caregiver A. Say 'I see a spinning top!' with genuine excitement.",
          },
          {
            title: "The child's turn",
            instruction: "Reset and prompt the child to do the same — using hand-over-hand if needed.",
          },
          {
            title: "Social response only",
            instruction:
              "Caregiver A receives the comment strip and responds with a natural social response — not with a tangible item: 'Yes! A spinning top! Wow — look at it go!' Commenting is NOT rewarded with the item; the reward is entirely social. Mixing tangible rewards into commenting trials undermines Phase 6.",
          },
          {
            title: "Add 'I hear'",
            instruction:
              "Repeat with 'I hear' using a sound-based trigger (e.g., a drum, a song, a doorbell). Run 6–8 trials per commenting stem.",
          },
          {
            title: "Redirect requests gently",
            instruction:
              "If the child reaches for the object or builds an 'I want' strip: acknowledge the request, honour it briefly, then redirect — 'Yes, and look — I see it spinning!' — and model the 'I see' strip.",
          },
        ],
        checkin: {
          ...MINUTE_PACING,
          question: "Did the child build and exchange a comment strip?", // verbatim
          options: COMMENT_OPTIONS,
        },
        bonus: STEM_BONUS, // multi-stem (2 stems in play)
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 2 — 'I Feel' and 'It Is' ─────────────────────────────────────
    {
      session_number: 2,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Expanding Comments: 'I Feel' and 'It Is'",
        overview:
          "Introduce two additional commenting stems — 'I feel' and 'It is' — expanding the child's commenting vocabulary to include internal emotional states and descriptive observation.",
        materials: [
          "'I feel' and 'It is' sentence strips added to the binder — all strips now visible: I want / I see / I hear / I feel / It is",
          "Simple emotion picture cards: happy, surprised, scared, excited, tired — clear, unambiguous illustrations or real photographs",
          "Simple descriptive picture cards: big, hot, cold, loud, quiet, soft — used with the 'It is' strip",
          "4–5 planned situations that trigger a clear feeling or sensory reaction: a cold ice cube (It is cold), a favourite song starting (I feel happy), a loud noise (I hear a bang / It is loud), a big toy (It is big)",
        ],
        steps: [
          {
            title: "Trigger a reaction",
            instruction:
              "Present a planned situation that triggers a clear emotional or sensory reaction (e.g., hand the child a cold ice cube — 'It is cold').",
          },
          {
            title: "Model with the right strip",
            instruction:
              "Pick up 'It is', attach the 'cold' descriptor card, hand the strip to Caregiver A. Say 'It is cold!' with a genuine facial reaction.",
          },
          {
            title: "The child's turn",
            instruction: "Prompt the child to build the same comment. Use hand-over-hand if needed.",
          },
          {
            title: "Social reward only",
            instruction:
              "Caregiver A responds with genuine shared emotion — 'It IS cold! Brr!' No tangible item.",
          },
          {
            title: "Add 'I feel'",
            instruction: "Repeat with 'I feel' using an emotion trigger (favourite song starts → 'I feel happy'). Model and prompt.",
          },
          {
            title: "Mix all stems",
            instruction:
              "Mix all four commenting stems across the session so the child practises selecting the contextually correct strip based on the situation rather than habit. Run 8–10 trials. Celebrate any spontaneous commenting — regardless of stem — with maximum social reinforcement.",
          },
        ],
        checkin: {
          ...MINUTE_PACING,
          question: "Did the child build and exchange a comment strip?", // verbatim intent
          options: COMMENT_OPTIONS,
        },
        bonus: STEM_BONUS, // multi-stem (4 stems in play)
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 3 — Spontaneous Commenting in Natural Situations ─────────────
    {
      session_number: 3,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Spontaneous Commenting in Natural Situations",
        overview:
          "Generalise commenting to natural, everyday situations — moving it entirely out of structured trials and into real interactions where the child comments on events, objects, and feelings spontaneously as they arise. Target: at least 3 spontaneous comments without prompting.",
        materials: [
          "A natural setting: living room, garden, kitchen, or playground — wherever the child's daily life happens",
          "The portable PECS binder, accessible throughout the environment — if the child cannot reach the binder, commenting cannot happen",
          "4–5 pre-planned events likely to trigger comments: a pet walking in, a funny video clip, a cold or warm item, a loud sudden sound, a big or surprising object appearing",
        ],
        steps: [
          {
            title: "Let it flow",
            instruction:
              "Allow the session to flow naturally in the chosen environment. Introduce one planned trigger at a time and wait for the child to comment spontaneously. Do not set up trials — react to whatever the child notices rather than directing their attention.",
          },
          {
            title: "One question only",
            instruction:
              "If the child does not comment within 10 seconds of a trigger: ask 'What do you see/hear/feel?' — a single spoken question only, no gesture.",
          },
          {
            title: "Match their register",
            instruction:
              "When the child comments (spontaneously or responsively): respond with genuine social reinforcement — 'Yes! It IS loud! Wow!' — matching the child's emotional register. No tangible reward.",
          },
          {
            title: "Keep requesting alive",
            instruction:
              "Mix in spontaneous requesting opportunities so the child continues to use all PECS skills together in the same natural setting.",
          },
          {
            title: "Document everything",
            instruction:
              "Document every commenting attempt: spontaneous or prompted, which stem was used, what triggered it, and any vocalisation that occurred.", // P9-a
          },
        ],
        checkin: {
          ...MINUTE_PACING,
          question: "Did the child comment on the trigger?", // derived (F2)
          options: COMMENT_OPTIONS,
        },
        bonus: STEM_BONUS, // multi-stem (all stems available)
        simplified: SIMPLIFIED,
      },
    },
  ],
};
