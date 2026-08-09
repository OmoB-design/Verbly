import type { ScriptVariant } from "@/lib/engine/session-script";
import type { PhaseSeed } from "./types";

/**
 * PHASE 10 — TURN-TAKING AND SOCIAL INTERACTION GAMES
 * Transcribed from therapy_Exercises_12_phases_with_Simplified_Sections_2.docx.
 * CLINICAL CONTENT — verbatim where the source gives wording; derived text is
 * marked "derived (F2)".
 *
 * EXCEPTION SCALE (Appendix §2c — behavioural compliance):
 *   100 Independent Turn-Taking
 *    75 Prompted Wait
 *     0 Turn Theft            } both zero the score but are logged as separate
 *     0 Session Abandonment   } response categories (diagnostic distinction)
 *
 * ── FLAGS FOR OWNER ─────────────────────────────────────────────────────────
 * P10-a Check-ins are turn-based in the source ("RL asks every 2 turns" /
 *       "every 3 turns") with a 10–15 turn target. Modeled as 8 check-ins @
 *       75s; the "Check in now" button covers per-turn pacing. Derived.
 * P10-b Session 3 is "Ages 3–7" and "Ages 8–14" — the latter spans two
 *       brackets, so it is seeded for both 8-12 and 10-14 (same script).
 * P10-c Turn counters / piece-placement trackers ("caregiver taps after each
 *       turn") are unbuilt runtime features; the turn targets live in steps.
 * ────────────────────────────────────────────────────────────────────────────
 */

const TURN_PACING = { interval_seconds: 75, count: 8 }; // derived (P10-a)

// Appendix §2c scale — two distinct zero categories preserved.
const TURN_OPTIONS = [
  { label: "Waited and took their turn on their own", response_category: "Independent Turn-Taking", credit_value: 100 },
  { label: "Needed a cue or reminder to wait", response_category: "Prompted Wait", credit_value: 75 },
  { label: "Took extra turns without yielding", response_category: "Turn Theft", credit_value: 0 },
  { label: "Left the activity entirely", response_category: "Session Abandonment", credit_value: 0 },
];

// Simplified Session — Two-Turn Micro Rounds (shared, F7).
const SIMPLIFIED: ScriptVariant = {
  title: "Two-Turn Micro Rounds",
  overview:
    "Shrinks each round to just two turns — one caregiver turn, one child turn — using a highly preferred toy and a waiting object the child holds during the caregiver's turn.",
  materials: [
    "The single most highly motivating toy available — the shorter wait must still feel worth it",
    "A small waiting object (a soft fidget toy or squeeze ball) for the child to hold during the caregiver's turn",
    "The visual turn card ('MY TURN' / 'YOUR TURN')",
  ],
  steps: [
    { title: "Choose the best toy", instruction: "Choose the single most highly motivating toy available." },
    {
      title: "Waiting object",
      instruction: "Give the child a small waiting object (a soft fidget toy or squeeze ball) to hold during the caregiver's turn.",
    },
    {
      title: "Quick turns",
      instruction:
        "Show the turn card ('MY TURN'), take one quick turn (a few seconds only), then flip to 'YOUR TURN' immediately.",
    },
    {
      title: "Celebrate and reset",
      instruction: "Celebrate the child's turn the moment it happens, then reset for another two-turn round right away.",
    },
    {
      title: "Many short rounds",
      instruction: "Run 8–10 short two-turn rounds rather than one longer back-and-forth sequence.",
    },
    {
      title: "Extend slowly",
      instruction: "Gradually extend to three-turn rounds only once two-turn rounds are consistently successful without prompting.",
    },
  ],
  checkin: {
    interval_seconds: 60,
    count: 10, // derived: 8–10 rounds
    question: "Did the child wait through your turn and take their own?", // verbatim intent
    options: [
      { label: "Yes", response_category: "Completed Round", credit_value: 100 },
      { label: "No", response_category: "Round Not Completed", credit_value: 0 },
    ],
  },
};

// Session 3 (8–14) — shared script for both older brackets (P10-b).
const OLDER_SESSION_3: ScriptVariant & { simplified: ScriptVariant } = {
  title: "Interest-Based Games and Digital Turn-Taking",
  overview:
    "Extend turn-taking into age-appropriate social games — increasing the complexity and duration of the back-and-forth exchange and, where appropriate, introducing a third player for small-group turn-taking.",
  materials: [
    "Card games matched to interest: Uno, Top Trumps with favourite characters, quiz cards about preferred topics (sport, gaming, animals) — one action per turn",
    "Collaborative digital games: Minecraft co-op mode, turn-based strategy games, or any game with a built-in turn structure",
    "For conversation turn-taking: a physical object (talking stick, favourite toy) to mark who is speaking",
  ],
  steps: [
    {
      title: "Natural turn language",
      instruction:
        "Introduce 'your turn' / 'my turn' language naturally within the game context — not as a therapy prompt but as normal game vocabulary.",
    },
    {
      title: "Third player",
      instruction:
        "Introduce a third player (sibling or another adult) for group turn-taking once two-person turns are stable across the session.",
    },
    {
      title: "Digital games use their own turns",
      instruction:
        "For digital games: use the game's own turn structure rather than the external turn card — the goal at this age is internalised turn-taking without visual supports.",
    },
    {
      title: "Fade the card",
      instruction:
        "Fade the visual turn card across the session for older children — move from card → verbal only → natural game turn → independent awareness.",
    },
    {
      title: "Conversation practice",
      instruction:
        "Real conversation turn-taking: topic-based Q&A — one person asks a question, the other answers, then swaps. Use the talking object to mark who is speaking.",
    },
  ],
  checkin: {
    ...TURN_PACING, // derived (P10-a)
    question: "Did the child wait for their turn?", // derived (F2)
    options: TURN_OPTIONS,
  },
  simplified: SIMPLIFIED,
};

export const PHASE_10: PhaseSeed = {
  phase_number: 10,
  name: "Turn-Taking and Social Interaction Games", // §13.2 canonical
  clinical_goal:
    "Turn-taking is the fundamental rhythm of all human communication. This phase teaches the child the structure and reward of social reciprocity through play-based, high-motivation activities, using preferred games and objects to make waiting feel worthwhile rather than aversive.",
  phase_guidance: [
    "**Progress Indicators — What the Caregiver Should Look For**",
    "- Child waits for their turn without leaving the activity, grabbing the toy, or becoming dysregulated.",
    "- Child signals when it is the other person's turn — gives an object, points, says or signs 'your turn', or gestures.",
    "- Child sustains a back-and-forth interaction for at least 5 consecutive turns without prompting.",
    "- Child begins to anticipate their turn — shows excitement or readiness just before it is their turn.",
    "- Child generalises turn-taking to a second person or a small group of 3.",
    "",
    "**Important Therapy Tips**",
    "- The visual turn card is non-negotiable in Sessions 1 and 2. It makes the abstract concept of 'waiting' visible and predictable.",
    "- Keep the game short and the activity highly preferred. A bored or under-motivated child does not practise waiting — they leave.",
    "- Celebrate both turns equally and with equal energy — the caregiver's AND the child's.",
    "- Never turn turn-taking into a power struggle. If the child refuses to yield, end the game calmly without comment and try again later with a different activity.",
    "- Fade the turn card gradually across sessions — card → verbal cue → natural awareness.",
  ].join("\n"),
  has_simplified_session: true,
  content_version: 1,
  sessions: [
    // ── Session 1 — Preferred Object Game ────────────────────────────────────
    {
      session_number: 1,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Introducing Turn-Taking with a Preferred Object Game",
        overview:
          "Introduce the concept of structured turn-taking using a simple, high-motivation object-based game, with a visual turn card making the abstract concept of 'waiting' concrete and predictable.",
        materials: [
          "A visual turn card: a card with a picture of a hand or arrow, labelled 'MY TURN' on one side and 'YOUR TURN' on the other — flip it visibly and slowly at each turn change",
          "A simple, highly motivating object-based game: rolling a ball back and forth, taking turns pressing a button on a light-up toy, taking turns blowing bubbles, or a cause-and-effect toy",
          "A clearly defined play space so it is visually obvious whose side the object is on",
          "For children who struggle to wait: a 'waiting object' — a small fidget toy to hold during the partner's turn",
        ],
        steps: [
          {
            title: "My turn",
            instruction:
              "Sit facing the child. Place the turn card showing 'MY TURN' toward the caregiver. Say 'My turn!' clearly.",
          },
          {
            title: "Your turn",
            instruction:
              "Take a turn (e.g., roll the ball to the child), then flip the card to 'YOUR TURN', say 'Your turn!' clearly, and wait.",
          },
          {
            title: "Hold the waiting space",
            instruction:
              "Wait up to 10 seconds for the child to take their turn. Do not rush or prompt immediately — hold the waiting space.",
          },
          {
            title: "Celebrate",
            instruction:
              "When the child takes their turn: celebrate — 'Great turn! My turn now!' — flip the card back and take another turn. Keep the energy high throughout.",
          },
          {
            title: "Minimum prompt",
            instruction:
              "If the child does not take their turn within 10 seconds: use a minimum physical prompt (e.g., gently tap the ball toward the child's hands) to complete the turn, then celebrate immediately.",
          },
          {
            title: "Block turn theft calmly",
            instruction:
              "If the child takes multiple turns without yielding: calmly block the action with a flat hand, flip the card to 'MY TURN', take the toy briefly and complete the caregiver's turn, then return it.",
          },
          {
            title: "Target",
            instruction:
              "10 complete back-and-forth turns per session (5 for each person). Increase to 15 turns as the child's turn-waiting improves.", // P10-c
          },
        ],
        checkin: {
          ...TURN_PACING, // derived (P10-a)
          question: "Did the child wait for their turn without prompting?", // verbatim
          options: TURN_OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 2 — Shared Construction Play ─────────────────────────────────
    {
      session_number: 2,
      age_bracket: null,
      script: {
        script_version: 1,
        title: "Turn-Taking in Shared Construction Play",
        overview:
          "Extend turn-taking into a shared construction activity where both partners contribute to building something together — requiring more sustained waiting, greater investment in the shared outcome, and the beginning of collaborative goal-directed play.",
        materials: [
          "Construction materials: Lego bricks, stacking cups, magnetic tiles, or interlocking puzzle pieces — one piece per person per turn",
          "A shared goal previewed before starting: a tower, a house, a train track, a bridge",
          "The visual turn card from Session 1 — flip it visibly at every turn change",
          "Piece control: keep all remaining pieces beside the caregiver, distributing one per turn",
        ],
        steps: [
          {
            title: "Show the shared goal",
            instruction: "Show the child the construction goal together: 'We're building a tall tower — let's do it together!'",
          },
          {
            title: "First piece",
            instruction:
              "Place the first piece, say 'My turn!', flip the turn card to 'YOUR TURN', and hand the child one piece: 'Your turn!'",
          },
          {
            title: "Alternate",
            instruction:
              "Child places their piece. Respond with shared excitement: 'Look at our tower! My turn!' and flip the card back. Continue alternating, one piece per turn.",
          },
          {
            title: "Handle grabbing calmly",
            instruction:
              "If the child grabs multiple pieces: calmly retrieve the extras, show the turn card ('My turn!'), place one more piece, then hand the child a single piece for their turn.",
          },
          {
            title: "Celebrate the shared win",
            instruction:
              "When the structure is finished together: celebrate the shared achievement with maximum enthusiasm — 'WE built it! TOGETHER! Look what WE made!' This shared success feeling is the social reward that motivates future turn-taking.",
          },
        ],
        checkin: {
          ...TURN_PACING, // derived (P10-a)
          question: "Is the child waiting for their turn without grabbing pieces?", // verbatim
          options: TURN_OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },

    // ── Session 3 — Age-Adapted Social Interaction Games ─────────────────────
    // Ages 3–7
    {
      session_number: 3,
      age_bracket: "3-7",
      script: {
        script_version: 1,
        title: "Simple Rule-Based Games",
        overview:
          "Extend turn-taking into age-appropriate social games — increasing the complexity and duration of the back-and-forth exchange and introducing a third player for small-group turn-taking.",
        materials: [
          "Simple board games: Snakes and Ladders, Lotto/Bingo, simple Matching or Memory card games — one action per turn (roll the dice, flip a card, place a token)",
          "Balloon keep-up: take turns tapping the balloon to keep it in the air — each tap is one turn",
          "Musical instruments: take turns playing one beat each on a drum or xylophone — use the turn card between each hit",
          "The visual turn card",
        ],
        steps: [
          {
            title: "Card at every change",
            instruction:
              "Use the turn card consistently throughout. Show the card at every turn change — 'MY TURN' then 'YOUR TURN'.",
          },
          {
            title: "Keep it short",
            instruction: "Keep the game short: 5–8 minutes maximum. End before the child becomes dysregulated.",
          },
          {
            title: "Celebrate every turn",
            instruction:
              "Celebrate every turn — the child's AND the caregiver's — making the entire game feel fun and shared throughout.",
          },
          {
            title: "Three-way turns",
            instruction:
              "For the final 2 minutes: introduce a third player (sibling or another adult) and practise three-way turn-taking with the same activity. Point clearly to each player when it is their turn.",
          },
        ],
        checkin: {
          ...TURN_PACING, // derived (P10-a)
          question: "Did the child wait for their turn?", // derived (F2)
          options: TURN_OPTIONS,
        },
        simplified: SIMPLIFIED,
      },
    },
    // Ages 8–14 → both older brackets (P10-b)
    { session_number: 3, age_bracket: "8-12", script: { script_version: 1, ...OLDER_SESSION_3 } },
    { session_number: 3, age_bracket: "10-14", script: { script_version: 1, ...OLDER_SESSION_3 } },
  ],
};
