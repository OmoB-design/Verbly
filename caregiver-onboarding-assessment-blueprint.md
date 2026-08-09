# Communication Compass™ — Caregiver Onboarding Assessment
## Original Blueprint for an Adaptive Speech & Language Screening Instrument

**Document purpose:** This is a complete design specification for a brand-new, non-diagnostic, caregiver-completed onboarding instrument. Every item, scoring rule, and label below was written from scratch for this product. It is organized around the developmental domains that speech-language pathology (SLP) has treated as foundational for decades (receptive/expressive language, speech sound development, social communication, play, etc.), but the wording, response formats, scoring math, and phase-mapping logic are original to this product and are not copied or adapted from any published or proprietary instrument.

---

## 0. Guardrails That Apply to Every Layer of This Document

These statements must appear in the product (not just this design doc):

- **Screening, not diagnosis.** "This tool estimates your child's current communication skills to personalize their activities. It does not diagnose autism, developmental language disorder, apraxia of speech, or any other condition."
- **Not a substitute for professional evaluation.** "A licensed Speech-Language Pathologist (SLP) is the only professional who can diagnose a communication disorder. If you have concerns, please share these results with one."
- **Mandatory referral triggers.** Certain caregiver reports (defined in §7) must always surface a "Please talk to a professional" message, regardless of the computed score, and must never be suppressed by the scoring engine.
- **Living instrument.** "This assessment is regularly reviewed and refined. It is a placement tool for this app, not a validated clinical measure" (see §12 for the validation roadmap).

---

## 1. Assessment Blueprint (High-Level Architecture)

| Layer | Purpose |
|---|---|
| **Intake** | Child's age in months, birth history flags, primary language(s) spoken at home, prior services (optional, for context only — not scored) |
| **9 Domain Modules** | Receptive Language, Expressive Language, Speech Sound Development, Social Communication, Functional Communication, Play Skills, Learning Readiness, Oral-Motor/Feeding Screen, Milestone Checklist |
| **Red-Flag Sweep** | A short set of always-shown questions that can trigger referral regardless of score |
| **Scoring Engine** | Converts raw answers into 0–100 domain scores + overall score + confidence |
| **Phase Mapper** | Converts scores into a recommended starting Phase (1–12) with rationale |
| **Output Layer** | JSON payload consumed by the RL engine; human-readable summary for the caregiver |

**Administration:** Untimed, self-paced, mobile-first. Estimated completion: 8–12 minutes. Branching logic skips modules that are clearly not age-relevant (e.g., two-word combination questions are skipped for a 10-month-old and auto-scored as "not yet expected").

**Age-banding:** Because a 14-month-old and a 4-year-old cannot be measured on the same yardstick, every domain module has three item sets:
- **Band A: 0–18 months**
- **Band B: 19–36 months**
- **Band C: 37–60+ months**

The caregiver only ever sees the band matching the child's age, so the survey never feels irrelevant or condescending.

---

## 2. Domain Definitions (Original Operational Definitions)

These are working definitions written for this product — plain-language operationalizations of concepts that are standard across the SLP field, not quotations from any source.

1. **Receptive Language** — the child's observable ability to understand words, directions, and routines without relying on gesture or context cues alone.
2. **Expressive Language** — the child's observable output, from pre-verbal vocalizing through connected sentences, used to convey meaning.
3. **Speech Sound Development** — how clear the child's speech attempts are to familiar and unfamiliar listeners, and how many distinct sounds the child attempts (screening-level only; not a phonetic inventory).
4. **Social Communication** — the child's use of eye gaze, gesture, and turn-taking to connect with another person before or alongside words.
5. **Functional Communication** — however the child currently gets a need met, whether that's crying, pulling, pointing, an AAC device, signs, or words. This domain deliberately treats all of these as valid communication, not just spoken words.
6. **Play Skills** — how the child interacts with toys and people during play, from exploring objects up through pretend scenarios.
7. **Learning Readiness** — behavioral/attentional prerequisites for structured teaching: sitting tolerance, imitation, response to praise/rewards, and transitions.
8. **Oral-Motor/Feeding Screen** — caregiver-observed feeding and mouth-movement patterns, gathered only to flag when a feeding/oral-motor referral may be warranted. This section never scores into the communication phase recommendation.
9. **Developmental Milestone Checklist** — a short set of age-referenced yes/no items used only to sanity-check the domain scores (see §5.4).

---

## 3. Original Item Bank (Representative Samples per Domain)

Below are representative items per domain/band. In production this expands to a full item bank (12–18 items per domain per band), but the structure, phrasing style, and response format shown here are final.

### 3.1 Receptive Language

**Band A (0–18 mo)**
- "When you say your child's name, how often do they turn or look toward you?" *(Never / Rarely / Sometimes / Often / Always)*
- "If you say 'no' in a firm voice, does your child pause or change what they're doing?" *(Not yet / Sometimes / Often / Almost always)*
- "Can your child find a family member when asked, 'Where's Daddy/Mommy/Grandma?' by looking or crawling toward them?"

**Band B (19–36 mo)**
- "If you say 'Put the ball in the box,' does your child do it without you pointing or showing them?"
- "Can your child point to at least 5 body parts when you name them (e.g., 'Where's your nose?')?"
- "If you say, 'First wash hands, then eat,' does your child attempt both steps in order?" *(This screens two-step direction-following.)*

**Band C (37–60+ mo)**
- "If you ask, 'What do you do when you're tired?' does your child give a relevant answer (e.g., 'sleep')?"
- "Can your child follow a direction with a location and an object, like 'Put your shoes by the door'?"
- "After hearing a short 3–4 sentence story, can your child answer one simple 'what happened' question about it?"

### 3.2 Expressive Language

**Band A**
- "How often does your child make different sounds (not crying) to get your attention — like 'ba,' 'da,' or a squeal?"
- "Does your child use any consistent sound or gesture to mean the same thing every time (e.g., always reaches up for 'up')?"
- "Has your child said any clear first word used on purpose (not just once), like 'mama' meaning Mom specifically?"

**Band B**
- "Does your child put two words together on their own, like 'more juice' or 'mommy go'?"
- "When your child wants something, do they usually tell you with a word or short phrase, rather than only crying or pulling you?"
- "Does your child comment on things without being asked, like pointing at a dog and saying 'dog!' or 'big dog'?"

**Band C**
- "Does your child use short sentences of 4+ words, like 'I want the red one'?"
- "Can your child tell you about something that happened earlier today, in a few connected sentences?"
- "Does your child ask questions using words like 'what,' 'where,' or 'why'?"

### 3.3 Speech Sound Development *(screening only — no diagnostic claims)*

**All bands**
- "When your child talks, how much of it can YOU understand?" *(Almost none / Some / About half / Most / Nearly all)*
- "When your child talks, how much can an unfamiliar adult (not you) usually understand?"
- "Can your child copy simple sounds or sound-play when you model them (e.g., 'moo,' 'vroom,' 'pop')?"
- "Roughly how many different consonant sounds does your child attempt in words (even if not perfectly clear)? Rough guess is fine." *(Fewer than 3 / A few / Several / Most expected sounds)*

### 3.4 Social Communication

**All bands, examples**
- "When you call your child's name from across the room, do they look at you?"
- "Does your child look back and forth between you and something interesting, like showing you a toy?" *(joint attention)*
- "Does your child point at things to share interest — not just to request something?"
- "Does your child copy simple actions you do, like clapping or waving?"
- "In play, does your child take a 'turn' and then wait for yours (like rolling a ball back and forth)?"
- "Does your child start interactions with you (bringing a toy, tapping you, making a sound to get your attention) rather than only responding when you start them?"

### 3.5 Functional Communication

- "When your child wants something out of reach, what do they usually do?" *(Cry/fuss only / Pull you to it / Point or gesture / Use a picture, sign, or device / Use words)*
- "Does your child have a reliable way to say 'yes' and 'no' — with words, signs, gestures, or a device?"
- "If your child is upset, can you usually tell what they want or need from how they communicate?"

### 3.6 Play Skills

- "Does your child make toys 'do something' repeatedly, like pushing a button to hear a sound?" *(cause-effect)*
- "Does your child use toys the way they're meant to be used, like rolling a car or stacking blocks?" *(functional play)*
- "Does your child pretend — like feeding a doll, talking on a toy phone, or stirring an empty pot?" *(symbolic/pretend play)*
- "Can your child play a simple pretend game WITH another person, building on what the other person does?" *(shared/social pretend play)*

### 3.7 Learning Readiness

- "About how long can your child stay engaged in one activity with you before wanting to leave?" *(Under 1 min / 1–2 min / 3–5 min / 5+ min)*
- "When you demonstrate an action and ask your child to copy it, do they attempt it?"
- "Can your child sit for a short structured activity (puzzle, book, table task) with support?"
- "Does your child respond to praise or a small reward by repeating the behavior that earned it?"
- "How does your child usually handle switching from one activity to another?" *(Very hard / Somewhat hard / Manageable / Easy)*

### 3.8 Oral-Motor / Feeding Screen *(never scored into phase placement — flags only)*

- "Do you notice frequent drooling beyond what's expected for your child's age?"
- "Does your child have noticeable difficulty chewing age-appropriate foods?"
- "Have you noticed difficulty moving the tongue side-to-side or lifting it (e.g., to lick lips)?"
- "Does your child have trouble closing their lips fully around a spoon, cup, or straw?"
- "Can your child blow (e.g., bubbles, a pinwheel, blow out a candle) with an open mouth shape?"
- "Any coughing, gagging, or choking during regular meals?" *(always a hard red flag if "yes")*

### 3.9 Milestone Checklist (cross-check only, see §5.4)

Short yes/no list of 6–8 age-referenced items per band (e.g., Band B: "uses at least 20 different words," "combines two words," "walks independently," "points to request"). Used only to sanity-check domain scoring, not scored as its own domain in the RL output.

---

## 4. Question Types Used

- **Frequency scale (5-point):** Never → Rarely → Sometimes → Often → Always
- **Behavioral quantity scale (4-point):** Not yet → Sometimes → Often → Almost always
- **Forced-choice "how does your child usually communicate this":** ranked, mutually exclusive options reflecting a hierarchy from pre-symbolic to symbolic communication
- **Milestone yes/no checklist**
- **Scenario-based item:** short caregiver-relatable scenario followed by a behavioral question
- **Open-ended free text (optional, unscored):** "Anything else you'd like us to know?" — reviewed by a human if flagged, never auto-scored

All items are written at approximately a 6th-grade reading level (short sentences, common words, one idea per question, no clinical jargon). A caregiver-facing glossary defines any term that can't be avoided (e.g., "gesture").

---

## 5. Original Scoring Algorithm

This scoring model was built specifically for this product. It is **not** a copy of any published rubric.

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

### 5.2 Domain Score Calculation

For a given domain *d* with *n* answered items:

```
domain_raw(d) = sum(item_points) / (n_answered * 4)   → a 0.0–1.0 fraction
domain_score(d) = round(domain_raw(d) * 100)           → 0–100 scale
```

**Age-expectation adjustment.** Each item carries a design-time "typical range" weight (Low/Typical/Advanced for the child's age band) set by the clinical design team. This produces an **Age-Adjusted Domain Score**:

```
adj_domain_score(d) = domain_score(d) * age_weight_factor(d, age_band)
```

Where `age_weight_factor` is a normalization constant (0.85–1.15) that keeps scores comparable across the three age bands, calibrated during the validation phase (§12) rather than hard-coded arbitrarily at launch — initial values are clinical-team estimates, explicitly labeled as provisional in internal documentation.

### 5.3 Overall Communication Readiness Score

```
overall_score = weighted_average(
    receptive_language      × 0.20,
    expressive_language     × 0.20,
    speech_sound            × 0.10,
    social_communication    × 0.20,
    functional_communication× 0.15,
    play                    × 0.10,
    learning_readiness      × 0.05
)
```

(Oral-motor/feeding and the milestone checklist are excluded from this weighted average — they are flag/cross-check layers, not scored inputs to placement.)

### 5.4 Confidence Score

Confidence is **not** a measure of clinical certainty — it reflects data completeness and internal consistency:

```
completeness = items_answered / items_total
consistency  = 1 - (variance across domain scores that milestone-checklist cross-checks would predict should move together)
confidence   = round((0.6 * completeness + 0.4 * consistency), 2)   → 0.00–1.00
```

If `confidence < 0.6`, the app UI shows: "We'd like a bit more information to personalize this confidently," and offers a short supplemental question set before finalizing placement.

### 5.5 Strengths / Needs Extraction

```
strengths = domains where adj_domain_score >= 65, ranked descending, top 3
needs     = domains where adj_domain_score <= 45, ranked ascending, top 3
```

---

## 6. Phase Recommendation Engine

### 6.1 Phase Prerequisite Map (Original Mapping Logic)

Each of your 12 phases is mapped to a primary domain driver and a prerequisite score band. This mapping was constructed by reasoning about skill sequencing (e.g., joint attention typically precedes symbolic requesting; imitation typically precedes structured picture exchange), not copied from any external curriculum.

| Phase | Name | Primary Driver Domain(s) | Typical Entry Condition |
|---|---|---|---|
| 1 | Joint Attention | Social Communication | social_communication < 35 |
| 2 | Imitation | Learning Readiness + Social Communication | learning_readiness < 40 OR imitation-items low, with social_communication ≥ 35 |
| 3 | Oral-Motor Foundations | Speech Sound + Oral-Motor flags | oral-motor flags present AND speech_sound < 30 |
| 4 | Functional Picture Exchange | Functional Communication | functional_communication < 40, with basic imitation present |
| 5 | Distance & Persistence | Functional Communication | functional_communication 40–55, exchange skill present but inconsistent |
| 6 | Picture Discrimination | Receptive Language + Functional Communication | functional_communication ≥ 55, receptive_language 35–55 |
| 7 | Sentence Building | Expressive Language | expressive_language 35–55, single words present |
| 8 | Responsive Communication | Receptive Language + Social Communication | receptive_language ≥ 55, social_communication 40–60 |
| 9 | Commenting | Expressive Language + Social Communication | expressive_language ≥ 55, spontaneous requesting present |
| 10 | Turn-Taking & Social Interaction | Social Communication | social_communication ≥ 60, expressive_language ≥ 45 |
| 11 | Functional Daily Communication | Functional Communication + Expressive Language | functional_communication ≥ 65 AND expressive_language ≥ 55 |
| 12 | Emerging Speech & Vocal Approximation | Speech Sound | speech_sound < 40 AND other domains ≥ 55 (speech is the isolated gap) |

### 6.2 Decision Tree (Simplified Text Form)

```
START
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
 └─ ELSE ──▶ candidate = Phase closest to overall_score midpoint,
             flagged for a short readiness module before final placement
```

*Note: multiple conditions can be true simultaneously (a real child rarely fits one box). The engine evaluates conditions in the fixed priority order above — foundational/prerequisite skills (joint attention, imitation, oral-motor) are checked first, since a child with strong expressive language but no joint attention should still start at Phase 1, not skip ahead.*

### 6.3 "Start Here vs. Readiness Module First" Rule

```
IF confidence >= 0.75 AND candidate phase prerequisite gap is small (within 10 points of threshold):
    → "Begin directly at Phase X"
ELSE IF confidence < 0.75 OR candidate phase prerequisite gap is large (>10 points below threshold):
    → "Complete a short 5-item readiness check for Phase X before starting"
```

### 6.4 Reasoning Narrative Generator

For every placement, the engine assembles a plain-language explanation from a template bank, e.g.:

> "We're starting [Child] at **Phase [X]: [Name]**. This is because [primary driver domain] scored in the [range] range, which is the main skill this phase builds. [Child] is already showing strength in [top strength domain], which will help. We'll check in on [primary need domain] as they move through this phase."

Reasoning arrays in the JSON output (§8) contain 2–4 such generated sentences, each tied to specific score inputs — never a generic canned phrase.

---

## 7. Red-Flag / Referral Logic

These are checked independently of scoring and **always** override the "everything looks great" framing when present, though they never block a placement from being generated.

**Hard flags (always trigger an immediate "talk to a professional" message):**
- Caregiver reports loss of previously acquired words or skills (regression)
- No response to loud sounds/name across repeated attempts
- Coughing, gagging, or choking during regular meals
- No babbling or vocalizing by the age the intake flow expects it
- No pointing or other communicative gesture by 18 months
- No words at all by 24 months
- Caregiver free-text response contains explicit concern language (routed to human review)

**Soft flags (appended as a gentle note, not urgent):**
- Multiple domains scoring in the lowest band simultaneously
- Confidence score persistently low across two consecutive assessments

Hard flags generate this exact category of message (not diagnostic, always paired with the placement): *"Some of what you shared is worth discussing with an SLP or your pediatrician soon. We'll still get [Child] started with personalized activities today, and this is something to bring up alongside that."*

---

## 8. JSON Output Schema

```json
{
  "assessment_id": "string (uuid)",
  "child_id": "string (uuid)",
  "completed_at": "ISO-8601 timestamp",
  "age_band": "A | B | C",
  "age_months_at_assessment": "integer",
  "overall_score": "integer 0-100",
  "confidence": "float 0.00-1.00",
  "domain_scores": {
    "receptive_language": "integer 0-100",
    "expressive_language": "integer 0-100",
    "speech_sound": "integer 0-100",
    "social_communication": "integer 0-100",
    "functional_communication": "integer 0-100",
    "play": "integer 0-100",
    "learning_readiness": "integer 0-100"
  },
  "oral_motor_flags": ["array of strings, e.g. 'drooling', 'chewing_difficulty'"],
  "milestone_crosscheck": {
    "expected_for_age": "integer count",
    "observed": "integer count",
    "consistent_with_domain_scores": "boolean"
  },
  "recommended_phase": "integer 1-12",
  "placement_mode": "start_directly | readiness_module_first",
  "reasoning": [
    "string",
    "string",
    "string"
  ],
  "strengths": ["array of domain names, ranked"],
  "needs": ["array of domain names, ranked"],
  "next_skills": ["array of short skill-target strings for the RL engine"],
  "red_flags": {
    "hard": ["array of strings"],
    "soft": ["array of strings"]
  },
  "referral_recommended": "boolean",
  "suggested_reassessment_interval": "string, e.g. '6 weeks'",
  "schema_version": "string, e.g. '1.0.0'"
}
```

### Example Populated Response

```json
{
  "assessment_id": "a1c9f2e0-...",
  "child_id": "b77e441a-...",
  "completed_at": "2026-07-17T14:32:00Z",
  "age_band": "B",
  "age_months_at_assessment": 27,
  "overall_score": 61,
  "confidence": 0.87,
  "domain_scores": {
    "receptive_language": 71,
    "expressive_language": 32,
    "speech_sound": 27,
    "social_communication": 58,
    "functional_communication": 44,
    "play": 75,
    "learning_readiness": 84
  },
  "oral_motor_flags": [],
  "milestone_crosscheck": {
    "expected_for_age": 8,
    "observed": 6,
    "consistent_with_domain_scores": true
  },
  "recommended_phase": 4,
  "placement_mode": "start_directly",
  "reasoning": [
    "Functional communication scored 44, in the range where structured picture exchange is the highest-leverage next skill.",
    "Learning readiness scored 84, which is a strength that supports learning a new structured routine quickly.",
    "Receptive language is comparatively strong (71), so we'll pair the exchange system with simple spoken directions."
  ],
  "strengths": ["learning_readiness", "play", "receptive_language"],
  "needs": ["speech_sound", "expressive_language", "functional_communication"],
  "next_skills": ["single_picture_exchange", "requesting_across_2_partners"],
  "red_flags": { "hard": [], "soft": [] },
  "referral_recommended": false,
  "suggested_reassessment_interval": "6 weeks",
  "schema_version": "1.0.0"
}
```

---

## 9. Database Schema (Relational, Original Design)

```sql
CREATE TABLE children (
    child_id UUID PRIMARY KEY,
    caregiver_id UUID NOT NULL REFERENCES caregivers(caregiver_id),
    birth_date DATE NOT NULL,
    primary_language VARCHAR(50),
    additional_languages TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE assessments (
    assessment_id UUID PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(child_id),
    age_band CHAR(1) CHECK (age_band IN ('A','B','C')),
    age_months_at_assessment INT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    overall_score SMALLINT CHECK (overall_score BETWEEN 0 AND 100),
    confidence NUMERIC(3,2) CHECK (confidence BETWEEN 0 AND 1),
    recommended_phase SMALLINT CHECK (recommended_phase BETWEEN 1 AND 12),
    placement_mode VARCHAR(30),
    referral_recommended BOOLEAN DEFAULT FALSE,
    suggested_reassessment_interval VARCHAR(20),
    schema_version VARCHAR(10),
    raw_payload JSONB NOT NULL
);

CREATE TABLE domain_scores (
    id UUID PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES assessments(assessment_id),
    domain_name VARCHAR(40) NOT NULL,
    score SMALLINT CHECK (score BETWEEN 0 AND 100),
    age_adjustment_factor NUMERIC(4,3)
);

CREATE TABLE item_responses (
    id UUID PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES assessments(assessment_id),
    item_id VARCHAR(20) NOT NULL,   -- e.g. "REC-B-04"
    domain_name VARCHAR(40) NOT NULL,
    raw_response VARCHAR(50) NOT NULL,
    scored_points SMALLINT CHECK (scored_points BETWEEN 0 AND 4)
);

CREATE TABLE red_flags (
    id UUID PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES assessments(assessment_id),
    flag_type VARCHAR(10) CHECK (flag_type IN ('hard','soft')),
    flag_code VARCHAR(50) NOT NULL,
    reviewed_by_human BOOLEAN DEFAULT FALSE
);

CREATE TABLE phase_history (
    id UUID PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(child_id),
    assessment_id UUID NOT NULL REFERENCES assessments(assessment_id),
    phase SMALLINT NOT NULL,
    entered_at TIMESTAMPTZ DEFAULT now(),
    exited_at TIMESTAMPTZ
);
```

---

## 10. API Response Format

**Endpoint:** `POST /v1/assessments/{assessment_id}/score`

**Response:** `200 OK`, `Content-Type: application/json`, body = the schema in §8.

**Error cases:**
| Status | Condition |
|---|---|
| 422 | Incomplete required items outside allowed skip logic |
| 409 | Assessment already scored (immutable once finalized) |
| 202 | Confidence below threshold — supplemental questions issued, no final score yet |

**Webhook:** `assessment.scored` fires to the RL engine with the full payload so Phase 1 content can be pre-loaded before the caregiver finishes onboarding.

---

## 11. UI Recommendations

- **Progress indicator by domain**, not by raw question count — caregivers tolerate length better when they see conceptual sections ("Play," "Talking," "Understanding") rather than "14 of 62."
- **One question per screen** on mobile; grouped 2–3 per screen on larger viewports.
- **Illustrative micro-copy under jargon-adjacent terms** (e.g., a one-line example under "gesture": "like waving, reaching, or pointing").
- **Save-and-resume** — caregivers of young children rarely finish a survey in one sitting.
- **Non-alarming results screen**: lead with strengths, use a warm visual (grow-chart style, not a clinical bar chart with red/green failure coloring), and present the phase placement as "where we'll start," not "your child's level."
- **Red-flag messaging is separated visually** from the score summary so it reads as care, not as a failing grade.
- **Re-assessment nudges** delivered as a natural check-in ("Let's see how things are going") rather than "retake the test."

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
9. **External advisory oversight:** Establish a clinical advisory board (SLPs, at minimum) to review scoring/phase-mapping logic changes on an ongoing basis, not just at launch.
10. **Transparent versioning:** Any change to item wording, scoring weights, or phase-mapping thresholds gets a new `schema_version`, with historical scores tagged to the version that produced them, so validation work is always tied to a specific, frozen version of the instrument.

Until steps like these are completed, all in-app and marketing language should describe this tool as "not a validated clinical measure" and "a screening and placement tool only."

---

## Summary of Originality Safeguards Built Into This Design

- Every item above was authored fresh for this document, using plain caregiver-facing scenarios rather than any published item stems.
- The 0–4 point normalization, the age-adjustment factor, the weighted overall score formula, and the confidence formula are original constructions for this product.
- The 12-phase decision tree and prerequisite map were built by reasoning about plausible skill sequencing for *this specific* 12-phase curriculum, not lifted from any external curriculum or assessment.
- No item, scoring table, or normative claim from PLS-5, CELF, REEL, Rossetti, VB-MAPP, ABLLS-R, EOWPVT/ROWPVT, GFTA, CASL, or any other proprietary instrument was referenced, reproduced, or paraphrased in producing this document.
