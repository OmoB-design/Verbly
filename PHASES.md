# PHASES.md

Technical breakdown of the 12-phase therapy curriculum as it should be implemented. This is a structural reference, not a copy of the clinical content itself — the actual session scripts, activity steps, and RL behavior live as versioned content records (see `CLAUDE.md` → *Content vs. code boundary*), not as prose in this file. What follows is what an engineer needs to know to build the engine that runs that content correctly.

Global rule for all 12 phases (see `README.md`): **75% pass mark across 3 consecutive sessions → advance. Below that → retake, lowest-scoring session first. Still below after retake → Simplified Session** (every phase now has one, as of the latest curriculum revision).

---

## Phase Index

| # | Name | Scoring model | Age variants | Simplified Session |
|---|---|---|---|---|
| 1 | Joint Attention Activities | Categorized (gaze-shift %, initiated joint attention count) | Yes — 3 age/interest variants + one all-ages variant for Session 3 | Yes |
| 2 | Imitation Training | Categorized: Spontaneous / Prompted / No-Response | Yes — age-adapted games in Fine Motor Session 5 | Yes |
| 3 | Oral Motor Exercises | Categorized: Spontaneous / Prompted / No-Response | No | Yes |
| 4 | PECS Phase 1 — Physical Picture Exchange | Categorized: Spontaneous / Gestural / Physical Prompt / No-Response | No | Yes |
| 5 | PECS Phase 2 — Distance & Persistence | Categorized | No | Yes |
| 6 | PECS Phase 3 — Picture Discrimination | Categorized, plus a distinct 4-step error-correction procedure | No | Yes |
| 7 | PECS Phase 4 — Sentence Structure | Categorized: Full / Partial / Prompted / Reversion-to-Single-Card | No | Yes (physical sentence strip retained, per locked decision) |
| 8 | PECS Phase 5 — Responsive Requesting | Categorized | No | Yes |
| 9 | PECS Phase 6 — Commenting | Categorized, plus bonus "correct stem selection" category | No | Yes |
| 10 | Turn-Taking & Social Interaction | Categorized | Yes — 3–7 and 8–14 bands, differing games *and* fading targets | Yes |
| 11 | Functional Communication in Daily Routines | Categorized, logs communication *method* (PECS/gesture/vocalization/AAC/gaze) | No | Yes |
| 12 | Vocal Approximation & Sound Shaping | Categorized, plus bonus "Closer Approximation" category; tracks a 5-step shaping curve per target sound | No | Yes |

---

## Phase 1 — Joint Attention Activities

**Clinical goal:** train gaze-shifting between object and caregiver's face — the foundational precursor to all communication and social learning.

**Structure:** 2 core sessions plus a Session 3 that branches into four content variants (Ages 3–7 Peek-a-Boo, Ages 8–12 Character Figure, Ages 10–14 Tablet Video, All-Ages Song/Music).

**Scoring basis:** % of opportunities with a spontaneous gaze shift (object → person) + count of child-initiated joint attention moments. This is the only phase whose scoring basis is defined directly in its overview table rather than a separate "Scoring Criteria" section — worth normalizing the documentation format, though not the underlying rule, if this file is later regenerated from source.

**Prompt hierarchy:** gentle physical tap/hand-over-hand → verbal cue ("Look!") → natural waiting.

---

## Phase 2 — Imitation Training

**Clinical goal:** teach the child to learn by copying — builds motor planning, sustained attention, and the foundation for language acquisition.

**Structure:** three skill areas run as separate session tracks — Gross Motor (1 session), Fine Motor (5 sessions: pointing, waving, touching nose, block stacking, age-adapted imitation games for ages 8–14), and Vocal Imitation (leads directly into Phase 3).

**Scoring:** Spontaneous Imitation (100% credit, independent copy, no physical guidance) / Prompted Imitation (partial credit, required hand-over-hand or physical prompt) / No Response (0%) — now consistent with the categorized model used everywhere else in the curriculum.

---

## Phase 3 — Oral Motor Exercises

**Clinical goal:** build awareness, coordination, and control of the lips, tongue, and jaw in preparation for speech sound production — bridges Phase 2's imitation work into PECS's communication work.

**Structure:** sessions organized by target sound group (bubble-blowing and /m/ /p/ /b/ in Session 1; tongue-placement warm-up and /t/ /d/ /l/ /n/ across Sessions 2–3), each with a "Sound Reference — what each sound requires" table.

**Scoring:** Spontaneous Imitation / Prompted Imitation / No Response — same categorized model as Phase 2, applied to mouth/tongue movement and sound attempts.

---

## Phase 4 — PECS Phase 1: Physical Picture Exchange

**Clinical goal:** the child's first functional communication exchange — hand over a picture card to request a preferred item.

**Structure:** Session 1 requires **two simultaneous caregiver roles** (Caregiver A = communication partner, speaks; Caregiver B = physical prompter, never speaks) — per the locked single-device decision, both roles are delivered through one device held by the primary caregiver, with the second person following on-screen/spoken instructions. Session 2 introduces a **5-level prompt-fading hierarchy** (Full hand-over-hand → Wrist → Elbow → Shoulder → None) logged per trial, with the RL using the trend to set the next trial's starting prompt level — this is richer than the pass/fail data most other phases produce and needs its own storage shape (a per-trial prompt-level log, not just a session-level score).

**Scoring:** Spontaneous / Gestural / Physical Prompt / No-Response.

---

## Phase 5 — PECS Phase 2: Distance & Persistence

**Clinical goal:** generalize the exchange across physical distance and caregiver attentiveness — child travels to get the communication book, and persists when the caregiver is initially inattentive.

**Structure:** 3 sessions of increasing difficulty (travel distance → seek an inattentive partner → tolerate delay/persistence).

---

## Phase 6 — PECS Phase 3: Picture Discrimination

**Clinical goal:** discriminate between multiple picture cards to request the *correct* item, not just any item.

**Notable mechanism:** a formal **4-step error-correction procedure** (Model → Prompt → Switch → Retry) — this is an in-trial recovery loop, distinct from the between-session retake/simplify logic, and should be modeled as its own state within a session rather than reusing the retake mechanism. Uses MSWO (multiple-stimulus-without-replacement) discrimination trials.

---

## Phase 7 — PECS Phase 4: Sentence Structure

**Clinical goal:** build a two-part sentence strip ("I want" + item card, later + attribute card) instead of a single-card exchange.

**Locked decision:** the sentence strip is **physical** (real velcro cards) — the app's role is narration, timing, and scoring, not rendering an on-screen interactive strip (see `DESIGN.md`). The Simplified Session keeps this physical too, simplifying by pre-attaching the "I want" card rather than by digitizing the interaction.

**Scoring:** introduces a fourth category not seen in earlier phases — **Reversion to Single Card** (0%), a distinct failure mode where the child regresses to earlier-phase behavior rather than simply failing to respond. Worth representing as its own enum value, not folded into "No-Response," since it's diagnostically different (regression vs. non-response).

---

## Phase 8 — PECS Phase 5: Responsive Requesting (Answering Questions)

**Clinical goal:** the child requests in response to a caregiver's question ("What do you want?"), not only spontaneously.

---

## Phase 9 — PECS Phase 6: Commenting

**Clinical goal:** the child comments on their environment ("I see...", "I hear...") rather than only requesting — the shift from requesting to social/descriptive communication, and the foundation for later conversation and turn-taking.

**Scoring:** adds a bonus category for correct sentence-starter/stem selection, on top of the standard categorized tiers.

---

## Phase 10 — Turn-Taking & Social Interaction Games

**Clinical goal:** reciprocal social exchange — waiting, alternating turns, tolerating another person's turn.

**Age variants:** ages 3–7 and 8–14 bands, which differ in **both** the game content *and* the prompt-fading target — this is a deeper branch than Phase 1's age variants (which only change content, not the fading target), and is one of the phases most affected by the age-band unification work described in `ARCHITECTURE.md`/`DATABASE.md`.

---

## Phase 11 — Functional Communication in Daily Routines

**Clinical goal:** generalize whatever communication method the child has developed (PECS, gesture, vocalization, AAC, or gaze) into real daily routines, across communication partners including siblings and other adults.

**Notable mechanism:** logs *which communication method* was used per instance, not just success/fail — this is a richer per-event data shape than a simple score, since the clinically interesting signal is generalization across methods and partners, not a percentage.

---

## Phase 12 — Vocal Approximation & Sound Shaping (Emerging Speech)

**Clinical goal:** shape vocal approximations toward real speech, using ABA differential-reinforcement/shaping principles.

**Notable mechanism:** tracks a **5-step shaping curve per target word/sound** — this is a longitudinal, per-target data structure, not a single session score, and should be modeled as its own table (target sound/word, current shaping step, history of step changes) rather than reusing the generic session-scoring shape used elsewhere.

**Scoring:** adds a bonus "Closer Approximation" category, rewarding incremental progress toward the target sound even without full accuracy — consistent with errorless-learning/shaping philosophy. The Simplified Session appropriately drops the accuracy demand rather than just making the shaping step "easier," per the verification pass done on the updated curriculum file.

---

## Cross-Phase Implementation Notes

- **All 12 phases now share one categorized scoring model** (Spontaneous / Prompted / No-Response, with phase-specific bonus/extra categories where noted above) — `AdvancementDecisionEngine` can apply a single scoring strategy uniformly across every phase.
- **Not every phase's data shape is "one score per session."** Phase 4's prompt-fading log, Phase 11's communication-method log, and Phase 12's shaping-curve tracking are all richer, phase-specific structures layered on top of the basic session score — `DATABASE.md` should treat these as phase-specific extension tables, not force them into one generic `session_score` column.
- **Age variance is not uniform in depth.** Some phases only vary game *content* by age (Phase 1); Phase 10 varies both content and the fading target itself. The content schema needs to support both shapes.
- **Two mechanisms exist for "child isn't succeeding" and they are not the same thing:** Phase 6's in-trial 4-step error-correction procedure (a recovery loop within a single trial) is distinct from the universal between-session retake → Simplified Session flow. Don't conflate them in the state machine design.
