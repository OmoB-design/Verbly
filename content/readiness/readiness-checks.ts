/**
 * Readiness Checks — versioned clinical content, schema 1.0.0.
 *
 * APPROVED by the owner (clinical authority) 2026-08-09 with edits E1–E3 —
 * see READINESS_CHECKS_v1.md in this directory for the reviewable document,
 * per-item provenance, and the four confirmed review flags. Every item is
 * DERIVED (from §6.1 prerequisite drivers + curriculum entry skills), none
 * verbatim. Do not edit wording here without a new schema_version and owner
 * sign-off — this is clinical content, not application logic.
 *
 * Governing rulings (owner, 2026-08-09):
 *  - Caregiver-report yes/no; ~90-second pre-session gate. YES = ready.
 *  - Pass = ≥4 of 5 YES. A lone NO on the HARD item → flag ("keep an eye on
 *    [X] during the first few sessions"), never blocks.
 *  - ≤3 YES → phase unchanged; first session serves the Simplified variant.
 *  - One-shot: runs once before the first session of the placed phase.
 */

export const READINESS_SCHEMA_VERSION = "1.0.0";
export const READINESS_PASS_YES_MIN = 4;

export interface ReadinessItem {
  id: string; // "R<phase>.<n>"
  prompt: string;
  hard: boolean;
}

export interface PhaseReadinessCheck {
  phase_number: number;
  /** [X] substituted into "Keep an eye on [X] during the first few sessions." */
  flag_phrase: string;
  items: ReadinessItem[]; // exactly 5, exactly one hard
}

export interface ReadinessContent {
  schemaVersion: string;
  passYesMin: number;
  phases: PhaseReadinessCheck[];
}

export const READINESS_CONTENT_V1: ReadinessContent = {
  schemaVersion: READINESS_SCHEMA_VERSION,
  passYesMin: READINESS_PASS_YES_MIN,
  phases: [
    {
      phase_number: 1,
      flag_phrase: "tolerating you joining their play",
      items: [
        { id: "R1.1", prompt: "Can your child be in the same room with you, close enough to play, for a few minutes at a time?", hard: false },
        { id: "R1.2", prompt: "Does your child usually react in some way when you sit down next to them or join what they're doing — a look, a pause, even moving away?", hard: false },
        { id: "R1.3", prompt: "Does your child have a toy, object, or activity they enjoy and come back to?", hard: false },
        { id: "R1.4", prompt: "Can you gently join your child's play for a moment without them becoming too upset to continue?", hard: true },
        { id: "R1.5", prompt: "Does your child usually stay with an activity they like for at least a minute or two?", hard: false },
      ],
    },
    {
      phase_number: 2,
      flag_phrase: "watching what you do",
      items: [
        { id: "R2.1", prompt: "Does your child usually look at you — your face or your hands — when you're doing something interesting?", hard: true },
        { id: "R2.2", prompt: "Does your child usually respond in some way when you call their name — looking, pausing, turning?", hard: false },
        { id: "R2.3", prompt: "Can your child stay near you for short bursts of a shared activity — a song, a simple game?", hard: false },
        { id: "R2.4", prompt: "Does your child ever copy anything you do, even loosely — clapping, waving, banging a toy?", hard: false },
        { id: "R2.5", prompt: "Does your child enjoy at least one back-and-forth game with you — peek-a-boo, tickles, chase?", hard: false },
      ],
    },
    {
      phase_number: 3,
      flag_phrase: "watching your mouth and face",
      items: [
        { id: "R3.1", prompt: "Will your child usually watch you make faces or mouth movements when you invite them to?", hard: true },
        { id: "R3.2", prompt: "Can your child copy at least some big body movements when you show them — clapping, arms up?", hard: false },
        { id: "R3.3", prompt: "Will your child usually tolerate playful activities near their face — bubbles, straws, blowing games — without much distress?", hard: false },
        { id: "R3.4", prompt: "Is your child usually comfortable eating and drinking — without frequent coughing, gagging, or choking?", hard: false }, // E3
        { id: "R3.5", prompt: "Does your child make sounds in play on their own — babbling, humming, raspberries?", hard: false },
      ],
    },
    {
      phase_number: 4,
      flag_phrase: "strong favourites to work with",
      items: [
        { id: "R4.1", prompt: "Does your child have three to five favourite things — foods, toys, activities — they clearly want when they see them?", hard: true },
        { id: "R4.2", prompt: "When your child wants something they can see, do they usually do something about it — reach, pull you, fuss, move toward it?", hard: false },
        { id: "R4.3", prompt: "Will your child usually accept a moment of gentle hand-over-hand help without becoming very upset?", hard: false },
        { id: "R4.4", prompt: "Does your child usually let go of an object when you gently hold your hand out for it?", hard: false }, // E1
        { id: "R4.5", prompt: "Can your child pick up a flat card-sized object with their hand?", hard: false },
      ],
    },
    {
      phase_number: 5,
      flag_phrase: "the basic picture exchange",
      items: [
        { id: "R5.1", prompt: "Does your child sometimes hand a picture card to an adult to get something they want — even if not every time?", hard: true },
        { id: "R5.2", prompt: "Does your child move around your home on their own to get to things they want?", hard: false },
        { id: "R5.3", prompt: "Can your child wait a few seconds for something they want without giving up right away?", hard: false },
        { id: "R5.4", prompt: "Does your child recognise picture cards they've used before — looking at or reaching for them?", hard: false },
        { id: "R5.5", prompt: "Will your child usually go to another person when they need something?", hard: false },
      ],
    },
    {
      phase_number: 6,
      flag_phrase: "reliable picture exchange, including coming to you",
      items: [
        { id: "R6.1", prompt: "Does your child usually hand over a picture card to ask for things, even when you're a few steps away or busy?", hard: true },
        { id: "R6.2", prompt: "Does your child usually look at a picture before picking it up, rather than grabbing any card?", hard: false },
        { id: "R6.3", prompt: "When you offer two real objects, does your child reach for the one they actually want?", hard: false },
        { id: "R6.4", prompt: "Does your child usually notice when they get the \"wrong\" thing — reacting when handed something they didn't want?", hard: false },
        { id: "R6.5", prompt: "Will your child usually look at a small set of pictures (two or three) when you show them?", hard: false },
      ],
    },
    {
      phase_number: 7,
      flag_phrase: "choosing the right picture from several",
      items: [
        { id: "R7.1", prompt: "When several picture cards are out, does your child usually pick the specific card for what they want — not just any card?", hard: true },
        { id: "R7.2", prompt: "Does your child use picture exchange (or words/signs) to ask for things during ordinary moments of the day — not only in practice?", hard: false },
        { id: "R7.3", prompt: "Can your child do little two-step hand tasks — pick up one thing, then another, and put them where they go?", hard: false },
        { id: "R7.4", prompt: "Does your child use single words, word attempts, signs, or pictures for at least a handful of different things?", hard: false },
        { id: "R7.5", prompt: "Will your child usually stay with a tabletop activity with you for a few minutes?", hard: false },
      ],
    },
    {
      phase_number: 8,
      flag_phrase: "using the 'I want…' sentence",
      items: [
        { id: "R8.1", prompt: "Does your child usually put together their \"I want + [item]\" sentence — with the strip, words, or signs — to ask for things?", hard: true },
        { id: "R8.2", prompt: "Does your child usually respond when you speak directly to them — turning, looking, pausing?", hard: false },
        { id: "R8.3", prompt: "Does your child usually understand simple everyday questions or instructions — \"where's your cup?\", \"come here\"?", hard: false },
        { id: "R8.4", prompt: "Can your child shift attention away from what they're doing when you get their attention first?", hard: false },
        { id: "R8.5", prompt: "Is your child usually okay with you starting an interaction — joining in or answering, rather than only leading?", hard: false },
      ],
    },
    {
      phase_number: 9,
      flag_phrase: "asking without being prompted",
      items: [
        { id: "R9.1", prompt: "Does your child usually ask for things on their own — without needing \"what do you want?\" first?", hard: true },
        { id: "R9.2", prompt: "Does your child reliably answer \"What do you want?\" with words, signs, or their pictures?", hard: false },
        { id: "R9.3", prompt: "Does your child sometimes show you things just to share — holding something up, pointing at a dog, bringing you a toy?", hard: false },
        { id: "R9.4", prompt: "Does your child know the names — spoken word or picture — of a good handful of everyday things?", hard: false },
        { id: "R9.5", prompt: "Does your child usually notice new or surprising things around them — turning toward them, reacting?", hard: false },
      ],
    },
    {
      phase_number: 10,
      flag_phrase: "waiting for a turn",
      items: [
        { id: "R10.1", prompt: "Can your child wait briefly — a few seconds up to half a minute — for something they want, with your support?", hard: true },
        { id: "R10.2", prompt: "Does your child usually join back-and-forth exchanges with you — rolling a ball back, trading objects, copying games?", hard: false },
        { id: "R10.3", prompt: "Does your child usually communicate wants and comments with words, signs, or pictures through the day?", hard: false },
        { id: "R10.4", prompt: "Will your child usually stay in a game or activity you lead for several minutes?", hard: false },
        { id: "R10.5", prompt: "Is your child usually okay when another child or adult joins an activity?", hard: false },
      ],
    },
    {
      phase_number: 11,
      flag_phrase: "communicating within daily routines",
      items: [
        { id: "R11.1", prompt: "Does your child usually use their communication — words, signs, or pictures — to ask for what they need in at least one daily routine (meals, bath, bedtime)?", hard: true },
        { id: "R11.2", prompt: "Does your child communicate with more than one person — not only you?", hard: false },
        { id: "R11.3", prompt: "Does your child usually manage the basic steps of familiar routines with your help — coming to the table, getting into the bath?", hard: false },
        { id: "R11.4", prompt: "Does your child usually make a choice when offered two options?", hard: false },
        { id: "R11.5", prompt: "Can your child usually handle small changes to a routine without a major upset?", hard: false },
      ],
    },
    {
      phase_number: 12,
      flag_phrase: "communicating without relying on speech",
      items: [
        { id: "R12.1", prompt: "Setting speech aside, does your child usually make themselves understood — with signs, pictures, or gestures?", hard: true }, // E2
        { id: "R12.2", prompt: "Does your child make some sounds on purpose — babble, hums, sound effects in play?", hard: false }, // E2
        { id: "R12.3", prompt: "Does your child usually copy actions or gestures you show them?", hard: false },
        { id: "R12.4", prompt: "Will your child usually join in sound-play with you — silly noises, animal sounds, singing — without distress?", hard: false },
        { id: "R12.5", prompt: "Does your child usually watch your mouth or face when you make interesting sounds?", hard: false },
      ],
    },
  ],
};
