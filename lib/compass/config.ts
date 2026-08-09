import { COMPASS_SCHEMA_VERSION, CURRICULUM_VERSION, type AgeBracket } from "./contract";
import type { CompassConfig } from "./types";

/**
 * Communication Compass content config — schema_version 2.1.0. This object IS
 * the compass_content payload (seeded to the DB).
 *
 * Transcribes v2.1.0's clinical tunables + the REPRESENTATIVE item bank (§3).
 * Explicitly provisional / incomplete, per the blueprint (do not tune without a
 * schema_version bump + your sign-off, §12.12):
 *   • ageWeightFactors (§5.2 / §14.7) — ship at 1.000; real values don't exist yet.
 *   • benchmark thresholds (§5.4 / §14.7) — clinical-team estimates not yet set;
 *     `benchmarkThresholdsCalibrated: false` forces the n<4 confidence path so
 *     NO child gets start_directly at launch (§5.4, §14.9). This is intended.
 *   • Item bank expands to 12–18/domain/bracket (§3); this is representative only.
 */

const FREQ5 = { Never: 0, Rarely: 1, Sometimes: 2, Often: 3, Always: 4 };
const BEHAV4 = { "Not yet": 0, Sometimes: 2, Often: 3, "Almost always": 4 };
const YESNO = { No: 0, Yes: 4 };
const INTELLIGIBILITY5 = { "Almost none": 0, Some: 1, "About half": 2, Most: 3, "Nearly all": 4 };
const CONSONANTS4 = { "Fewer than 3": 0, "A few": 2, Several: 3, "Most expected sounds": 4 };
const COMM_HIERARCHY = { "Cry/fuss only": 0, "Pull you to it": 1, "Point or gesture": 2, "Picture, sign, or device": 3, "Use words": 4 };
// §3.7 (v2 adds a 5th tier "10+ min").
const DURATION5 = { "Under 1 min": 0, "1–2 min": 1, "3–5 min": 2, "5+ min": 3, "10+ min": 4 };

const B1: AgeBracket = "3-7";
const B2: AgeBracket = "8-12";
const ALL_FACTORS = (): Record<AgeBracket, number> => ({ "3-7": 1.0, "8-12": 1.0, "10-14": 1.0 });

export const ENGAGEMENT_ITEM_ID = "LRN-ALL-ENGAGE";

export const COMPASS_CONFIG_V2: CompassConfig = {
  schemaVersion: COMPASS_SCHEMA_VERSION, // "2.1.0"
  curriculumVersion: CURRICULUM_VERSION,

  // §5.3 weights (sum = 1.00).
  domainWeights: {
    receptive_language: 0.2,
    expressive_language: 0.2,
    speech_sound: 0.1,
    social_communication: 0.2,
    functional_communication: 0.15,
    play_shared_activity: 0.1,
    learning_readiness: 0.05,
  },

  // §5.2 / §14.7 — ship at 1.000.
  ageWeightFactors: {
    receptive_language: ALL_FACTORS(),
    expressive_language: ALL_FACTORS(),
    speech_sound: ALL_FACTORS(),
    social_communication: ALL_FACTORS(),
    functional_communication: ALL_FACTORS(),
    play_shared_activity: ALL_FACTORS(),
    learning_readiness: ALL_FACTORS(),
  },

  // §5.4 — uncalibrated at launch → force n<4 path, cap confidence at 0.74.
  benchmarkThresholdsCalibrated: false,

  phaseThresholds: {
    speechSoundP3Max: 30,
    socialP1Max: 35,
    learningP2Max: 40,
    functionalP4Max: 40,
    functionalP5: [40, 55],
    functionalP6Min: 55,
    receptiveP6: [35, 55],
    expressiveP7: [35, 55],
    receptiveP8Min: 55,
    socialP8: [40, 60],
    expressiveP9Min: 55,
    socialP10Min: 60,
    expressiveP10Min: 45,
    functionalP11Min: 65,
    expressiveP11Min: 55,
    speechP12Max: 40,
    otherDomainsMinForP12: 55,
    strengthMin: 65,
    needMax: 45,
    confidenceDirectMin: 0.75,
    confidenceSupplementMin: 0.6,
    placementGapPoints: 10,
  },

  reasoning: {
    primary:
      "We're starting {child} at Phase {phase}: {phaseName}. This is because {driver} scored in the {range} range, which is the main skill this phase builds.",
    strength: "{child} is already showing strength in {strength}, which will help.",
    need: "We'll check in on {need} as they move through this phase.",
  },

  // §7 red-flag definitions by class.
  redFlagDefs: [
    // §7.1 age-invariant hard
    { code: "regression", class: "age_invariant", brackets: ["ALL"], prompt: "Have you noticed your child losing words, sounds, or skills they used to have?" },
    { code: "no_response_to_sound", class: "age_invariant", brackets: ["ALL"], prompt: "Are there times your child doesn't respond to loud sounds or to their name, even after several tries?" },
    { code: "choking_at_meals", class: "age_invariant", brackets: ["ALL"], prompt: "Any coughing, gagging, or choking during regular meals?" },
    { code: "free_text_concern", class: "age_invariant", brackets: ["ALL"], prompt: "" },
    // §7.2 developmental-history hard (asked as history; "yes" fires regardless of current age)
    { code: "no_pointing_by_18mo", class: "developmental_history", brackets: ["ALL"], prompt: "Did your child reach 18 months without pointing or using any communicative gesture?" },
    { code: "no_words_by_24mo", class: "developmental_history", brackets: ["ALL"], prompt: "Did your child reach 24 months without any words?" },
    { code: "no_babbling_by_12mo", class: "developmental_history", brackets: ["ALL"], prompt: "Did your child reach 12 months without babbling or making speech-like sounds?" },
    // §7.3 older-child hard (8-12, 10-14 only)
    { code: "voice_change_persistent", class: "older_child", brackets: ["8-12", "10-14"], prompt: "New or worsening hoarseness, breathiness, or voice loss that has lasted more than about two weeks?" },
    { code: "swallowing_change", class: "older_child", brackets: ["8-12", "10-14"], prompt: "New difficulty swallowing, or a change in what your child can eat or drink?" },
    { code: "speech_decline_6mo", class: "older_child", brackets: ["8-12", "10-14"], prompt: "A noticeable, recent decline in your child's speech clarity or language compared with six months ago?" },
    { code: "age5plus_no_communication", class: "older_child", brackets: ["8-12", "10-14"], prompt: "Is your child aged 5 or older with no reliable way to communicate (no words, signs, pictures, or device) and not currently seeing a professional about it?" },
  ],

  items: [
    // 3.1 Receptive (3-7)
    { id: "REC-B1-01", domain: "receptive_language", brackets: [B1], prompt: "If you say 'Put the ball in the box,' does your child do it without you pointing or showing them?", points: BEHAV4 },
    { id: "REC-B1-02", domain: "receptive_language", brackets: [B1], prompt: "After a short 3–4 sentence story, can your child answer one simple 'what happened' question?", points: BEHAV4 },
    // 3.2 Expressive (3-7)
    { id: "EXP-B1-01", domain: "expressive_language", brackets: [B1], prompt: "Does your child put two words together on their own, like 'more juice'?", points: BEHAV4 },
    { id: "EXP-B1-02", domain: "expressive_language", brackets: [B1], prompt: "Does your child use short sentences of 4+ words, like 'I want the red one'?", points: BEHAV4 },
    // 3.3 Speech sound (all)
    { id: "SPE-ALL-01", domain: "speech_sound", brackets: ["ALL"], prompt: "When your child talks, how much of it can YOU understand?", points: INTELLIGIBILITY5 },
    { id: "SPE-ALL-02", domain: "speech_sound", brackets: ["ALL"], prompt: "How much can an unfamiliar adult usually understand?", points: INTELLIGIBILITY5 },
    { id: "SPE-ALL-03", domain: "speech_sound", brackets: ["ALL"], prompt: "Roughly how many different consonant sounds does your child attempt in words?", points: CONSONANTS4 },
    // 3.4 Social (all)
    { id: "SOC-ALL-01", domain: "social_communication", brackets: ["ALL"], prompt: "When you call your child's name from across the room, do they look at you?", points: FREQ5 },
    { id: "SOC-ALL-02", domain: "social_communication", brackets: ["ALL"], prompt: "Does your child show/point at things to share interest — not just to request?", points: FREQ5 },
    { id: "SOC-ALL-03", domain: "social_communication", brackets: ["ALL"], prompt: "Does your child start interactions with you, not only respond when you start them?", points: FREQ5 },
    // 3.5 Functional (all)
    { id: "FUN-ALL-01", domain: "functional_communication", brackets: ["ALL"], prompt: "When your child wants something out of reach, what do they usually do?", points: COMM_HIERARCHY },
    { id: "FUN-ALL-02", domain: "functional_communication", brackets: ["ALL"], prompt: "Does your child have a reliable way to say 'yes' and 'no'?", points: YESNO },
    // 3.6 Play & shared activity (all)
    { id: "PLA-ALL-01", domain: "play_shared_activity", brackets: ["ALL"], prompt: "Does your child use toys/objects the way they're meant to be used?", points: FREQ5 },
    { id: "PLA-ALL-02", domain: "play_shared_activity", brackets: ["ALL"], prompt: "Does your child pretend, or engage in a shared activity built on another person's turn?", points: FREQ5 },
    // 3.7 Learning readiness (all) — the engagement-duration item drives start_in_simplified
    { id: ENGAGEMENT_ITEM_ID, domain: "learning_readiness", brackets: ["ALL"], prompt: "About how long can your child stay engaged in one activity with you?", points: DURATION5 },
    { id: "LRN-ALL-02", domain: "learning_readiness", brackets: ["ALL"], prompt: "When you demonstrate an action and ask your child to copy it, do they attempt it?", points: FREQ5 },
    // 3.8 Oral-motor (flags/Phase-3 routing only; zero weight)
    { id: "ORM-ALL-01", domain: "oral_motor", brackets: ["ALL"], prompt: "Do you notice frequent drooling beyond what's expected for your child's age?", points: { No: 0, Yes: 1 } },
    { id: "ORM-ALL-02", domain: "oral_motor", brackets: ["ALL"], prompt: "Does your child have noticeable difficulty chewing age-appropriate foods?", points: { No: 0, Yes: 1 } },
  ],

  // §3.9 benchmark checklist — predicted_domain + PROVISIONAL threshold (§5.4).
  benchmarkItems: [
    { id: "BM-B1-01", brackets: [B1], prompt: "Combines two words", predictedDomain: "expressive_language", threshold: 50 },
    { id: "BM-B1-02", brackets: [B1], prompt: "Points to request", predictedDomain: "functional_communication", threshold: 40 },
    { id: "BM-B1-03", brackets: [B1], prompt: "Follows a simple instruction", predictedDomain: "receptive_language", threshold: 45 },
    { id: "BM-B1-04", brackets: [B1], prompt: "Plays near other children", predictedDomain: "play_shared_activity", threshold: 45 },
    { id: "BM-B1-05", brackets: [B1], prompt: "Makes a want known without crying", predictedDomain: "functional_communication", threshold: 50 },
    { id: "BM-B2-01", brackets: [B2], prompt: "Can tell a familiar adult what happened at school today", predictedDomain: "expressive_language", threshold: 55 },
    { id: "BM-B2-02", brackets: [B2], prompt: "Asks for help from an adult who isn't a parent", predictedDomain: "functional_communication", threshold: 55 },
  ],

  engagementDurationItemId: ENGAGEMENT_ITEM_ID,
  engagementSimplifiedValues: ["Under 1 min", "1–2 min"],
};
