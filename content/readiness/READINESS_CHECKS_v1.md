# Readiness Checks — v1.0.0 (APPROVED)

**Status: APPROVED by the owner (clinical authority) 2026-08-09, with three edits applied
and all four review flags confirmed. Seeded as `readiness_content` schema_version 1.**

Drafted 2026-08-09 per owner decisions 1–5 (below). Every item is **derived** — authored by
the assistant from each phase's §6.1 prerequisite driver / entry condition
(caregiver-onboarding-assessment-blueprint-v2_1.md) and the transcribed curriculum's phase
entry skills — none is transcribed verbatim from a source document. Reviewed and approved
by the owner as clinical authority (same process as curriculum flag F2).

**Approval edits (owner, 2026-08-09):**
- **E1 — item 4.4 replaced.** Second-adult availability is already captured at onboarding
  (`second_adult_available`); asking again was redundant. Replaced with an object-release
  item testing the release component of the PECS exchange.
- **E2 — Phase 12 HARD moved 12.2 → 12.1.** 12.1 (understood without speech) tests the
  defining Phase 12 profile — speech as the isolated gap. 12.2 (makes sounds on purpose)
  is what the phase teaches, not what it requires.
- **E3 — item 3.4 tightened.** Red-flag behaviours (coughing, gagging, choking) made
  explicit so "comfortable" isn't read as a mood question.

**Flag confirmations:** R-F1 confirmed (P1 check softens entry, never redirects);
R-F2 keep the safety duplication (belt-and-braces); R-F3 correct as designed;
R-F4 translations faithful.

Any future edit to this content is a clinical change: new `schema_version`, owner sign-off.

---

## Governing rulings (owner, 2026-08-09)

1. **Items drafted, owner-reviewed.** All 60 derived from §6.1 prerequisite domains + entry
   conditions; provenance marked; owner approves before seeding.
2. **Caregiver-report yes/no.** A ~90-second pre-session gate, not an observed mini-task.
   "Does your child usually…" format, consistent with the Compass.
3. **Pass rule: 4 of 5.** A lone failed item that is the phase's **hard prerequisite** is
   flagged in the result — *"keep an eye on [X] during the first few sessions"* — but never
   blocks.
4. **Fail path (≤3 yes): phase unchanged; sessions start in the Simplified variant.** No
   demotion, no re-assessment. The advance/repeat/simplify loop owns everything from there.
5. **One-shot.** Runs once, before the first session of the placed phase. Not repeatable.
   The session engine owns progression afterwards.

## Mechanics that follow (for review alongside the items)

- Every item is phrased so **YES = readiness-supporting**. Scoring is a plain count of YES.
- **≥ 4 YES → proceed** to the phase's standard first session.
  - If the single NO is the **[HARD]** item → attach the flag: *"Keep an eye on [X] during
    the first few sessions."* ([X] per phase, listed below.)
- **≤ 3 YES → proceed at the same phase, first sessions served as the Simplified variant**
  (exactly the mechanism live today; the readiness check becomes its trigger instead of
  `readiness_module_first` alone).
- Result stored against the assessment with the readiness content version, per the
  content-governance rule (immutable once recorded).
- Wording conventions: plain language, no clinical jargon; **modality-neutral** — "words,
  signs, or pictures" all count as communication; "usually" = more often than not; every
  behaviour asked about is observable at home by a non-professional.

---

## Phase 1 — Joint Attention Activities

Route (§6.1): social_communication < 35. **Floor phase** — see flag R-F1: there is no lower
phase, so these items are minimal engagement-tolerance items, not skill gates.

| # | Item (yes/no) | Provenance (all derived) | Hard |
|---|---|---|---|
| 1.1 | Can your child be in the same room with you, close enough to play, for a few minutes at a time? | P1 session format (shared-space play) | |
| 1.2 | Does your child usually react in some way when you sit down next to them or join what they're doing — a look, a pause, even moving away? | §6.1 driver: social_communication (partner awareness) | |
| 1.3 | Does your child have a toy, object, or activity they enjoy and come back to? | P1 materials (motivating toy anchors joint attention) | |
| 1.4 | Can you gently join your child's play for a moment without them becoming too upset to continue? | P1 entry skill: tolerating a partner in play | **HARD** |
| 1.5 | Does your child usually stay with an activity they like for at least a minute or two? | §3.7 engagement-duration family | |

**[X] for 1.4:** "tolerating you joining their play"

## Phase 2 — Imitation Training

Route (§6.1): learning_readiness < 40 OR imitation items low, with social_communication ≥ 35.

| # | Item (yes/no) | Provenance (all derived) | Hard |
|---|---|---|---|
| 2.1 | Does your child usually look at you — your face or your hands — when you're doing something interesting? | P2 entry skill: attending to a model (watching precedes copying) | **HARD** |
| 2.2 | Does your child usually respond in some way when you call their name — looking, pausing, turning? | §6.1 gate: social_communication ≥ 35 (§3.4 name-response family) | |
| 2.3 | Can your child stay near you for short bursts of a shared activity — a song, a simple game? | §3.7 engagement family | |
| 2.4 | Does your child ever copy anything you do, even loosely — clapping, waving, banging a toy? | §6.1 driver: imitation items (emerging copying is supportive, not required — the phase teaches it) | |
| 2.5 | Does your child enjoy at least one back-and-forth game with you — peek-a-boo, tickles, chase? | P1 exit skill (social reciprocity foundation) | |

**[X] for 2.1:** "watching what you do"

## Phase 3 — Oral Motor Exercises

Route (§6.1): oral-motor flags present AND speech_sound < 30. See flag R-F2 (two entry
populations).

| # | Item (yes/no) | Provenance (all derived) | Hard |
|---|---|---|---|
| 3.1 | Will your child usually watch you make faces or mouth movements when you invite them to? | P3 method: exercises are modelled face-to-face | **HARD** |
| 3.2 | Can your child copy at least some big body movements when you show them — clapping, arms up? | §6.1 sequencing: imitation precedes oral-motor work (P2 exit) | |
| 3.3 | Will your child usually tolerate playful activities near their face — bubbles, straws, blowing games — without much distress? | P3 materials/activities | |
| 3.4 | Is your child usually comfortable eating and drinking — without frequent coughing, gagging, or choking? | §3.8 / §7.1: choking is a red-flag needing professional input before mouth-work (wording per owner edit E3) | |
| 3.5 | Does your child make sounds in play on their own — babbling, humming, raspberries? | §6.1 driver: speech_sound (sound-play foundation) | |

**[X] for 3.1:** "watching your mouth and face"

## Phase 4 — PECS Phase 1: How to Communicate

Route (§6.1): functional_communication < 40, with basic imitation present.

| # | Item (yes/no) | Provenance (all derived) | Hard |
|---|---|---|---|
| 4.1 | Does your child have three to five favourite things — foods, toys, activities — they clearly want when they see them? | P4 protocol: preferred items are the engine of the exchange | **HARD** |
| 4.2 | When your child wants something they can see, do they usually do something about it — reach, pull you, fuss, move toward it? | §6.1 driver: functional_communication (§3.5 hierarchy family) | |
| 4.3 | Will your child usually accept a moment of gentle hand-over-hand help without becoming very upset? | P4 protocol: physical prompter guides the exchange | |
| 4.4 | Does your child usually let go of an object when you gently hold your hand out for it? | P4 protocol: the release component of the exchange (owner edit E1 — replaced redundant second-adult item; that fact is captured at onboarding) | |
| 4.5 | Can your child pick up a flat card-sized object with their hand? | P4 motor prerequisite of the exchange | |

**[X] for 4.1:** "strong favourites to work with"

## Phase 5 — PECS Phase 2: Distance and Persistence

Route (§6.1): functional_communication 40–55, "exchange skill present but inconsistent."
See flag R-F3 (mid-chain placement).

| # | Item (yes/no) | Provenance (all derived) | Hard |
|---|---|---|---|
| 5.1 | Does your child sometimes hand a picture card to an adult to get something they want — even if not every time? | §6.1 entry condition, near-verbatim ("exchange present but inconsistent") | **HARD** |
| 5.2 | Does your child move around your home on their own to get to things they want? | P5 goal: travelling to the partner/book requires independent movement | |
| 5.3 | Can your child wait a few seconds for something they want without giving up right away? | P5 goal (persistence) — brief tolerance is supportive, the phase builds the rest | |
| 5.4 | Does your child recognise picture cards they've used before — looking at or reaching for them? | P5 communication-book consolidation | |
| 5.5 | Will your child usually go to another person when they need something? | §3.5 approach behaviour (functional driver) | |

**[X] for 5.1:** "the basic picture exchange"

## Phase 6 — PECS Phase 3: Picture Discrimination

Route (§6.1): functional_communication ≥ 55, receptive_language 35–55.

| # | Item (yes/no) | Provenance (all derived) | Hard |
|---|---|---|---|
| 6.1 | Does your child usually hand over a picture card to ask for things, even when you're a few steps away or busy? | P5 exit skill: reliable exchange incl. travel | **HARD** |
| 6.2 | Does your child usually look at a picture before picking it up, rather than grabbing any card? | P6 method: attending to the stimulus precedes discriminating it | |
| 6.3 | When you offer two real objects, does your child reach for the one they actually want? | §6.1 driver: receptive_language (object discrimination precursor) | |
| 6.4 | Does your child usually notice when they get the "wrong" thing — reacting when handed something they didn't want? | P6 error-correction procedure leans on error awareness | |
| 6.5 | Will your child usually look at a small set of pictures (two or three) when you show them? | P6 array format | |

**[X] for 6.1:** "reliable picture exchange, including coming to you"

## Phase 7 — PECS Phase 4: Sentence Structure

Route (§6.1): expressive_language 35–55, single words present.

| # | Item (yes/no) | Provenance (all derived) | Hard |
|---|---|---|---|
| 7.1 | When several picture cards are out, does your child usually pick the specific card for what they want — not just any card? | P6 exit skill: discrimination is what strip-building assumes | **HARD** |
| 7.2 | Does your child use picture exchange (or words/signs) to ask for things during ordinary moments of the day — not only in practice? | §6.1 driver: expressive_language in daily use | |
| 7.3 | Can your child do little two-step hand tasks — pick up one thing, then another, and put them where they go? | P7 motor sequencing: "I want" card + item card onto the strip | |
| 7.4 | Does your child use single words, word attempts, signs, or pictures for at least a handful of different things? | §6.1 entry condition ("single words present"), modality-neutral | |
| 7.5 | Will your child usually stay with a tabletop activity with you for a few minutes? | §3.7 engagement family (strip teaching is tabletop) | |

**[X] for 7.1:** "choosing the right picture from several"

## Phase 8 — PECS Phase 5: Responsive Requesting

Route (§6.1): receptive_language ≥ 55, social_communication 40–60.

| # | Item (yes/no) | Provenance (all derived) | Hard |
|---|---|---|---|
| 8.1 | Does your child usually put together their "I want + [item]" sentence — with the strip, words, or signs — to ask for things? | P7 exit skill | **HARD** |
| 8.2 | Does your child usually respond when you speak directly to them — turning, looking, pausing? | §6.1 drivers: receptive + social (responding to speech) | |
| 8.3 | Does your child usually understand simple everyday questions or instructions — "where's your cup?", "come here"? | §6.1 gate: receptive_language ≥ 55 (§3.1 family) | |
| 8.4 | Can your child shift attention away from what they're doing when you get their attention first? | P8 method: responding mid-activity to "What do you want?" | |
| 8.5 | Is your child usually okay with you starting an interaction — joining in or answering, rather than only leading? | §6.1 gate: social_communication 40–60 | |

**[X] for 8.1:** "using the 'I want…' sentence"

## Phase 9 — PECS Phase 6: Commenting

Route (§6.1): expressive_language ≥ 55, spontaneous requesting present.

| # | Item (yes/no) | Provenance (all derived) | Hard |
|---|---|---|---|
| 9.1 | Does your child usually ask for things on their own — without needing "what do you want?" first? | §6.1 entry condition, near-verbatim ("spontaneous requesting present") | **HARD** |
| 9.2 | Does your child reliably answer "What do you want?" with words, signs, or their pictures? | P8 exit skill | |
| 9.3 | Does your child sometimes show you things just to share — holding something up, pointing at a dog, bringing you a toy? | §3.4 (show/point to share interest) — the commenting precursor | |
| 9.4 | Does your child know the names — spoken word or picture — of a good handful of everyday things? | P9 method: labels are the raw material of comments | |
| 9.5 | Does your child usually notice new or surprising things around them — turning toward them, reacting? | P9 method: noticing is what commenting narrates | |

**[X] for 9.1:** "asking without being prompted"

## Phase 10 — Turn-Taking and Social Interaction Games

Route (§6.1): social_communication ≥ 60, expressive_language ≥ 45.

| # | Item (yes/no) | Provenance (all derived) | Hard |
|---|---|---|---|
| 10.1 | Can your child wait briefly — a few seconds up to half a minute — for something they want, with your support? | P10 core demand: tolerating the other person's turn | **HARD** |
| 10.2 | Does your child usually join back-and-forth exchanges with you — rolling a ball back, trading objects, copying games? | §6.1 driver: social_communication (dyadic reciprocity) | |
| 10.3 | Does your child usually communicate wants and comments with words, signs, or pictures through the day? | §6.1 gate: expressive_language ≥ 45 | |
| 10.4 | Will your child usually stay in a game or activity you lead for several minutes? | P10 format: adult-led structured games | |
| 10.5 | Is your child usually okay when another child or adult joins an activity? | P10 progression: games extend to peers/third parties | |

**[X] for 10.1:** "waiting for a turn"

## Phase 11 — Functional Communication in Daily Routines

Route (§6.1): functional_communication ≥ 65 AND expressive_language ≥ 55.

| # | Item (yes/no) | Provenance (all derived) | Hard |
|---|---|---|---|
| 11.1 | Does your child usually use their communication — words, signs, or pictures — to ask for what they need in at least one daily routine (meals, bath, bedtime)? | P11 goal: the phase generalises exactly this | **HARD** |
| 11.2 | Does your child communicate with more than one person — not only you? | P11 generalisation across partners | |
| 11.3 | Does your child usually manage the basic steps of familiar routines with your help — coming to the table, getting into the bath? | P11 format: practice lives inside real routines | |
| 11.4 | Does your child usually make a choice when offered two options? | §6.1 driver: functional_communication (choice-making) | |
| 11.5 | Can your child usually handle small changes to a routine without a major upset? | P11 method: varied, real-life practice needs flexibility | |

**[X] for 11.1:** "communicating within daily routines"

## Phase 12 — Vocal Approximation and Sound Shaping

Route (§6.1): speech_sound < 40 AND other domains ≥ 55 — speech is the isolated gap.

| # | Item (yes/no) | Provenance (all derived) | Hard |
|---|---|---|---|
| 12.1 | Setting speech aside, does your child usually make themselves understood — with signs, pictures, or gestures? | §6.1 entry condition ("other domains ≥ 55" — the defining P12 profile; HARD per owner edit E2) | **HARD** |
| 12.2 | Does your child make some sounds on purpose — babble, hums, sound effects in play? | P12 method: shaping needs raw sounds to shape (what the phase teaches, not what it requires — E2) | |
| 12.3 | Does your child usually copy actions or gestures you show them? | §6.1 sequencing: motor imitation underpins vocal imitation (P2 exit) | |
| 12.4 | Will your child usually join in sound-play with you — silly noises, animal sounds, singing — without distress? | P12 activities | |
| 12.5 | Does your child usually watch your mouth or face when you make interesting sounds? | P12 method: attending to the vocal model | |

**[X] for 12.1:** "communicating without relying on speech"

---

## Open flags for review (R-F1…R-F4)

- **R-F1 — Phase 1 is the floor.** No lower phase exists, so P1 items are deliberately
  minimal (tolerance/engagement, not skills). A ≤3-YES child still starts P1 — in the
  Simplified variant per ruling 4, which is the gentlest thing the product has. Confirm
  you're comfortable that the P1 check can only soften entry, never redirect it.
- **R-F2 — Phase 3 has two entry populations** (oral-motor flags AND low speech —
  §6.1 requires both, but §6.2's tree can route on the flag signal). Items 3.1–3.5 are
  written to fit both; item 3.4 (mealtime safety) intentionally echoes the §7.1 choking
  red flag — a NO here duplicates a signal the Compass may already have raised. Confirm
  the duplication is wanted (belt-and-braces) rather than noisy.
- **R-F3 — Mid-chain PECS placements.** For phases 5–9 the §6.1 entry conditions are
  domain-score bands, but the load-bearing prerequisite is the prior PECS skill. A child
  placed directly into the middle of the chain by the Compass may never have done the
  earlier phases in-app — the hard items therefore ask about the skill itself, wherever it
  was learned (home, school, prior therapy). This is the main population the check exists
  for; the hard-item choices encode that judgement and deserve your closest read.
- **R-F4 — Wording register.** Items are plain-language and modality-neutral by §11's
  rules (no bracket-as-age labels, no jargon). Where §6.1 wording was clinical
  ("spontaneous requesting present"), the caregiver phrasing is my translation — flagged
  since translation can shift meaning.
