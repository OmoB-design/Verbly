import type { ScriptVariant } from "@/lib/engine/session-script";
import type { PhaseSeed } from "./types";

/**
 * PHASE 5 — PECS PHASE 2: DISTANCE AND PERSISTENCE
 * Transcribed from therapy_Exercises_12_phases_with_Simplified_Sections_2.docx.
 * CLINICAL CONTENT — verbatim where the source gives wording; derived text is
 * marked "derived (F2)".
 *
 * ── FLAGS FOR OWNER ─────────────────────────────────────────────────────────
 * P5-a  The RL text for each session uses 2–3 informal options ('Yes — with
 *       prompt', 'No — child withdrew') whose credit tiers aren't stated
 *       per-option. Options below are aligned to the phase's 4-tier Scoring
 *       Criteria (Spontaneous 100 / Gestural 50 / Physical 25 / None 0);
 *       Session 3's 'withdrew before the delay ended' is credited at the
 *       Gestural 50 tier (the source says only "partial credit") — CONFIRM.
 * P5-b  Distance/position/delay-level logging ("logs Caregiver A's position",
 *       "displays the current delay level", per-distance success data) are
 *       unbuilt runtime features; the protocol lives in the steps so the
 *       caregiver still runs it correctly.
 * ────────────────────────────────────────────────────────────────────────────
 */

const MINUTE_PACING = { interval_seconds: 60, count: 10 }; // verbatim: 60s interval, 10-minute session

// Scoring Criteria — PECS Phase 2 (verbatim credits; derived labels, P5-a).
const FOUR_TIER = [
  { label: "Yes — travelled and exchanged on their own", response_category: "Spontaneous Exchange", credit_value: 100 },
  { label: "Yes — after a pointing gesture", response_category: "Gestural Prompt", credit_value: 50 },
  { label: "Yes — with hand-over-hand guidance", response_category: "Physical Prompt", credit_value: 25 },
  { label: "No — did not initiate", response_category: "No Response", credit_value: 0 },
];

// Simplified Session — Arm's-Length Exchange, No Delay (shared, F7).
const SIMPLIFIED: ScriptVariant = {
  title: "Arm's-Length Exchange, No Delay",
  overview:
    "Returns to an arm's-length exchange with an instant reward, then reintroduces distance and delay one at a time rather than together, so the child is never asked to manage two new demands at once.",
  materials: ["One preferred item and its picture card, within easy reach"],
  steps: [
    { title: "Sit at arm's length", instruction: "Caregiver A sits at arm's length from the child — no walking is required." },
    { title: "Stay close", instruction: "Caregiver B stays close enough to guide the child's hand if needed." },
    { title: "Open hand right away", instruction: "Caregiver A holds the item in view and extends an open hand right away." },
    {
      title: "Zero delay",
      instruction: "The moment the child hands over the card, give the item immediately — with no delay of any length.",
    },
    {
      title: "Small distance steps",
      instruction:
        "Once the child completes 8 successful arm's-length exchanges in a row, increase the distance by a small step (half a metre) for the next trial only.",
    },
    {
      title: "Delay comes last",
      instruction:
        "Only after distance is comfortable at 1–1.5 metres should any delay be reintroduced, starting at 1 second.",
    },
  ],
  checkin: {
    ...MINUTE_PACING,
    question: "Was the exchange completed at the current distance?", // verbatim intent
    options: [
      { label: "Yes", response_category: "Completed Exchange", credit_value: 100 },
      { label: "No", response_category: "Not Completed", credit_value: 0 },
    ],
  },
};

export const PHASE_05: PhaseSeed = {
  phase_number: 5,
  name: "PECS Phase 2: Distance and Persistence", // §13.2 canonical
  clinical_goal:
    "PECS Phase 2 teaches the child that communication works across distances and requires persistence: the child must travel to reach the communication partner and tolerate a brief, intentional delay before receiving their item. It also consolidates use of the communication book — a portable PECS binder the child retrieves their picture cards from independently, shifting ownership of the communication system from the caregiver to the child.",
  phase_guidance: [
    "**Progress Indicators — What the Caregiver Should Look For**",
    "- Child independently travels 1–2 metres to reach the communication partner and hand over the card.",
    "- Child retrieves the picture card from the communication book without prompting.",
    "- Child persists in the exchange attempt — does not give up if the partner does not respond immediately.",
    "- Child tolerates a 3–5 second response delay before receiving the item.",
    "- Child generalises the exchange to at least two different communication partners.",
    "",
    "**Important Therapy Tips**",
    "- Never call the child over to the partner — the child must initiate the travel independently.",
    "- Caregiver B should fade physical prompting as quickly as possible. The goal is an independent communicator.",
    "- If the child gives up before completing the exchange, Caregiver B uses the minimum prompt to restart — not Caregiver A.",
    "- Vary the preferred items across trials. Consistent motivation drives persistent communication.",
    "- Ensure at least two different adults serve as Caregiver A across sessions so the child generalises to multiple partners.",
    "- The communication book should always be in the same accessible location so the child knows exactly where to retrieve their cards.",
  ].join("\n"),
  has_simplified_session: true,
  content_version: 1,
  sessions: [
    // ── Session 1 — Increasing Distance: Child Travels to the Partner ────────
    {
      session_number: 1,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Increasing Distance: Child Travels to the Partner",
        overview:
          "Build the child's understanding that communication requires moving toward a listener. The child must now stand up and walk to reach Caregiver A in order to complete the exchange — the first step in making PECS a truly functional, portable communication system.",
        materials: [
          "The same 3–5 high-preference items from PECS Phase 1 — the child must still strongly desire these items",
          "The portable PECS binder, with the target item's picture card attached to the front page with Velcro, within arm's reach of the child",
          "Distance setup: Caregiver A starts seated approximately 1 metre from the child; Caregiver B (physical prompter) remains near the child",
        ],
        steps: [
          {
            title: "Take position",
            instruction:
              "Caregiver A moves approximately 1 metre away and sits with the preferred item visible but out of the child's reach.",
          },
          {
            title: "Card retrieval",
            instruction: "Caregiver B uses minimum prompting to help the child pick up the picture card from the communication book.",
          },
          {
            title: "Travel",
            instruction:
              "Caregiver B physically prompts the child (at the lowest level needed) to walk toward Caregiver A with the card.",
          },
          {
            title: "Receive and reward",
            instruction:
              "Caregiver A holds out an open hand and waits. When the child places the card in Caregiver A's hand: immediately say '[Item]! You want [item]!' and give the item with no delay.",
          },
          {
            title: "Extend the distance",
            instruction:
              "Allow the child to enjoy the item for 20–30 seconds, then reset. Gradually increase the walking distance across trials — from 1 metre to 1.5 metres to 2 metres.",
          },
          {
            title: "Track prompting",
            instruction: "Run 8–12 trials per session. Track how much physical prompting Caregiver B needed for each trial.",
          },
        ],
        checkin: {
          ...MINUTE_PACING, // verbatim 60s interval
          question: "Did the child travel to the partner and hand over the card?", // verbatim
          options: FOUR_TIER, // P5-a
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 2 — Partner Distance: Caregiver Moves Further Away ───────────
    {
      session_number: 2,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Partner Distance: Caregiver Moves Further Away",
        overview:
          "Extend the communication distance further by having Caregiver A move to different positions in the room — including turning away briefly — so the child learns to seek out a listener who is not already watching and waiting.",
        materials: [
          "The same high-preference items — rotate across trials to sustain motivation",
          "The communication book, within the child's reach at their starting position",
          "Partner positions: Caregiver A begins at 2 metres, then moves across trials — behind the child, to the side, near a doorway — briefly turning away to simulate a naturally inattentive listener",
        ],
        steps: [
          {
            title: "Reposition each trial",
            instruction:
              "Caregiver A moves to a new position in the room (2–3 metres away) and turns slightly away, not actively attending to the child.",
          },
          {
            title: "Card retrieval",
            instruction: "Caregiver B uses minimum prompting to help the child pick up the correct picture card.",
          },
          {
            title: "Get the listener's attention",
            instruction:
              "Caregiver B prompts the child (at the lowest level needed) to walk toward Caregiver A and physically tap Caregiver A's arm or hand to get attention before handing the card.",
          },
          {
            title: "Respond to the tap",
            instruction:
              "The moment Caregiver A feels the tap: turn toward the child, receive the card, and immediately say '[Item]! You want [item]!' and give the item.",
          },
          {
            title: "Vary the position",
            instruction:
              "Reset and repeat. Vary Caregiver A's position each trial so the child learns to find a listener — not just walk to one fixed spot.",
          },
          {
            title: "Track attention-getting",
            instruction:
              "Run 8–12 trials. Track whether the child independently tapped to get the partner's attention or required prompting.",
          },
        ],
        checkin: {
          ...MINUTE_PACING, // verbatim 60s interval
          question: "Did the child seek out the partner and initiate the exchange?", // verbatim
          options: [
            { label: "Yes — found the partner and tapped on their own", response_category: "Spontaneous Exchange", credit_value: 100 },
            { label: "Yes — needed an attention prompt", response_category: "Gestural Prompt", credit_value: 50 }, // P5-a
            { label: "Yes — needed physical guidance", response_category: "Physical Prompt", credit_value: 25 },
            { label: "No — did not initiate", response_category: "No Response", credit_value: 0 },
          ],
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 3 — Persistence and Delayed Reinforcement ────────────────────
    {
      session_number: 3,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Persistence and Delayed Reinforcement",
        overview:
          "Teach the child that communication does not always produce an instant result — and that repeating the exchange attempt is the correct response to a delayed or missed reply. Delay hierarchy, in order: Level 1 — 1-second delay before accepting the card; Level 2 — 3-second delay (child must hold the card out and wait); Level 3 — 5-second delay (if the child withdraws, Caregiver B prompts persistence); Level 4 — repeated attempt (Caregiver A 'doesn't notice'; the child must approach again and re-present the card — this is the persistence target).",
        materials: ["The communication book and preferred items, as in Sessions 1–2"],
        steps: [
          {
            title: "Approach",
            instruction: "Caregiver A sits at 2–3 metres distance. The child retrieves the picture card and approaches.",
          },
          {
            title: "Hold the delay",
            instruction:
              "When the child presents the card, Caregiver A delays the response by the number of seconds at the current delay level.",
          },
          {
            title: "Reward the wait",
            instruction:
              "If the child holds out the card and waits through the delay: immediately give the item with enthusiastic praise.",
          },
          {
            title: "Prompt persistence",
            instruction:
              "If the child withdraws the card before the delay is up: Caregiver B gently prompts the child to re-extend the card and hold it out again.",
          },
          {
            title: "Level 4 — persistence",
            instruction:
              "Caregiver A pretends not to notice. Caregiver B prompts the child to tap Caregiver A's hand again to re-initiate. When Caregiver A responds, give the item with big reinforcement.",
          },
          {
            title: "Track the delay level",
            instruction: "Run 8–12 trials. Track the maximum delay level the child tolerated independently.",
          },
        ],
        checkin: {
          ...MINUTE_PACING, // verbatim 60s interval
          question: "Did the child hold out the card through the delay and complete the exchange?", // verbatim
          options: [
            { label: "Yes — held out through the delay", response_category: "Spontaneous Exchange", credit_value: 100 },
            { label: "No — withdrew before the delay ended", response_category: "Withdrew — Partial", credit_value: 50 }, // P5-a: "partial credit", tier CONFIRM
            { label: "No — did not approach", response_category: "No Response", credit_value: 0 },
          ],
        },
        simplified: SIMPLIFIED,
      },
    },
  ],
};
