# Communication Compass™ — Caregiver Onboarding Assessment
## Blueprint for an Adaptive Speech & Language Screening Instrument

**Document version:** 2.0.0
**Reconciled against:** `therapy_Exercises_12_phases_with_Simplified_Sections_2.docx` (12-Phase Therapy Session Guide, revision 2 — Simplified Sessions for all phases, Scoring Criteria for Phases 2–3, Age-Bracket Transition Rule, Scoring Reference appendix)
**Status of this revision:** All shared constants, age brackets, phase identifiers, and scoring vocabulary in this document are now defined in exactly one place — §13, the Curriculum Alignment Contract — and referenced from everywhere else.

**Document purpose:** This is a complete design specification for a non-diagnostic, caregiver-completed onboarding instrument. Every item, scoring rule, and label below was written from scratch for this product. It is organized around the developmental domains that speech-language pathology (SLP) has treated as foundational for decades (receptive/expressive language, speech sound development, social communication, play, etc.), but the wording, response formats, scoring math, and phase-mapping logic are original to this product and are not copied or adapted from any published or proprietary instrument.

---

## 0. Guardrails That Apply to Every Layer of This Document

These statements must appear in the product (not just this design doc):

- **Screening, not diagnosis.** "This tool estimates your child's current communication skills to personalize their activities. It does not diagnose autism, developmental language disorder, apraxia of speech, or any other condition."
- **Not a substitute for professional evaluation.** "A licensed Speech-Language Pathologist (SLP) is the only professional who can diagnose a communication disorder. If you have concerns, please share these results with one."
- **Mandatory referral triggers.** Certain caregiver reports (defined in §7) must always surface a "Please talk to a professional" message, regardless of the computed score, and must never be suppressed by the scoring engine.
- **Living instrument.** "This assessment is regularly reviewed and refined. It is a placement tool for this app, not a validated clinical measure" (see §12 for the validation roadmap).
- **The caregiver has the final say on placement.** The Compass recommends a starting phase; the caregiver may override it (§6.5). The override is confirmed, logged, and never silently discarded.

---

## 0.1 Change Log — v1.0.0 → v2.0.0

Everything below was changed because the curriculum document said something different, or because the curriculum added a mechanism that the Compass has to feed.

| # | Area | v1.0.0 said | v2.0.0 says | Why |
|---|---|---|---|---|
| C1 | **Supported age range** | Bands A/B/C covering 0–60+ months (0–5 years) | Single bracket concept covering **36–179 months (3;0–14;11)** | The curriculum's activity variants are Ages 3–7 / 8–12 / 10–14. A child under 3 has no content to be placed into, and a child over 5 had no assessment band. Only the 3–5 sliver overlapped. |
| C2 | **Age band vs age-group variant** | Two parallel schemes (A/B/C for items; the curriculum's own 3–7 / 8–12 / 10–14 for activities) | **One field.** `age_bracket` ∈ `3-7` \| `8-12` \| `10-14` drives both the item set shown and the activity variant served | Two overlapping-but-different age schemes in one product is the single highest-risk source of build bugs. |
| C3 | **Age-Bracket Transition Rule** | Absent | §6.6 + §9 tables + §13 constants | The curriculum now specifies a 3-gate transition rule that consumes session data. The Compass sets its starting point (the onboarding bracket) and the chronological age floor, so the contract has to live here too. |
| C4 | **Phase names & PECS dual-numbering** | 12 informal names, several not matching the curriculum | Canonical table in §13.2: `phase_number` 1–12 is the only identifier; PECS labels are display-only | The curriculum uses "Phase 6 = PECS Phase 3". Left unresolved, someone will write `phase = 3` meaning PECS Phase 3. |
| C5 | **Score namespace collision** | `domain_score`, `overall_score` both 0–100 | Renamed `compass_*`; the curriculum's per-trial/per-session number keeps the name `score_percent` and is never mixed with Compass scores | Both are 0–100 and both describe "how the child did". Different meanings, different lifecycles. |
| C6 | **Oral-motor screen contradiction** | §2.8/§3.8: "never scores into phase placement" — but §6.1/§6.2 route to Phase 3 on oral-motor flags | Clarified: contributes **zero points to the weighted score**, but its flags **are** a routing signal for Phase 3 | Internal contradiction in v1.0.0. |
| C7 | **§6.2 ELSE branch** | "Phase closest to overall_score midpoint, flagged for a short readiness module" | Place at the tentative candidate phase; no SLP-flagging branch | Matches the recorded decision (Option B). |
| C8 | **Caregiver override** | Absent | §6.5, `placement_source`, confirmation gate, audit row | Recorded product decision, not previously in the spec. |
| C9 | **Two-adult requirement** | Absent | Intake item + `second_adult_available` + §6.7 placement caveat | Curriculum Phases 4 and 5 (PECS 1 & 2) require Caregiver A (Communication Partner) and Caregiver B (Physical Prompter). Placing a single-adult household at Phase 4 with no warning breaks the session on day one. |
| C10 | **Simplified Sessions** | Not referenced | §6.8 + `outcome ∈ advance\|repeat\|simplify` | The curriculum now has a Simplified Session for **every** phase, so simplify is a first-class outcome, not an edge case. |
| C11 | **Pass mark** | Not stated | 75% across 3 consecutive sessions, in §13.1, sourced from the curriculum appendix | The Compass's readiness thresholds must not be confused with the curriculum's pass mark. |
| C12 | **Platform** | "mobile-first", "One question per screen on mobile" | Responsive **web** application (Next.js + Tailwind + shadcn/ui), mobile-first breakpoints | Product pivoted from mobile app to web app. |
| C13 | **Notifications** | Channel unspecified | Email | Recorded product decision (no push notifications). |
| C14 | **Database** | Generic SQL | Postgres-on-Supabase, with RLS notes and `auth.users` linkage | Recorded stack decision. |
| C15 | **Session-level storage** | Only `phase_history` | `sessions`, `session_trials`, `age_bracket_transitions`, `session_participants` | The transition rule's Gate 2 needs per-trial tier data; Gate 3 needs retake counts. `phase_history` alone cannot answer either. |
| C16 | **Red flags** | Written for a 0–5 population | Split into age-invariant flags and developmental-history flags; older-child flags added | "No pointing by 18 months" cannot be asked as a present-tense question of a 9-year-old. |
| C17 | **Curriculum versioning** | Only `schema_version` | Added `curriculum_version` to assessments and sessions | Content is version-bumped like code; placement must be traceable to the curriculum revision that produced it. |

---

## 1. Assessment Blueprint (High-Level Architecture)

| Layer | Purpose |
|---|---|
| **Intake** | Date of birth (age derived, never entered), primary language(s) spoken at home, whether a second adult is regularly available for sessions, birth/developmental history flags, prior services (optional, for context only — not scored) |
| **9 Domain Modules** | Receptive Language, Expressive Language, Speech Sound Development, Social Communication, Functional Communication, Play & Shared Activity, Learning Readiness, Oral-Motor/Feeding Screen, Functional Benchmark Checklist |
| **Red-Flag Sweep** | A short set of always-shown questions that can trigger referral regardless of score |
| **Scoring Engine** | Converts raw answers into 0–100 Compass domain scores + overall score + confidence |
| **Phase Mapper** | Converts scores into a recommended starting `phase_number` (1–12) with rationale |
| **Bracket Assigner** | Sets the child's starting `age_bracket` from chronological age (§13.3) |
| **Output Layer** | JSON payload consumed by the RL engine; human-readable summary for the caregiver |

**Administration:** Untimed, self-paced, responsive web (mobile-first breakpoints, usable on a phone browser). Estimated completion: 8–12 minutes. Branching logic skips items that are clearly not bracket-relevant and auto-scores them as "not yet expected".

**Supported age range:** **3;0 to 14;11 (36–179 months).** This is set by the curriculum, which has no activity content below age 3 or above age 14.

- **Below 36 months:** the flow stops before scoring and shows a non-alarming message — the app's activities begin at age 3, and for a child this young the right next step is a conversation with an SLP or paediatrician. No phase is generated. This is a supported, dignified exit, not an error state.
- **At or above 180 months:** same treatment, framed as "our activities are built for children up to 14."

**Age bracketing:** Every domain module has three item sets, and the bracket a child is in is the *same* value that selects their activity variant in the curriculum. There is no separate "assessment band" concept.

- **Bracket `3-7`** — ages 3;0–7;11 (36–95 months)
- **Bracket `8-12`** — ages 8;0–12;11 (96–155 months)
- **Bracket `10-14`** — ages 13;0–14;11 (156–179 months) *at onboarding*

The bracket labels are the curriculum's own labels and deliberately overlap (`8-12` and `10-14` both contain ages 10–12). Onboarding assignment is by the non-overlapping rule in §13.3: a 10-, 11-, or 12-year-old **starts** in `8-12` and can be moved to `10-14` later by the Age-Bracket Transition Rule. Starting low and letting performance promote is the conservative direction.

The caregiver only ever sees the item set matching the child's bracket, so the survey never feels irrelevant or condescending.

---

## 2. Domain Definitions (Original Operational Definitions)

These are working definitions written for this product — plain-language operationalizations of concepts that are standard across the SLP field, not quotations from any source.

1. **Receptive Language** — the child's observable ability to understand words, directions, and routines without relying on gesture or context cues alone.
2. **Expressive Language** — the child's observable output, from pre-verbal vocalizing through connected sentences, used to convey meaning.
3. **Speech Sound Development** — how clear the child's speech attempts are to familiar and unfamiliar listeners, and how many distinct sounds the child attempts (screening-level only; not a phonetic inventory).
4. **Social Communication** — the child's use of eye gaze, gesture, and turn-taking to connect with another person before or alongside words.
5. **Functional Communication** — however the child currently gets a need met, whether that's crying, pulling, pointing, an AAC device, signs, or words. This domain deliberately treats all of these as valid communication, not just spoken words.
6. **Play & Shared Activity** — how the child engages with objects and with another person in a shared activity: from cause-and-effect exploration, through functional and pretend play, up to rule-based and interest-based shared activities for older children. *(Renamed from "Play Skills" in v1.0.0 — for an 11-year-old the construct is shared activity engagement, and the curriculum's Turn-Taking phase explicitly uses interest-based and digital activities for ages 8–14, not toys.)*
7. **Learning Readiness** — behavioral/attentional prerequisites for structured teaching: sitting tolerance, imitation, response to praise/rewards, and transitions.
8. **Oral-Motor/Feeding Screen** — caregiver-observed feeding and mouth-movement patterns. **Scoring rule (see C6):** this domain contributes **zero weight to the overall Compass score** and is never averaged into placement. Its *flags*, however, are an explicit routing signal into Phase 3 (Oral Motor Exercises) and an explicit referral trigger. "Not scored" means "no points in the weighted average" — it does not mean "ignored by the phase mapper".
9. **Functional Benchmark Checklist** — a short set of bracket-referenced yes/no items used only to sanity-check the domain scores (see §5.4). *(Renamed from "Developmental Milestone Checklist" — developmental milestones are a 0–5 construct. For brackets `8-12` and `10-14` the items are everyday functional benchmarks, e.g. "can tell a familiar adult what happened at school today", not milestone attainment.)*

---

## 3. Original Item Bank (Representative Samples per Domain)

Below are representative items per domain/bracket. In production this expands to a full item bank (12–18 items per domain per bracket), but the structure, phrasing style, and response format shown here are final.

> **Item ID format:** `{DOMAIN}-{BRACKET}-{NN}` — e.g. `REC-B2-04` is Receptive Language, bracket `8-12`, item 4. Bracket codes in item IDs: `B1` = `3-7`, `B2` = `8-12`, `B3` = `10-14`. *(v1.0.0 used `REC-B-04` with A/B/C bracket letters; those IDs are retired, not remapped, so no historical response is ever silently reinterpreted.)*

### 3.1 Receptive Language

**Bracket `3-7`**
- "If you say 'Put the ball in the box,' does your child do it without you pointing or showing them?"
- "Can your child point to at least 5 body parts when you name them (e.g., 'Where's your nose?')?"
- "If you say, 'First wash hands, then eat,' does your child attempt both steps in order?" *(two-step directions)*
- "If you ask, 'What do you do when you're tired?' does your child give a relevant answer (e.g., 'sleep')?"
- "After hearing a short 3–4 sentence story, can your child answer one simple 'what happened' question about it?"

**Bracket `8-12`**
- "If you give an instruction with three parts — 'Get your shoes, put them by the door, then come back' — does your child do all three without reminders?"
- "Can your child follow an instruction about something not in the room right now, like 'Go and check if the light in your bedroom is off'?"
- "When you explain a rule for a game, does your child follow it without needing it re-explained during play?"
- "If you ask 'why' about something that just happened, does your child give an answer that actually addresses the why?"

**Bracket `10-14`**
- "Can your child follow a multi-step instruction given once, in a noisy or busy setting?"
- "Does your child understand an instruction that depends on a condition — 'If it's raining, take the umbrella; if not, leave it'?"
- "When someone uses a common figure of speech ('hold your horses', 'it's a piece of cake'), does your child understand the meaning rather than the literal words?"
- "Can your child listen to a short explanation and then tell you what they're supposed to do?"

### 3.2 Expressive Language

**Bracket `3-7`**
- "Does your child put two words together on their own, like 'more juice' or 'mommy go'?"
- "When your child wants something, do they usually tell you with a word or short phrase, rather than only crying or pulling you?"
- "Does your child comment on things without being asked, like pointing at a dog and saying 'dog!' or 'big dog'?"
- "Does your child use short sentences of 4+ words, like 'I want the red one'?"
- "Can your child tell you about something that happened earlier today, in a few connected sentences?"
- "Does your child ask questions using words like 'what,' 'where,' or 'why'?"

**Bracket `8-12`**
- "Can your child tell you about their day in a way a listener could follow — roughly in order, with enough detail to make sense?"
- "Does your child ask for help using words when something goes wrong, rather than only showing frustration?"
- "When your child can't think of the exact word, do they find another way to say it (describe it, gesture, give an example) rather than stopping?"
- "Does your child join a conversation with more than one other person — adding something, not just answering direct questions?"

**Bracket `10-14`**
- "Can your child explain how to do something familiar to them, step by step, to someone who doesn't already know it?"
- "Does your child disagree or negotiate using words — giving a reason, not just refusing?"
- "Can your child retell a film, game, or story with the main events in a sensible order?"
- "Does your child adjust how they talk depending on who they're talking to (a younger child vs. a teacher)?"

### 3.3 Speech Sound Development *(screening only — no diagnostic claims)*

**All brackets**
- "When your child talks, how much of it can YOU understand?" *(Almost none / Some / About half / Most / Nearly all)*
- "When your child talks, how much can an unfamiliar adult (not you) usually understand?"
- "Can your child copy simple sounds or sound-play when you model them (e.g., 'moo,' 'vroom,' 'pop')?"
- "Roughly how many different consonant sounds does your child attempt in words (even if not perfectly clear)? Rough guess is fine." *(Fewer than 3 / A few / Several / Most expected sounds)*

**Additional, brackets `8-12` and `10-14`**
- "Do people outside the family ask your child to repeat themselves?" *(Almost always / Often / Sometimes / Rarely / Never)*
- "Does your child avoid speaking in some situations because of how their speech sounds?" *(soft flag if Often/Always — routed to §7)*

### 3.4 Social Communication

**All brackets, examples**
- "When you call your child's name from across the room, do they look at you?"
- "Does your child look back and forth between you and something interesting, like showing you a toy?" *(joint attention)*
- "Does your child point at things or otherwise show you things to share interest — not just to request something?"
- "Does your child copy simple actions you do, like clapping or waving?"
- "In a shared activity, does your child take a 'turn' and then wait for yours?"
- "Does your child start interactions with you (bringing something over, tapping you, making a sound or comment to get your attention) rather than only responding when you start them?"

**Additional, brackets `8-12` and `10-14`**
- "Does your child notice when the other person has lost interest or wants to change the subject?"
- "Can your child keep a back-and-forth conversation going for several turns on a topic they didn't choose?"
- "Does your child join in with a group of peers, or mostly stay on the edge?"

### 3.5 Functional Communication

**All brackets**
- "When your child wants something out of reach, what do they usually do?" *(Cry/fuss only / Pull you to it / Point or gesture / Use a picture, sign, or device / Use words)*
- "Does your child have a reliable way to say 'yes' and 'no' — with words, signs, gestures, or a device?"
- "If your child is upset, can you usually tell what they want or need from how they communicate?"
- "Does your child have a way to tell you something hurts or something is wrong?"
- "Can your child make a request of someone outside the immediate family — a teacher, a shopkeeper, a relative?" *(brackets `8-12`, `10-14`)*

### 3.6 Play & Shared Activity

**Bracket `3-7`**
- "Does your child make toys 'do something' repeatedly, like pushing a button to hear a sound?" *(cause-effect)*
- "Does your child use toys the way they're meant to be used, like rolling a car or stacking blocks?" *(functional play)*
- "Does your child pretend — like feeding a doll, talking on a toy phone, or stirring an empty pot?" *(symbolic/pretend play)*
- "Can your child play a simple pretend game WITH another person, building on what the other person does?" *(shared/social play)*

**Brackets `8-12` and `10-14`**
- "Can your child play a game with rules (a card game, a board game, a phone or console game with another person) and stick to the rules?"
- "Does your child let someone else have a turn without needing to be told?"
- "Does your child have an activity or interest they'll happily do alongside another person for 10+ minutes?"
- "When your child loses a game or doesn't get their way in a shared activity, can they stay in the activity?"

### 3.7 Learning Readiness

**All brackets**
- "About how long can your child stay engaged in one activity with you before wanting to leave?" *(Under 1 min / 1–2 min / 3–5 min / 5+ min / 10+ min)*
- "When you demonstrate an action and ask your child to copy it, do they attempt it?"
- "Can your child sit for a short structured activity (puzzle, book, table task) with support?"
- "Does your child respond to praise or a small reward by repeating the behavior that earned it?"
- "How does your child usually handle switching from one activity to another?" *(Very hard / Somewhat hard / Manageable / Easy)*

> **Direct feed into the curriculum.** The engagement-duration item maps to whether the curriculum's standard 10–15 minute session length is realistic on day one. If the answer is "Under 1 min" or "1–2 min", the placement payload sets `start_in_simplified: true` (§6.8) so the RL opens the phase's Simplified Session rather than Session 1.

### 3.8 Oral-Motor / Feeding Screen *(zero weight in the overall score — flags and Phase 3 routing only; see C6)*

- "Do you notice frequent drooling beyond what's expected for your child's age?"
- "Does your child have noticeable difficulty chewing age-appropriate foods?"
- "Have you noticed difficulty moving the tongue side-to-side or lifting it (e.g., to lick lips)?"
- "Does your child have trouble closing their lips fully around a spoon, cup, or straw?"
- "Can your child blow (e.g., bubbles, a pinwheel, blow out a candle) with an open mouth shape?"
- "Any coughing, gagging, or choking during regular meals?" *(always a hard red flag if "yes")*

> The blowing item maps directly to the curriculum's Phase 3 Session 2 Activity 1 (Bubble Blowing) and the tongue items to Session 3's tongue-placement warm-up, so a "no" here is a genuine Phase 3 entry signal rather than a generic screen.

### 3.9 Functional Benchmark Checklist (cross-check only, see §5.4)

Short yes/no list of 6–8 bracket-referenced items. Used only to sanity-check domain scoring; never scored as its own domain, never in the RL output as a score.

- **Bracket `3-7`:** uses at least 20 different words; combines two words; points to request; follows a simple instruction; plays near other children; makes a want known without crying.
- **Bracket `8-12`:** can tell a familiar adult what happened at school today; asks for help from an adult who isn't a parent; follows a two-part instruction at home; takes part in a conversation at a meal; uses a phone/tablet to communicate with a family member.
- **Bracket `10-14`:** can make a request of an unfamiliar adult; can explain a problem to someone who wasn't there; takes part in a group activity outside the home; can be understood on a phone or voice call by someone outside the family.

---

## 4. Question Types Used

- **Frequency scale (5-point):** Never → Rarely → Sometimes → Often → Always
- **Behavioral quantity scale (4-point):** Not yet → Sometimes → Often → Almost always
- **Forced-choice "how does your child usually communicate this":** ranked, mutually exclusive options reflecting a hierarchy from pre-symbolic to symbolic communication
- **Functional benchmark yes/no checklist**
- **Scenario-based item:** short caregiver-relatable scenario followed by a behavioral question
- **Open-ended free text (optional, unscored):** "Anything else you'd like us to know?" — reviewed by a human if flagged, never auto-scored

All items are written at approximately a 6th-grade reading level (short sentences, common words, one idea per question, no clinical jargon). A caregiver-facing glossary defines any term that can't be avoided (e.g., "gesture").

---

## 5. Original Scoring Algorithm

This scoring model was built specifically for this product. It is **not** a copy of any published rubric.

> **Naming rule (see C5).** Every number produced by this instrument is prefixed `compass_`. The curriculum's per-trial and per-session number is called `score_percent` and is produced by the RL engine, never by this instrument. The two are both 0–100 and must never be averaged, compared, or stored in the same column. A `compass_domain_score` of 61 and a session `score_percent` of 61 have nothing to do with each other.

### 5.1 Item-Level Scoring

Every item is normalized to a **0–4 raw point scale** regardless of its response format:

| Response tier | Points |
|---|---|
| Not observed / Never / Not yet | 0 |
| Rarely / Not yet, but emerging | 1 |
| Sometimes | 2 |
| Often / Usually | 3 |
| Always / Consistently / Yes, clearly | 4 |

Forced-choice hierarchy items (e.g., §3.5) are pre-mapped by the design team to a 0–4 scale based on where that behavior sits on a pre-symbolic → symbolic communication continuum (e.g., "cry/fuss only" = 0, "words" = 4).

> This 0–4 item scale is **unrelated** to the curriculum's 0/25/50/75/100 trial scale in the Scoring Reference appendix. Different instrument, different lifecycle, no conversion between them.

### 5.2 Compass Domain Score Calculation

For a given domain *d* with *n* answered items:

```
compass_domain_raw(d)   = sum(item_points) / (n_answered * 4)   → a 0.0–1.0 fraction
compass_domain_score(d) = round(compass_domain_raw(d) * 100)    → 0–100 scale
```

**Age-expectation adjustment.** Each item carries a design-time "typical range" weight (Low/Typical/Advanced for the child's bracket) set by the clinical design team. This produces an **Age-Adjusted Compass Domain Score**:

```
adj_compass_domain_score(d) = compass_domain_score(d) * age_weight_factor(d, age_bracket)
```

Where `age_weight_factor` is a normalization constant (0.85–1.15) that keeps scores comparable across the three brackets, calibrated during the validation phase (§12) rather than hard-coded arbitrarily at launch — initial values are clinical-team estimates, explicitly labeled as provisional in internal documentation.

### 5.3 Overall Communication Readiness Score

```
compass_overall_score = weighted_average(
    receptive_language      × 0.20,
    expressive_language     × 0.20,
    speech_sound            × 0.10,
    social_communication    × 0.20,
    functional_communication× 0.15,
    play_shared_activity    × 0.10,
    learning_readiness      × 0.05
)
```

Oral-motor/feeding and the functional benchmark checklist are excluded from this weighted average — they are flag/cross-check layers, not scored inputs to the weighted score. (Oral-motor flags still route to Phase 3 in §6.2; see C6.)

### 5.4 Confidence Score

Confidence is **not** a measure of clinical certainty — it reflects data completeness and internal consistency:

```
completeness = items_answered / items_total
consistency  = 1 - (variance across domain scores that benchmark-checklist cross-checks would predict should move together)
confidence   = round((0.6 * completeness + 0.4 * consistency), 2)   → 0.00–1.00
```

**Confidence ladder — the three thresholds, in one place, so nobody hard-codes a fourth:**

| Confidence | Behaviour |
|---|---|
| `< 0.60` | Supplemental question set issued before any placement is finalized. API returns `202`, no `recommended_phase` yet. |
| `0.60 – 0.74` | Placement generated, but `placement_mode = readiness_module_first` (§6.3). |
| `≥ 0.75` | Placement generated, `placement_mode = start_directly` if the prerequisite gap is also small (§6.3). |

### 5.5 Strengths / Needs Extraction

```
strengths = domains where adj_compass_domain_score >= 65, ranked descending, top 3
needs     = domains where adj_compass_domain_score <= 45, ranked ascending, top 3
```

---

## 6. Phase Recommendation Engine

### 6.1 Phase Prerequisite Map (Original Mapping Logic)

Each of the 12 phases is mapped to a primary domain driver and a prerequisite score band. This mapping was constructed by reasoning about skill sequencing (e.g., joint attention typically precedes symbolic requesting; imitation typically precedes structured picture exchange), not copied from any external curriculum.

**Phase names below are the canonical curriculum names (§13.2). Do not use the v1.0.0 short names anywhere in code or UI.**

| `phase_number` | Canonical Name | Primary Driver Domain(s) | Typical Entry Condition |
|---|---|---|---|
| 1 | Joint Attention Activities | Social Communication | social_communication < 35 |
| 2 | Imitation Training | Learning Readiness + Social Communication | learning_readiness < 40 OR imitation-items low, with social_communication ≥ 35 |
| 3 | Oral Motor Exercises | Speech Sound + Oral-Motor flags | oral-motor flags present AND speech_sound < 30 |
| 4 | PECS Phase 1: How to Communicate | Functional Communication | functional_communication < 40, with basic imitation present |
| 5 | PECS Phase 2: Distance and Persistence | Functional Communication | functional_communication 40–55, exchange skill present but inconsistent |
| 6 | PECS Phase 3: Picture Discrimination | Receptive Language + Functional Communication | functional_communication ≥ 55, receptive_language 35–55 |
| 7 | PECS Phase 4: Sentence Structure | Expressive Language | expressive_language 35–55, single words present |
| 8 | PECS Phase 5: Responsive Requesting | Receptive Language + Social Communication | receptive_language ≥ 55, social_communication 40–60 |
| 9 | PECS Phase 6: Commenting | Expressive Language + Social Communication | expressive_language ≥ 55, spontaneous requesting present |
| 10 | Turn-Taking and Social Interaction Games | Social Communication | social_communication ≥ 60, expressive_language ≥ 45 |
| 11 | Functional Communication in Daily Routines | Functional Communication + Expressive Language | functional_communication ≥ 65 AND expressive_language ≥ 55 |
| 12 | Vocal Approximation and Sound Shaping | Speech Sound | speech_sound < 40 AND other domains ≥ 55 (speech is the isolated gap) |

All thresholds in this table refer to `adj_compass_domain_score`, not raw domain scores, and not `score_percent`.

### 6.2 Decision Tree (Simplified Text Form)

```
START
 │
 ├─ age < 36 months OR age >= 180 months? ──YES──▶ Out-of-range exit (§1).
 │                                                  No placement generated.
 NO
 │
 ├─ Any hard red flag present? (see §7) ──YES──▶ Surface urgent SLP referral
 │                                                 message ALONGSIDE placement
 │                                                 (placement still generated,
 │                                                  never blocked)
 NO
 │
 ├─ oral_motor_flags present AND speech_sound < 30?
 │        YES ──▶ candidate = Phase 3
 │
 ├─ social_communication < 35?
 │        YES ──▶ candidate = Phase 1
 │
 ├─ learning_readiness < 40?
 │        YES ──▶ candidate = Phase 2
 │
 ├─ functional_communication < 40?
 │        YES ──▶ candidate = Phase 4
 │
 ├─ functional_communication 40–55?
 │        YES ──▶ candidate = Phase 5
 │
 ├─ functional_communication >= 55 AND receptive_language 35–55?
 │        YES ──▶ candidate = Phase 6
 │
 ├─ expressive_language 35–55 (single words present)?
 │        YES ──▶ candidate = Phase 7
 │
 ├─ receptive_language >= 55 AND social_communication 40–60?
 │        YES ──▶ candidate = Phase 8
 │
 ├─ expressive_language >= 55 (spontaneous requesting present)?
 │        YES ──▶ candidate = Phase 9
 │
 ├─ social_communication >= 60 AND expressive_language >= 45?
 │        YES ──▶ candidate = Phase 10
 │
 ├─ functional_communication >= 65 AND expressive_language >= 55?
 │        YES ──▶ candidate = Phase 11
 │
 ├─ speech_sound < 40 AND all other domains >= 55?
 │        YES ──▶ candidate = Phase 12
 │
 └─ ELSE ──▶ candidate = phase whose entry condition is nearest to the child's
             profile by absolute distance on its primary driver domain.
             Place the child there. Ties break to the LOWER phase_number.
             (See C7 — there is deliberately no SLP-flagging branch here.
              The caregiver override in §6.5 is the correction mechanism.)
```

*Note: multiple conditions can be true simultaneously (a real child rarely fits one box). The engine evaluates conditions in the fixed priority order above — foundational/prerequisite skills (joint attention, imitation, oral-motor) are checked first, since a child with strong expressive language but no joint attention should still start at Phase 1, not skip ahead.*

### 6.3 "Start Here vs. Readiness Module First" Rule

```
IF confidence >= 0.75 AND candidate phase prerequisite gap is small (within 10 points of threshold):
    → placement_mode = "start_directly"
ELSE IF confidence < 0.75 OR candidate phase prerequisite gap is large (>10 points below threshold):
    → placement_mode = "readiness_module_first"   (a short 5-item readiness check for Phase X)
```

This is a Compass-side gate on *placement*. It is unrelated to the curriculum's Advance / Repeat / Simplify decision, which is an RL-side gate on *session performance* against the 75% pass mark (§13.1).

### 6.4 Reasoning Narrative Generator

For every placement, the engine assembles a plain-language explanation from a template bank, e.g.:

> "We're starting [Child] at **Phase [X]: [Canonical Name]**. This is because [primary driver domain] scored in the [range] range, which is the main skill this phase builds. [Child] is already showing strength in [top strength domain], which will help. We'll check in on [primary need domain] as they move through this phase."

Reasoning arrays in the JSON output (§8) contain 2–4 such generated sentences, each tied to specific score inputs — never a generic canned phrase.

Where the narrative names a phase, it uses the canonical name and never the PECS sub-number alone. "Phase 6: Picture Discrimination", never "PECS Phase 3" on its own, because a caregiver reading "Phase 3" in one screen and "Phase 6" in another for the same activity is exactly the confusion §13.2 exists to prevent.

### 6.5 Caregiver Override of Initial Placement

The caregiver may move the recommended starting phase up or down before the first session. This is a deliberate product decision: the caregiver has watched the child for years and the Compass has watched them for eleven minutes.

**Flow:**

1. Results screen shows the recommendation with its reasoning and an unobtrusive "This doesn't look right — choose a different starting point" affordance.
2. Selecting it shows all 12 phases with one-line descriptions and the recommended one marked.
3. Choosing a different phase opens a **confirmation step** that states plainly what is being changed and why the recommendation existed: *"We suggested Phase 4 because [reason]. You're choosing Phase 7. You can change this again at any time from settings."*
4. Only after explicit confirmation is the override committed.

**Rules:**
- The override never suppresses a red flag or referral message.
- The original `recommended_phase` is retained in the payload; the override sets `starting_phase` and `placement_source = "caregiver_override"`.
- A row is written to `placement_overrides` (§9) with both phases and the timestamp — this is data the dissertation needs, since a systematic pattern of caregivers overriding in one direction is direct evidence about the phase mapper's calibration.
- The override does **not** change the child's `age_bracket`. Phase and bracket are orthogonal.

### 6.6 Handoff to the Age-Bracket Transition Rule

The Compass **assigns the starting bracket and the age floor. It does not run the transition rule** — that is the RL engine's job, using session data. The contract is:

**What the Compass writes, once, at onboarding:**

| Field | Source |
|---|---|
| `age_bracket` | §13.3 assignment rule, from chronological age |
| `bracket_assigned_at_months` | The child's age in months at onboarding |
| `age_floor_next_bracket_months` | §13.4 — the chronological age below which promotion cannot fire, regardless of performance |

**What the RL engine reads and never writes back to the assessment:** all three fields above.

**Why the floor is stored rather than computed at evaluation time:** the floor is a policy value that an SLP is expected to widen after review (§14). Storing it per child means a policy change applies to new children without silently re-promoting or demoting children already mid-programme. Recompute-on-read would do the opposite.

### 6.7 Two-Adult Requirement Check

Curriculum Phases 4 and 5 (PECS Phase 1 and 2) are built around two roles — Caregiver A (Communication Partner) and Caregiver B (Physical Prompter). A single adult cannot run them as written.

- Intake asks: *"For most sessions, will another adult or older family member be in the room to help?"* → `second_adult_available` ∈ `usually | sometimes | no`.
- If the candidate phase is 4 or 5 and `second_adult_available = "no"`, the placement is **not** changed. Instead the payload sets `two_adult_advisory: true` and the results screen carries a plain note: this phase works best with a second person, here's what that person does, and here's what to do if there isn't one.
- The second person is **not** an account. They are logged per session as an unauthenticated participant (name + role tag) in `session_participants` (§9), on the single primary device.

### 6.8 Simplified-Session Entry

Every phase in the curriculum now has a Simplified Session, so "simplify" is a normal outcome rather than a fallback.

- Normally the RL reaches the Simplified Session only via the curriculum's Simplify Condition (below pass mark after a retake).
- The Compass can open a phase *directly* in its Simplified Session when the profile predicts the standard session will not be completable on day one. The trigger is narrow and evidence-based, not a general "low score" rule: `learning_readiness` engagement-duration item answered "Under 1 min" or "1–2 min" (§3.7), against standard sessions of 10–15 minutes.
- Payload field: `start_in_simplified: boolean`. Default `false`.
- This is a starting point only. Once the child completes a Simplified Session, the RL's own Advance / Repeat / Simplify logic takes over and the Compass has no further say.

---

## 7. Red-Flag / Referral Logic

These are checked independently of scoring and **always** override the "everything looks great" framing when present, though they never block a placement from being generated.

### 7.1 Age-Invariant Hard Flags (asked as present-tense questions at every bracket)

- Caregiver reports loss of previously acquired words or skills (regression) — at any age
- No response to loud sounds or to their name across repeated attempts
- Coughing, gagging, or choking during regular meals
- Caregiver free-text response contains explicit concern language (routed to human review)

### 7.2 Developmental-History Hard Flags (asked once, at intake, as history)

These are milestone-threshold items. For a child already past the threshold age they cannot be asked in the present tense — they are asked as history, and a "yes" is a referral signal regardless of the child's current age (see C16).

- "Did your child reach 18 months without pointing or using any communicative gesture?"
- "Did your child reach 24 months without any words?"
- "Did your child reach 12 months without babbling or making speech-like sounds?"

For a child currently *below* the threshold age, the item is not asked; instead the present-tense equivalent is asked in the relevant domain module and evaluated against the threshold when the child reaches it.

### 7.3 Older-Child Hard Flags (brackets `8-12` and `10-14`)

- New or worsening hoarseness, breathiness, or voice loss persisting beyond about two weeks
- New difficulty swallowing, or a change in what the child can eat or drink
- A noticeable, recent decline in speech clarity or language ability compared with six months ago
- Child aged 5 or older with no reliable means of communication (no words, signs, pictures, or device) and no current professional involvement

### 7.4 Soft Flags (appended as a gentle note, not urgent)

- Multiple domains scoring in the lowest band simultaneously
- Confidence score persistently low across two consecutive assessments
- Child reported to avoid speaking in some situations because of how their speech sounds (§3.3)
- Unfamiliar-listener intelligibility reported as markedly lower than familiar-listener intelligibility

### 7.5 Message

Hard flags generate this exact category of message (not diagnostic, always paired with the placement): *"Some of what you shared is worth discussing with an SLP or your pediatrician soon. We'll still get [Child] started with personalized activities today, and this is something to bring up alongside that."*

---

## 8. JSON Output Schema

```json
{
  "assessment_id": "string (uuid)",
  "child_id": "string (uuid)",
  "completed_at": "ISO-8601 timestamp",
  "age_months_at_assessment": "integer 36-179",
  "age_bracket": "3-7 | 8-12 | 10-14",
  "age_floor_next_bracket_months": "integer | null (null when already in 10-14)",
  "second_adult_available": "usually | sometimes | no",
  "compass_overall_score": "integer 0-100",
  "confidence": "float 0.00-1.00",
  "compass_domain_scores": {
    "receptive_language": "integer 0-100",
    "expressive_language": "integer 0-100",
    "speech_sound": "integer 0-100",
    "social_communication": "integer 0-100",
    "functional_communication": "integer 0-100",
    "play_shared_activity": "integer 0-100",
    "learning_readiness": "integer 0-100"
  },
  "oral_motor_flags": ["array of strings, e.g. 'drooling', 'chewing_difficulty'"],
  "benchmark_crosscheck": {
    "expected_for_bracket": "integer count",
    "observed": "integer count",
    "consistent_with_domain_scores": "boolean"
  },
  "recommended_phase": "integer 1-12 (engine output, never overwritten)",
  "starting_phase": "integer 1-12 (what the child actually begins)",
  "placement_source": "engine | caregiver_override",
  "placement_mode": "start_directly | readiness_module_first",
  "start_in_simplified": "boolean",
  "two_adult_advisory": "boolean",
  "reasoning": ["string", "string", "string"],
  "strengths": ["array of domain names, ranked"],
  "needs": ["array of domain names, ranked"],
  "next_skills": ["array of short skill-target strings for the RL engine"],
  "red_flags": {
    "hard": ["array of flag codes"],
    "soft": ["array of flag codes"]
  },
  "referral_recommended": "boolean",
  "suggested_reassessment_interval": "string, e.g. '6 weeks'",
  "schema_version": "string, e.g. '2.0.0'",
  "curriculum_version": "string, e.g. '2026.07-r2'"
}
```

**Schema changes from v1.0.0:** `age_band` → `age_bracket` (new values); `overall_score` → `compass_overall_score`; `domain_scores` → `compass_domain_scores`; `play` → `play_shared_activity`; `milestone_crosscheck` → `benchmark_crosscheck`. Added: `age_floor_next_bracket_months`, `second_adult_available`, `starting_phase`, `placement_source`, `start_in_simplified`, `two_adult_advisory`, `curriculum_version`. No field was silently repurposed — every renamed field also changed its key, so a v1.0.0 consumer fails loudly rather than reading the wrong thing.

### Example Populated Response

```json
{
  "assessment_id": "a1c9f2e0-...",
  "child_id": "b77e441a-...",
  "completed_at": "2026-08-02T14:32:00Z",
  "age_months_at_assessment": 63,
  "age_bracket": "3-7",
  "age_floor_next_bracket_months": 84,
  "second_adult_available": "sometimes",
  "compass_overall_score": 61,
  "confidence": 0.87,
  "compass_domain_scores": {
    "receptive_language": 71,
    "expressive_language": 32,
    "speech_sound": 27,
    "social_communication": 58,
    "functional_communication": 44,
    "play_shared_activity": 75,
    "learning_readiness": 84
  },
  "oral_motor_flags": [],
  "benchmark_crosscheck": {
    "expected_for_bracket": 8,
    "observed": 6,
    "consistent_with_domain_scores": true
  },
  "recommended_phase": 5,
  "starting_phase": 5,
  "placement_source": "engine",
  "placement_mode": "start_directly",
  "start_in_simplified": false,
  "two_adult_advisory": false,
  "reasoning": [
    "Functional communication scored 44, in the range where extending an existing exchange across distance is the highest-leverage next skill.",
    "Learning readiness scored 84, which is a strength that supports learning a new structured routine quickly.",
    "Receptive language is comparatively strong (71), so we'll pair the exchange system with simple spoken directions."
  ],
  "strengths": ["learning_readiness", "play_shared_activity", "receptive_language"],
  "needs": ["speech_sound", "expressive_language", "functional_communication"],
  "next_skills": ["exchange_across_1_metre", "persistence_when_partner_turns_away"],
  "red_flags": { "hard": [], "soft": [] },
  "referral_recommended": false,
  "suggested_reassessment_interval": "6 weeks",
  "schema_version": "2.0.0",
  "curriculum_version": "2026.07-r2"
}
```

> Note: the v1.0.0 example returned `recommended_phase: 4` for `functional_communication: 44`. Under §6.1/§6.2 the band 40–55 maps to Phase 5, not Phase 4. The example is corrected here — worth checking any test fixture copied from the old document.

---

## 9. Database Schema (Postgres / Supabase)

**Stack notes.** Postgres on Supabase. `caregivers.caregiver_id` references `auth.users(id)`. Row Level Security is enabled on every table below; the baseline policy is that a caregiver can read and write only rows reachable from their own `caregiver_id`. SLP read access (§14, item 6) is a separate, additive, read-only policy keyed on an explicit `slp_child_access` grant row, created manually for the dissertation test cohort rather than through a self-serve invite flow.

```sql
-- ============ IDENTITY & PROFILE ============

CREATE TABLE caregivers (
    caregiver_id UUID PRIMARY KEY REFERENCES auth.users(id),
    display_name VARCHAR(100),
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE children (
    child_id   UUID PRIMARY KEY,
    caregiver_id UUID NOT NULL REFERENCES caregivers(caregiver_id),
    birth_date DATE NOT NULL,
    primary_language VARCHAR(50),
    additional_languages TEXT[],
    -- Age bracket: set at onboarding, moved only by the transition rule
    age_bracket VARCHAR(6) NOT NULL CHECK (age_bracket IN ('3-7','8-12','10-14')),
    bracket_assigned_at_months INT NOT NULL,
    age_floor_next_bracket_months INT,          -- NULL once in '10-14'
    second_adult_available VARCHAR(10) CHECK (second_adult_available IN ('usually','sometimes','no')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ ASSESSMENT ============

CREATE TABLE assessments (
    assessment_id UUID PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(child_id),
    age_bracket VARCHAR(6) NOT NULL CHECK (age_bracket IN ('3-7','8-12','10-14')),
    age_months_at_assessment INT NOT NULL CHECK (age_months_at_assessment BETWEEN 36 AND 179),
    completed_at TIMESTAMPTZ NOT NULL,
    compass_overall_score SMALLINT CHECK (compass_overall_score BETWEEN 0 AND 100),
    confidence NUMERIC(3,2) CHECK (confidence BETWEEN 0 AND 1),
    recommended_phase SMALLINT CHECK (recommended_phase BETWEEN 1 AND 12),
    starting_phase    SMALLINT CHECK (starting_phase BETWEEN 1 AND 12),
    placement_source  VARCHAR(20) NOT NULL DEFAULT 'engine'
        CHECK (placement_source IN ('engine','caregiver_override')),
    placement_mode VARCHAR(30) CHECK (placement_mode IN ('start_directly','readiness_module_first')),
    start_in_simplified BOOLEAN DEFAULT FALSE,
    two_adult_advisory  BOOLEAN DEFAULT FALSE,
    referral_recommended BOOLEAN DEFAULT FALSE,
    suggested_reassessment_interval VARCHAR(20),
    schema_version     VARCHAR(10) NOT NULL,
    curriculum_version VARCHAR(20) NOT NULL,
    raw_payload JSONB NOT NULL
);

CREATE TABLE compass_domain_scores (
    id UUID PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES assessments(assessment_id),
    domain_name VARCHAR(40) NOT NULL,
    score SMALLINT CHECK (score BETWEEN 0 AND 100),
    age_adjustment_factor NUMERIC(4,3)
);

CREATE TABLE item_responses (
    id UUID PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES assessments(assessment_id),
    item_id VARCHAR(20) NOT NULL,   -- e.g. "REC-B2-04"
    domain_name VARCHAR(40) NOT NULL,
    raw_response VARCHAR(50) NOT NULL,
    scored_points SMALLINT CHECK (scored_points BETWEEN 0 AND 4)
);

CREATE TABLE red_flags (
    id UUID PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES assessments(assessment_id),
    flag_type VARCHAR(10) CHECK (flag_type IN ('hard','soft')),
    flag_class VARCHAR(20) CHECK (flag_class IN ('age_invariant','developmental_history','older_child')),
    flag_code VARCHAR(50) NOT NULL,
    reviewed_by_human BOOLEAN DEFAULT FALSE
);

CREATE TABLE placement_overrides (
    id UUID PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES assessments(assessment_id),
    child_id UUID NOT NULL REFERENCES children(child_id),
    engine_phase SMALLINT NOT NULL CHECK (engine_phase BETWEEN 1 AND 12),
    caregiver_phase SMALLINT NOT NULL CHECK (caregiver_phase BETWEEN 1 AND 12),
    confirmed_at TIMESTAMPTZ NOT NULL
);

-- ============ PROGRAMME EXECUTION (RL engine writes these) ============

CREATE TABLE phase_history (
    id UUID PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(child_id),
    assessment_id UUID REFERENCES assessments(assessment_id),  -- NULL for later, non-assessment-driven entries
    phase SMALLINT NOT NULL CHECK (phase BETWEEN 1 AND 12),
    entered_at TIMESTAMPTZ DEFAULT now(),
    exited_at  TIMESTAMPTZ
);

-- One row per completed session. Feeds the 75% pass mark AND all three
-- Age-Bracket Transition gates.
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(child_id),
    phase SMALLINT NOT NULL CHECK (phase BETWEEN 1 AND 12),
    session_index SMALLINT NOT NULL,          -- 1,2,3 ... ; 0 = Simplified Session
    is_simplified BOOLEAN NOT NULL DEFAULT FALSE,
    age_bracket VARCHAR(6) NOT NULL CHECK (age_bracket IN ('3-7','8-12','10-14')),
    is_retake BOOLEAN NOT NULL DEFAULT FALSE, -- Gate 3 input
    retake_of UUID REFERENCES sessions(session_id),
    score_percent NUMERIC(5,2) CHECK (score_percent BETWEEN 0 AND 100),  -- Gate 1 input
    top_tier_trial_share NUMERIC(4,3) CHECK (top_tier_trial_share BETWEEN 0 AND 1), -- Gate 2 input
    outcome VARCHAR(10) CHECK (outcome IN ('advance','repeat','simplify')),
    curriculum_version VARCHAR(20) NOT NULL,
    started_at   TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ
);

-- One row per scored opportunity. Implements the Scoring Reference appendix.
CREATE TABLE session_trials (
    trial_id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(session_id),
    trial_index SMALLINT NOT NULL,
    step_ref VARCHAR(40),                     -- which activity step produced this trial
    scale VARCHAR(24) NOT NULL CHECK (scale IN
        ('base_support','pecs3_discrimination','pecs5_latency','turn_taking')),
    tier_label VARCHAR(40) NOT NULL,          -- e.g. 'independent', 'verbal_prompt', 'self_corrected'
    base_points SMALLINT NOT NULL CHECK (base_points IN (0,25,50,75,100)),
    bonus_points SMALLINT NOT NULL DEFAULT 0 CHECK (bonus_points IN (-10,0,10)),
    trial_score NUMERIC(5,2) NOT NULL CHECK (trial_score BETWEEN 0 AND 100),
    is_top_tier BOOLEAN NOT NULL,             -- base_points = 100 and unprompted; Gate 2 numerator
    zero_reason VARCHAR(24)                   -- 'turn_theft' | 'session_abandonment' | 'no_response' | 'position_based'
);

-- Audit trail for every firing (and near-miss) of the Age-Bracket Transition Rule.
-- The near-miss rows are what the curriculum's Threshold Validation Trigger consumes.
CREATE TABLE age_bracket_transitions (
    id UUID PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(child_id),
    evaluated_at TIMESTAMPTZ NOT NULL,
    window_session_ids UUID[] NOT NULL,       -- the 3 sessions evaluated
    gate1_mean_score NUMERIC(5,2),
    gate1_pass BOOLEAN NOT NULL,
    gate2_min_top_tier_share NUMERIC(4,3),    -- worst session in the window, not the mean
    gate2_pass BOOLEAN NOT NULL,
    gate3_retake_count SMALLINT,
    gate3_pass BOOLEAN NOT NULL,
    age_floor_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    fired BOOLEAN NOT NULL,
    from_bracket VARCHAR(6),
    to_bracket   VARCHAR(6),
    cooldown_until_session_count SMALLINT
);

-- Advisory-only, per-activity downward signal. Never moves a bracket.
CREATE TABLE bracket_downward_advisories (
    id UUID PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(child_id),
    activity_ref VARCHAR(60) NOT NULL,
    baseline_score NUMERIC(5,2) NOT NULL,
    observed_mean_score NUMERIC(5,2) NOT NULL,
    sessions_observed SMALLINT NOT NULL CHECK (sessions_observed BETWEEN 5 AND 6),
    raised_at TIMESTAMPTZ NOT NULL,
    caregiver_action VARCHAR(20) CHECK (caregiver_action IN ('dismissed','accepted','no_action'))
);

-- The second person in the room. Not an account, not authenticated.
CREATE TABLE session_participants (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(session_id),
    display_name VARCHAR(60) NOT NULL,
    role_tag VARCHAR(30) NOT NULL   -- e.g. 'communication_partner','physical_prompter','turn_taking_peer'
);
```

**Indexes worth having on day one:** `sessions(child_id, completed_at DESC)` — every gate evaluation is a "last 3 sessions for this child" query; `session_trials(session_id)`; `phase_history(child_id, entered_at DESC)`.

---

## 10. API Response Format

**Endpoint:** `POST /v1/assessments/{assessment_id}/score`

**Response:** `200 OK`, `Content-Type: application/json`, body = the schema in §8.

**Error cases:**

| Status | Condition |
|---|---|
| 400 | Child's age outside the supported 36–179 month range (§1) — body carries the caregiver-facing out-of-range copy, not a raw error |
| 422 | Incomplete required items outside allowed skip logic |
| 409 | Assessment already scored (immutable once finalized) |
| 202 | Confidence below 0.60 — supplemental questions issued, no final score yet |

**Override endpoint:** `POST /v1/assessments/{assessment_id}/placement-override` with `{ "caregiver_phase": 1-12, "confirmed": true }`. Rejects with `400` if `confirmed` is not explicitly true — the confirmation gate in §6.5 is enforced server-side, not only in the UI.

**Webhook:** `assessment.scored` fires to the RL engine with the full payload so the starting phase's content can be pre-loaded before the caregiver finishes onboarding. The webhook carries `starting_phase` (not `recommended_phase`) as the phase to pre-load, plus `age_bracket` so the correct activity variant is fetched, and `start_in_simplified` so the right session is opened.

---

## 11. UI Recommendations

Responsive web (Next.js, Tailwind, shadcn/ui), mobile-first breakpoints — most caregivers will complete this on a phone browser, but it must be equally usable on a laptop.

- **Progress indicator by domain**, not by raw question count — caregivers tolerate length better when they see conceptual sections ("Play," "Talking," "Understanding") rather than "14 of 62."
- **One question per screen** at mobile widths; grouped 2–3 per screen at `md` and above.
- **Illustrative micro-copy under jargon-adjacent terms** (e.g., a one-line example under "gesture": "like waving, reaching, or pointing").
- **Save-and-resume** — caregivers of young children rarely finish a survey in one sitting. Resume link delivered by email.
- **Non-alarming results screen**: lead with strengths, use a warm visual (grow-chart style, not a clinical bar chart with red/green failure coloring), and present the phase placement as "where we'll start," not "your child's level."
- **The override affordance is present but quiet** (§6.5) — visible enough that a caregiver who disagrees can act, understated enough that it doesn't read as the app hedging on its own recommendation.
- **Red-flag messaging is separated visually** from the score summary so it reads as care, not as a failing grade.
- **Re-assessment nudges** delivered by **email** as a natural check-in ("Let's see how things are going") rather than "retake the test." No push notifications — email is the only notification channel in this product.
- **Bracket language never appears as an age label to the caregiver.** Internally the value is `8-12`; the caregiver sees "activities matched to where [Child] is now." A caregiver of a chronologically 11-year-old seeing "8–12" reads it as a developmental verdict, which it is not.

---

## 12. Future Validation Plan (Explicitly Not Yet Validated)

This instrument is a **placement/screening tool for an app**, and at launch it has **no established reliability or validity data**. The following plan describes how it could be evaluated later — it does not claim any of this has been done yet.

1. **Content validity:** Expert panel review (licensed SLPs, developmental pediatricians) rating each item for domain relevance and clarity, using a structured rating form (e.g., a content validity index).
2. **Internal consistency (reliability):** Once sufficient response data exists, compute Cronbach's alpha per domain to check whether items within a domain move together.
3. **Test–retest reliability:** Re-administer to a caregiver sample within a 1–2 week window (short enough that true development shouldn't have changed) and compute correlation between administrations.
4. **Inter-rater considerations:** Where feasible, compare two caregivers of the same child (e.g., both parents) to estimate agreement, acknowledging this instrument is inherently informant-based.
5. **Convergent/concurrent validity:** With informed consent and IRB oversight, compare this tool's domain scores against results from an independent licensed SLP evaluation using standard clinical measures, to see whether scores correlate in the expected direction — **not** to claim equivalence.
6. **Predictive/utility validity:** Track whether children placed in a given phase show expected progression velocity in-app, to evaluate whether the phase-mapping logic is actually useful for placement (a product-utility question, distinct from diagnostic validity).
7. **Sensitivity to change:** Confirm that domain scores meaningfully shift across reassessment intervals when a caregiver reports skill growth, and don't move when no real change occurred (test for floor/ceiling effects).
8. **Bias and fairness review:** Analyze score distributions across languages spoken at home, socioeconomic proxies, and child gender to check for systematic scoring bias, adjusting item wording or weighting as needed.
9. **Override-rate analysis (new in v2.0.0):** Analyze `placement_overrides` for directional bias. If caregivers systematically override upward or downward at a particular phase boundary, that is direct evidence the phase mapper is mis-calibrated at that boundary — and it is evidence the product generates for free, from real users, without a separate study.
10. **Bracket-assignment validity (new in v2.0.0):** Check whether children assigned a bracket at onboarding are subsequently promoted by the transition rule at a plausible rate. This shares instrumentation with the curriculum's own Threshold Validation Trigger (§13.5) — if no child in the first 50 ever clears all three gates, that is as much a signal about the onboarding assignment being too generous as about the gates being too strict.
11. **External advisory oversight:** Establish a clinical advisory board (SLPs, at minimum) to review scoring/phase-mapping logic changes on an ongoing basis, not just at launch.
12. **Transparent versioning:** Any change to item wording, scoring weights, or phase-mapping thresholds gets a new `schema_version`; any change to curriculum content, session structure, or scoring scales gets a new `curriculum_version`. Historical scores and sessions are tagged with the versions that produced them, so validation work is always tied to a specific, frozen pair.

Until steps like these are completed, all in-app and marketing language should describe this tool as "not a validated clinical measure" and "a screening and placement tool only."

---

## 13. Curriculum Alignment Contract

**This section is the single source of truth for every value shared between the Compass and the curriculum.** If a number appears both here and somewhere else in either document, this section wins. Implement these as constants in one module; do not re-type them.

### 13.1 Progression Constants (owned by the curriculum, consumed by both)

| Constant | Value | Notes |
|---|---|---|
| `PASS_MARK_PERCENT` | 75 | Applies to **every** phase, not only Phase 1. The curriculum's phase tables reference "the pass mark" without restating it; the Scoring Reference appendix confirms 75% is global. |
| `PASS_WINDOW_SESSIONS` | 3 | Consecutive sessions. |
| `ADVANCE_CONDITION` | mean `score_percent` ≥ 75 across the window | |
| `REPEAT_CONDITION` | below pass mark → retake, **lowest-scoring session first**, ascending | The order matters and is easy to get backwards. |
| `SIMPLIFY_CONDITION` | still below pass mark after retake → Simplified Session | Every phase has one. |
| `SESSION_TIMER_INTERVAL_SECONDS` | 15 | RL countdown interval. |

### 13.2 Canonical Phase Identity

`phase_number` (1–12) is the **only** identifier used in code, database columns, API payloads, and analytics. PECS sub-numbers are display labels only and must never be used as keys.

| `phase_number` | Canonical Name | PECS label (display only) | Scoring scale (§13.6) |
|---|---|---|---|
| 1 | Joint Attention Activities | — | base_support |
| 2 | Imitation Training | — | base_support |
| 3 | Oral Motor Exercises | — | base_support |
| 4 | PECS Phase 1: How to Communicate | PECS 1 | base_support |
| 5 | PECS Phase 2: Distance and Persistence | PECS 2 | base_support |
| 6 | PECS Phase 3: Picture Discrimination | PECS 3 | pecs3_discrimination |
| 7 | PECS Phase 4: Sentence Structure | PECS 4 | base_support + attribute bonus |
| 8 | PECS Phase 5: Responsive Requesting | PECS 5 | pecs5_latency |
| 9 | PECS Phase 6: Commenting | PECS 6 | base_support + stem bonus |
| 10 | Turn-Taking and Social Interaction Games | — | turn_taking |
| 11 | Functional Communication in Daily Routines | — | base_support |
| 12 | Vocal Approximation and Sound Shaping | — | base_support + approximation bonus |

**The trap this table exists to prevent:** "Phase 3" means Oral Motor Exercises. "PECS Phase 3" means Picture Discrimination, which is `phase_number` 6. Any variable named `phase` that could hold either is a bug waiting to happen.

### 13.3 Age Bracket Assignment (owned by the Compass)

Brackets are the curriculum's own labels and overlap by design. Onboarding assignment is deterministic and non-overlapping:

| Chronological age at onboarding | Assigned `age_bracket` |
|---|---|
| 36–95 months (3;0 – 7;11) | `3-7` |
| 96–155 months (8;0 – 12;11) | `8-12` |
| 156–179 months (13;0 – 14;11) | `10-14` |
| < 36 or ≥ 180 months | Out of range — no placement (§1) |

A 10-, 11-, or 12-year-old therefore **starts** in `8-12` even though `10-14` also nominally contains their age. Starting in the lower bracket and letting the transition rule promote is the conservative direction: an under-pitched activity is recoverable in three sessions, an over-pitched one costs engagement.

**Phases with only two variants.** Some phases (Phase 2 Session 5, Phase 10 Session 3) present variants labelled `3-7` and `8-14` rather than the three-way split. Resolution: `8-14` is a **presentation grouping, not a fourth bracket**. It is never stored. A child in either `8-12` or `10-14` is served the `8-14` variant for those specific sessions, and their stored bracket is unchanged. Content files should mark these sessions `variants: ["3-7", "8-14"]` and the resolver maps `8-12` → `8-14` and `10-14` → `8-14`.

### 13.4 Chronological Age Floors (Promotion Caps)

| Transition | Floor | Meaning |
|---|---|---|
| `3-7` → `8-12` | 84 months (age 7;0) | Next variant's nominal start age minus 1 year |
| `8-12` → `10-14` | 108 months (age 9;0) | Next variant's nominal start age minus 1 year |
| `10-14` → — | n/a | Terminal bracket; `age_floor_next_bracket_months` is NULL |

If a child clears all three gates while below the floor, the RL holds them and surfaces to the caregiver that the child is performance-ready and waiting only on the age floor. It does not silently do nothing.

### 13.5 Age-Bracket Transition Gates (owned by the curriculum, evaluated by the RL)

| Gate | Threshold | Evaluated over |
|---|---|---|
| Gate 1 — Average Score | mean `score_percent` ≥ **85%** | The 3-session window |
| Gate 2 — Stable Independence | top-tier unprompted trial share ≥ **70%** in **every** session | Each session individually, **not** the mean |
| Gate 3 — No Retakes | **zero** retakes | The 3-session window |
| Firing rule | All three must pass on the same window | |
| Cooldown | 3 sessions after firing | |
| Step size | Exactly one bracket per firing | |

**Gate 2 is the one most likely to be implemented wrong.** It is a minimum across the window, not a mean. `MIN(top_tier_trial_share) >= 0.70`, never `AVG(...)`. A mean would let one strong session carry two weak ones, which is precisely the noise the gate exists to filter.

All three thresholds are **launch defaults, not clinically validated**. Instrument every evaluation, including near-misses (2 of 3 gates passing) — that is what `age_bracket_transitions` is for. **Validation trigger:** if, after the first 50 children reach a 3-session window, none ever clears all three gates together, the thresholds are too strict and must be revisited before SLP sign-off. A rule that never fires is equivalent to no rule.

**Downward movement:** never automatic, never bracket-wide. A per-activity advisory fires when `score_percent` on one specific activity stays clearly below that child's own established baseline for that activity across 5–6 sessions. It surfaces a note; the caregiver decides. Stored in `bracket_downward_advisories`.

### 13.6 Scoring Scales (owned by the curriculum's Scoring Reference appendix)

Every trial produces a `score_percent` on 0–100 so all phases stay comparable in `phase_history`, but the underlying tiers differ by phase.

**Base scale — level of support** (phases 1, 2, 3, 4, 5, 7, 9, 11, 12):

| Points | Tier |
|---|---|
| 100 | Independent — spontaneous, no prompt of any kind |
| 75 | Verbal prompt — spoken cue only, no gesture or touch |
| 50 | Gestural/visual prompt |
| 25 | Physical prompt — hand-over-hand |
| 0 | No response |

Note the ordering: gestural/visual counts as *more* support than verbal, because visual cues are introduced earlier and faded later. This is counterintuitive if you assume "verbal = more intrusive" and is worth a code comment.

**Exception scale — Phase 6, PECS 3 discrimination:** 100 correct first attempt / 75 self-corrected / 25 caregiver-corrected via the 4-step procedure / 0 position-based selection. *(No 50 tier.)*

**Exception scale — Phase 8, PECS 5 latency:** 100 spontaneous 0–5s / 75 delayed 6–15s / 25 prompted / 0 no response >15s. *(No 50 tier.)*

**Exception scale — Phase 10, turn-taking compliance:** 100 independent / 75 prompted wait / 0 turn theft / 0 session abandonment. Turn theft and abandonment both score 0 but are logged as distinct `zero_reason` values so caregivers can tell grabbing from disengagement.

**Bonus mechanisms** (additive, only on trials already above 0%):

| Phase | Bonus | Rule |
|---|---|---|
| 9 (PECS 6) | Correct stem selection | +10 capped at 100; incorrect stem −10 **floored at 50**, so a spontaneous exchange with the wrong stem never scores below a prompted exchange with the right one |
| 12 | Closer approximation | +10 on Imitated Vocal Attempt (base 25) trials that exceed the child's **rolling baseline** — the most frequent step across their last 5 attempts at that sound, not merely the previous attempt |
| 7 (PECS 4) | Attribute expansion | +10 capped at 100 for a spontaneously added correct attribute card. No penalty tier — not using an attribute is not an error |

`is_top_tier` for Gate 2 means the trial reached the scale's **top tier unprompted** (base 100), before any bonus. A trial that reaches 100 only via bonus is not top-tier.

### 13.7 Ownership Summary

| Concern | Owner | Consumer |
|---|---|---|
| Domain scores, confidence, phase recommendation | Compass | RL engine (read-only) |
| Starting bracket, age floor, second-adult flag | Compass | RL engine (read-only) |
| Pass mark, advance/repeat/simplify | Curriculum | RL engine |
| Per-trial and per-session `score_percent` | Curriculum scales, RL engine computes | Compass (reassessment context only) |
| Bracket transitions after onboarding | RL engine | Compass never writes brackets after onboarding |

The one-way arrow matters: **the Compass writes the starting bracket once and never again.** If a reassessment is run later, it must not overwrite `children.age_bracket`, because by then the transition rule may have legitimately moved the child. A reassessment updates phase recommendation and domain scores only.

---

## 14. Open Items Requiring a Decision

These are the places where the two documents genuinely disagreed and I made a judgement call, or where the curriculum itself is still unresolved. Each is isolated so it can be reversed cheaply.

1. **Minimum supported age set to 3;0.** *(Decision made here; reversible.)* Driven by the curriculum having no content below age 3. The alternative is commissioning a 0–3 content track and keeping v1.0.0's Bands A and B. If Verbly is meant to serve toddlers, this is the biggest single content gap in the product.
2. **Maximum supported age set to 14;11.** Same reasoning, upper end.
3. **Three brackets across 3–14 may be too coarse for assessment items.** A 3-year-old and a 7-year-old sit in the same bracket. The curriculum accepts this coarseness for activity variants, but assessment items are more age-sensitive than activities. Options: sub-bands within `3-7` for item selection only (bracket stays one value), or accept the coarseness at launch and revisit after item-level data exists.
4. **Curriculum still contains an orphan `8-14` grouping.** Phase 2 Session 5 and Phase 10 Session 3 use a two-way split (`3-7` / `8-14`) while the Age-Bracket Transition Rule is written entirely around the three-way split. §13.3 resolves this as a presentation grouping. The cleaner fix is to split those sessions into three variants in the curriculum file so there is exactly one age scheme in the product.
5. **Curriculum's Global Scoring table still carries Phase-1-specific language.** The "Scoring Basis" row in the *Global* Scoring & Progression Rules table describes gaze shifts and joint attention moments — a Phase 1 measure sitting in a global table. The Scoring Reference appendix supersedes it, but the row should be edited to say "see Appendix — Scoring Reference" so a developer reading top-down doesn't implement gaze-shift counting for all twelve phases.
6. **SLP dashboard access model.** Read-only, per-child, manually granted for the dissertation cohort. Enough for the test cohort; not a product-grade flow. Worth naming explicitly in the dissertation's limitations rather than leaving implicit.
7. **`age_weight_factor` values are still unset.** §5.2 defines the mechanism and the 0.85–1.15 range but the per-domain, per-bracket constants are clinical-team estimates that don't yet exist. Until they do, ship with all factors at 1.000 and log that fact in `compass_domain_scores.age_adjustment_factor` — an explicit 1.000 is honest; a silently absent adjustment is not.
8. **Reassessment interval is a flat "6 weeks".** The curriculum suggests Phase 1 typically takes 4–8 weeks. Consider making the interval phase-aware rather than constant.

---

## Summary of Originality Safeguards Built Into This Design

- Every item above was authored fresh for this document, using plain caregiver-facing scenarios rather than any published item stems.
- The 0–4 point normalization, the age-adjustment factor, the weighted overall score formula, and the confidence formula are original constructions for this product.
- The 12-phase decision tree and prerequisite map were built by reasoning about plausible skill sequencing for *this specific* 12-phase curriculum, not lifted from any external curriculum or assessment.
- The bracket assignment rule, age floors, and the Compass→RL handoff contract in §13 are original to this product.
- No item, scoring table, or normative claim from PLS-5, CELF, REEL, Rossetti, VB-MAPP, ABLLS-R, EOWPVT/ROWPVT, GFTA, CASL, or any other proprietary instrument was referenced, reproduced, or paraphrased in producing this document.
