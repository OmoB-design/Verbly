# Deterministic Adaptive Decision Engine — Formal Audit

**Read-only audit. No application code, configuration, or data was modified.**

| | |
|---|---|
| Audit date | 15 August 2026 |
| Verification | `npm test` → **108 passing / 8 files**; `tsc --noEmit` → clean; `git status` → clean |
| Method | Line-by-line reading of every decision module and every orchestrating route handler, plus the live seeded configuration |
| Scope | All rules that determine placement, scoring, progression, variant selection, or referral |

### Nomenclature warning

The system is named after a **Reinforcement Loop**. It contains **no machine learning, no reinforcement learning, no Bayesian knowledge tracing, no probabilistic inference, and no randomness**. Every rule below is a fixed threshold comparison or closed-form arithmetic expression. Identical inputs always yield identical outputs.

### Source classification used throughout

| Code | Meaning |
|---|---|
| **THERAPY-SPEC** | Mandated by the 12-phase curriculum document or the Communication Compass blueprint |
| **DESIGN** | A recorded project decision (owner ruling, architectural decision) not present in either source document |
| **IMPL** | An operational choice made in code where the specification was silent or ambiguous |

### Validation status codes

| Code | Meaning |
|---|---|
| **UNIT** | Behaviour is covered by automated tests — proves the code matches the intended rule, **not** that the rule is correct |
| **E2E** | Exercised against the live database via real HTTP endpoints |
| **UNVALIDATED** | A configurable parameter with no empirical or clinical validation |
| **NONE** | Not covered by tests at all |

**No rule in this system has been clinically validated or empirically validated against child outcomes.** Both source documents remain pending independent SLP review, and the system holds no production data. Where a rule is marked UNIT, that means its *implementation* is verified, never its *clinical correctness*.

---

## 1. Engine inventory

| Module | Owns |
|---|---|
| [lib/compass/contract.ts](lib/compass/contract.ts) | Age brackets, age floors, canonical phase names, shared constants |
| [lib/compass/scoring.ts](lib/compass/scoring.ts) | Domain scores, overall, benchmark agreement, confidence, strengths/needs |
| [lib/compass/phase-mapper.ts](lib/compass/phase-mapper.ts) | Phase decision tree, ELSE fallback, placement mode, reasoning |
| [lib/compass/red-flags.ts](lib/compass/red-flags.ts) | Oral-motor flags, hard/soft red flags, referral |
| [lib/compass/assess.ts](lib/compass/assess.ts) | Compass orchestration → §8 payload |
| [lib/readiness/score.ts](lib/readiness/score.ts) | Readiness check scoring |
| [lib/engine/scoring.ts](lib/engine/scoring.ts) | Per-trial bonuses, session score, rolling baseline |
| [lib/engine/progression.ts](lib/engine/progression.ts) | Authoritative progression state (consecutive run, prior failures) |
| [lib/engine/advancement.ts](lib/engine/advancement.ts) | Advance / retake / simplify decision, retake ordering |
| [lib/engine/age-bracket.ts](lib/engine/age-bracket.ts) | Age-variant transition gates, downward advisory |
| [lib/engine/age-bracket-runtime.ts](lib/engine/age-bracket-runtime.ts) | Age-bracket data assembly + writes |
| [lib/engine/session-script.ts](lib/engine/session-script.ts) | Content runnability contract |

All modules except `age-bracket-runtime.ts` are pure functions; callers assemble data.

---

## 2. Formal decision table

### Subsystem A — Onboarding placement (Communication Compass)

---

#### D1 · Age-bracket assignment

| Field | Value |
|---|---|
| **Inputs** | `ageMonths` (derived from `children.dob` and current UTC date) |
| **Formula** | `36–95 → "3-7"`; `96–155 → "8-12"`; `156–179 → "10-14"`; otherwise `null` |
| **Threshold** | `SUPPORTED_AGE_MIN_MONTHS = 36`, `SUPPORTED_AGE_MAX_MONTHS = 179` |
| **Resulting state** | `assessments.age_bracket`, `children.age_bracket` |
| **Next** | Bracket selects the item set **and** the activity variant. `null` → HTTP 400 with a referral message, no placement generated |
| **Source** | THERAPY-SPEC (blueprint §13.3) |
| **Validation** | UNIT + E2E |
| **Edge cases** | Brackets 8-12 and 10-14 overlap in name but not in assignment — 96–155 always resolves to 8-12, never 10-14. A missing `dob` is caught earlier in `/compass/start` with its own 400. `ageInMonths` uses UTC and decrements when the day-of-month has not yet been reached, so a child assessed on their birthday in a negative-offset timezone can read one month younger |
| **Duplication** | `ageInMonths` is implemented **twice** — [load-config.ts:24](lib/compass/load-config.ts#L24) (exported) and [age-bracket-runtime.ts:28](lib/engine/age-bracket-runtime.ts#L28) (private). Logic is currently identical; there is no shared source |

---

#### D2 · Per-domain score

| Field | Value |
|---|---|
| **Inputs** | `responses` (itemId → chosen option label), item `points` maps, `ageWeightFactors`, `ageBracket` |
| **Formula** | `raw_d = round( (Σ points) / (n_answered × 4) × 100 )`; `adjusted_d = round( raw_d × ageWeightFactor[d][bracket] )` |
| **Threshold** | Max points per item = 4 (5-level response scales) |
| **Resulting state** | `compass_domain_scores` (7 domains, 0–100) |
| **Next** | Feeds overall score, strengths/needs, phase mapping, benchmark agreement, soft red flags |
| **Source** | THERAPY-SPEC (§5.1, §5.2) |
| **Validation** | UNIT; weights **UNVALIDATED** |
| **Edge cases** | A domain with zero answered items scores **0**, not null — indistinguishable from a genuine zero, and it propagates into the phase decision tree. Unanswered items are skipped from both numerator and denominator, so partial completion inflates relative to a full assessment. Response labels not present in the `points` map are silently ignored |
| **Duplication** | None |

**`ageWeightFactor` is currently 1.000 for all 7 domains × 3 brackets** (verified in the live seeded config), so the adjustment step is presently a no-op. Blueprint §14.7 records these as provisional.

---

#### D3 · Overall Compass score

| Field | Value |
|---|---|
| **Inputs** | `adjusted` domain scores, `domainWeights` |
| **Formula** | `overall = round( Σ_d adjusted_d × weight_d )` |
| **Threshold** | Weights (live, sum = 1.00): receptive 0.20, expressive 0.20, social 0.20, functional 0.15, speech 0.10, play 0.10, learning readiness 0.05 |
| **Resulting state** | `assessments.compass_overall_score` |
| **Next** | **Reporting only.** Displayed to caregiver and SLP; it does **not** feed the phase decision |
| **Source** | THERAPY-SPEC (§5.3) |
| **Validation** | UNIT; weights **UNVALIDATED** |
| **Edge cases** | Oral-motor is deliberately excluded from the composite (§C6). Because unanswered domains score 0 (see D2), a sparse assessment produces a low overall that looks like poor performance rather than missing data |
| **Duplication** | None |

---

#### D4 · Benchmark agreement (consistency)

| Field | Value |
|---|---|
| **Inputs** | `benchmarkAnswers` (yes/no per item), `adjusted` scores, per-item `predictedDomain` + `threshold(b)` |
| **Formula** | Per item: `1.0` if (yes ∧ score ≥ τ) ∨ (no ∧ score < τ); `0.5` if disagreeing ∧ `|score − τ| ≤ 10`; else `0.0`. `consistency = Σ agreement / n_answered` |
| **Threshold** | Near-miss band = ±10 points; per-item τ values are design-time constants |
| **Resulting state** | `benchmark_crosscheck { expected, observed, consistent_with_domain_scores }` |
| **Next** | Feeds confidence (D5) — **but see the launch gate** |
| **Source** | THERAPY-SPEC (§5.4, explicitly replacing an unimplementable v1.0.0 definition) |
| **Validation** | UNIT; τ values **UNVALIDATED** and declared so |
| **Edge cases** | `consistent_with_domain_scores` is computed as `rate === null ? true : rate >= 0.5`. **At launch `rate` is always used but confidence ignores it**, and when no benchmark items are answered the field reports `true` — i.e. "consistent" is the default when nothing was checked. The ±10 band means a child at 44 against τ=45 scores 0.5 rather than 0 |
| **Duplication** | None |

---

#### D5 · Confidence  ⚠ **binding launch constraint**

| Field | Value |
|---|---|
| **Inputs** | `responses` count, `itemsTotal`, benchmark agreement, `benchmarkThresholdsCalibrated` |
| **Formula** | `completeness = min(1, answered / itemsTotal)`. **If** `calibrated ∧ n_benchmark ≥ 4 ∧ rate ≠ null` → `confidence = round(0.6 × completeness + 0.4 × consistency, 2)`. **Else** → `confidence = min(round(completeness, 2), 0.74)`, `consistency = null` |
| **Threshold** | Cap `0.74`; benchmark minimum `n ≥ 4`; weights 0.6 / 0.4 |
| **Resulting state** | `assessments.confidence` |
| **Next** | Drives the supplemental gate (D14) and placement mode (D10) |
| **Source** | THERAPY-SPEC (§5.4 specifies the formula, the `n<4` fallback, and the instruction to force it) |
| **Validation** | UNIT — both the capped and the calibrated paths are tested |
| **Edge cases** | **`benchmarkThresholdsCalibrated = false` in the live seeded config**, so the first conjunct is always false and the capped branch always executes. Maximum attainable confidence is exactly **0.74**, one hundredth below the 0.75 direct threshold. Verified empirically: a 684-combination sweep of the real engine against the live config produced max = 0.74 and **zero** `start_directly` outcomes. `itemsTotal = 0` yields completeness 0 |
| **Duplication** | None |

**Consequence:** `start_directly` (D10) is currently **unreachable**. This is intentional and test-asserted, not a defect. It does mean one of two documented placement pathways cannot be exercised or evaluated until τ values are set.

**Test/runtime divergence risk.** The tests import the static `COMPASS_CONFIG_V2` from [config.ts](lib/compass/config.ts); the runtime loads config from `compass_content.content_json` in the database. Flipping the flag in the database would change production behaviour while all 108 tests continue to pass.

---

#### D6 · Strengths and needs

| Field | Value |
|---|---|
| **Inputs** | `adjusted` domain scores |
| **Formula** | strengths = domains with `adjusted ≥ 65`, sorted descending, top 3. needs = domains with `adjusted ≤ 45`, sorted ascending, top 3 |
| **Threshold** | `strengthMin = 65`, `needMax = 45` |
| **Resulting state** | `strengths[]`, `needs[]` |
| **Next** | Reporting and the reasoning narrative only |
| **Source** | THERAPY-SPEC (§5.5) |
| **Validation** | UNIT; thresholds **UNVALIDATED** |
| **Edge cases** | The bands do not partition — a domain at 55 is neither. A domain can never be both (65 > 45). Empty arrays are valid and suppress the corresponding narrative sentence |
| **Duplication** | None |

---

#### D7 · Oral-motor flags

| Field | Value |
|---|---|
| **Inputs** | Responses to items with `domain === "oral_motor"` |
| **Formula** | Flag raised when the item's mapped point value `> 0` |
| **Threshold** | `> 0` (the oral-motor items use `{No: 0, Yes: 1}`) |
| **Resulting state** | `oral_motor_flags[]` |
| **Next** | **Gates Phase 3 eligibility** in the decision tree (D8) and the ELSE fallback (D9) |
| **Source** | THERAPY-SPEC |
| **Validation** | UNIT |
| **Edge cases** | Oral-motor is excluded from the scored composite but has decisive routing power — a single "yes" makes Phase 3 reachable. Unanswered oral-motor items raise no flag, so skipping them silently removes Phase 3 from consideration |
| **Duplication** | None |

---

#### D8 · Phase recommendation (priority decision tree)

| Field | Value |
|---|---|
| **Inputs** | 7 `adjusted` domain scores, `oralMotorFlagsPresent`, `phaseThresholds` |
| **Formula** | Ordered predicate list, **first match wins** — see pseudocode §5 |
| **Threshold (live)** | P3: oral-motor ∧ speech < 30 · P1: social < 35 · P2: learning < 40 · P4: functional < 40 · P5: functional ∈ [40,55] · P6: functional ≥ 55 ∧ receptive ∈ [35,55] · P7: expressive ∈ [35,55] · P8: receptive ≥ 55 ∧ social ∈ [40,60] · P9: expressive ≥ 55 · P10: social ≥ 60 ∧ expressive ≥ 45 · P11: functional ≥ 65 ∧ expressive ≥ 55 · P12: speech < 40 ∧ all other domains ≥ 55 |
| **Resulting state** | `PhaseCandidate { phase, driver, gap, elseBranch: false }` |
| **Next** | Feeds placement mode (D10); becomes `recommended_phase` and `starting_phase` |
| **Source** | THERAPY-SPEC (§6.1, §6.2 — constructed by reasoning about skill sequencing, explicitly not copied from an external instrument) |
| **Validation** | UNIT; all 17 threshold values **UNVALIDATED** |
| **Edge cases** | **Priority order is load-bearing and encodes clinical precedence** — a child failing both the social and learning predicates always receives Phase 1, never Phase 2. Phases are checked in a fixed order that is not monotonic in phase number (3 before 1). The Phase 12 predicate iterates `Object.keys(s)`, so it depends on the domain object containing exactly the 7 scored domains. `gap` has different semantics per branch: distance below a maximum, distance to a range, or distance above a minimum |
| **Duplication** | None |

---

#### D9 · ELSE fallback (nearest driver)

| Field | Value |
|---|---|
| **Inputs** | Same as D8, when no predicate matched |
| **Formula** | For each of 11 phases (12 with oral-motor), compute distance on that phase's **primary driver domain** — `\|score − τ\|` for point thresholds, `distToRange` for band thresholds. Sort ascending; ties break to the **lower** `phase_number` |
| **Threshold** | Same threshold constants as D8 |
| **Resulting state** | `PhaseCandidate { …, elseBranch: true }` |
| **Next** | Identical downstream handling to a matched branch |
| **Source** | THERAPY-SPEC (§6.2 ELSE); the tie-break direction is DESIGN |
| **Validation** | UNIT |
| **Edge cases** | **Guarantees totality — no profile can fail to be placed.** Phase 3 enters the candidate list only when oral-motor flags exist. `distToRange` returns the distance to the *nearer* edge when inside a range, so an in-range score yields a small non-zero gap rather than 0. **`elseBranch` is computed and then discarded — it is not persisted**, so the proportion of placements arriving via fallback cannot be measured |
| **Duplication** | None |

---

#### D10 · Placement mode

| Field | Value |
|---|---|
| **Inputs** | `candidate.gap`, `confidence` |
| **Formula** | `start_directly` **iff** `confidence ≥ 0.75 ∧ \|gap\| ≤ 10`; else `readiness_module_first` |
| **Threshold** | `confidenceDirectMin = 0.75`, `placementGapPoints = 10` |
| **Resulting state** | `assessments.placement_mode` |
| **Next** | Gates the readiness check (D17) at `/sessions/start` and in the practice page |
| **Source** | THERAPY-SPEC (§6.3) |
| **Validation** | UNIT (both branches); **the `start_directly` branch is unreachable in production** (D5) |
| **Edge cases** | Both conditions must hold. Even with the cap removed, the empirical sweep produced `start_directly` in only 6 of 684 combinations — the gap condition, not confidence, is usually the binding constraint. Note §6.3 is a placement-side gate and is unrelated to the 75% session pass mark despite the numeric coincidence |
| **Duplication** | None |

---

#### D11 · Two-adult advisory

| Field | Value |
|---|---|
| **Inputs** | `candidate.phase`, `secondAdultAvailable` |
| **Formula** | `(phase === 4 ∨ phase === 5) ∧ secondAdult === "no"` |
| **Threshold** | Phases 4 and 5 only |
| **Resulting state** | `two_adult_advisory` |
| **Next** | Advisory copy on the results screen and SLP view. **Does not block or alter placement** |
| **Source** | THERAPY-SPEC (§6.7) |
| **Validation** | UNIT |
| **Edge cases** | `secondAdultAvailable` defaults to `"usually"` when omitted, so a skipped question suppresses the advisory. `"sometimes"` never triggers it. A later caregiver override into Phase 4/5 does **not** re-evaluate this flag |
| **Duplication** | None |

---

#### D12 · Simplified entry (§6.8)  ⚠ **computed but not honoured**

| Field | Value |
|---|---|
| **Inputs** | Response to the engagement-duration item `LRN-ALL-ENGAGE` |
| **Formula** | `startInSimplified = answer ∈ {"Under 1 min", "1–2 min"}` |
| **Threshold** | Two lowest options of a 5-level duration scale |
| **Resulting state** | `assessments.start_in_simplified` |
| **Next** | **Nothing operational.** Displayed to the caregiver as *"We'll begin with a gentler, shorter version of each activity and build up as [child] settles in"* and shown to the SLP as "simplified entry" |
| **Source** | THERAPY-SPEC (§6.8) |
| **Validation** | UNIT (the flag is set correctly); **the downstream behaviour it names does not exist** |
| **Edge cases** | An unanswered engagement item yields `false` |
| **Duplication** | **This rule is implemented in one place and contradicted by another.** `/api/sessions/start` selects only `id, starting_phase, placement_mode` from `assessments` — `grep -c start_in_simplified` in that file returns **0**. The variant decision (D18) considers only a prior `simplify_triggered` outcome and a failed readiness check. A child flagged for simplified entry therefore receives **standard** sessions while both the caregiver and the SLP are told otherwise |

This is the most significant divergence found in this audit: a user-visible clinical promise that the runtime does not keep.

---

#### D13 · Red flags and referral

| Field | Value |
|---|---|
| **Inputs** | `redFlagAnswers` (code → boolean), `freeTextConcern`, `adjusted` scores, `ageBracket` |
| **Formula** | **Hard:** for each definition applicable to the bracket, flag when the answer is `true` (or, for `free_text_concern`, when `freeTextConcern === true`). **Soft:** `count(domains with adjusted < 35) ≥ 3` → `multiple_low_domains`. `referralRecommended = hard.length > 0` |
| **Threshold** | Soft band `< 35`, count `≥ 3` |
| **Resulting state** | `red_flags { hard[], soft[] }`, `referral_recommended` |
| **Next** | Referral callout on the results screen, visually separated from the score. **Never blocks placement; never suppressed by an override** |
| **Source** | THERAPY-SPEC (§7.1–§7.4) |
| **Validation** | UNIT |
| **Edge cases** | §7.2 developmental-history flags fire **regardless of the child's current age** (v2 change C16) — a 12-year-old answering "yes" to "reached 24 months without any words" flags. §7.3 older-child flags are skipped for bracket 3-7. **Three of the four §7.4 soft flags are not implemented** — speech avoidance, familiar-vs-unfamiliar gap, and persistently low confidence across two assessments are marked TODO at [red-flags.ts:57](lib/compass/red-flags.ts#L57). Soft flags do not affect `referralRecommended` at all |
| **Duplication** | None |

---

#### D14 · Supplemental gate

| Field | Value |
|---|---|
| **Inputs** | `confidence` |
| **Formula** | `confidence < confidenceSupplementMin` → HTTP 202, assessment stays `in_progress`, no placement |
| **Threshold** | `confidenceSupplementMin = 0.60` |
| **Resulting state** | `status: "supplemental_needed"` |
| **Next** | Client re-collects; nothing persisted to `children` |
| **Source** | THERAPY-SPEC (§5.4 ladder, §6.3) |
| **Validation** | UNIT + E2E |
| **Edge cases** | Because confidence equals capped completeness at launch, this fires whenever fewer than ~60% of applicable items are answered. **The supplemental question set itself does not exist as content** — the 202 asks the client for more information without specifying which |
| **Duplication** | None |

---

#### D15 · Caregiver override

| Field | Value |
|---|---|
| **Inputs** | `caregiver_phase` (1–12), `confirmed` (must be exactly `true`), assessment status |
| **Formula** | Validation only — no scoring. Rejects unless `confirmed === true`, `caregiver_phase` is an integer in 1–12, and `status === "scored"` |
| **Threshold** | Integer bounds 1–12 |
| **Resulting state** | `placement_overrides` row (engine phase **and** caregiver phase), `assessments.starting_phase`, `placement_source = "caregiver_override"` |
| **Next** | Moves `children.current_phase_id`, writes `phase_history` with `trigger_reason = "caregiver_override"` |
| **Source** | THERAPY-SPEC (§6.5); server-side enforcement of the confirmation gate is DESIGN |
| **Validation** | UNIT + E2E (gate rejection at 400, application at 200) |
| **Edge cases** | The confirmation gate is enforced **server-side**, not merely in the UI. Overrides never suppress a red flag. **`recommended_phase` is left unchanged**, preserving the engine's opinion for later analysis. No re-evaluation of D11 or D12 occurs. An override to the *same* phase is accepted and recorded. Repeat overrides are permitted and each appends a row |
| **Duplication** | None |

**This is the system's only built-in calibration signal:** systematic directional disagreement at a phase boundary is analysable evidence about D8's thresholds, generated by ordinary use.

---

### Subsystem B — Pre-session readiness

---

#### D16 · Readiness scoring

| Field | Value |
|---|---|
| **Inputs** | 5 yes/no answers for the placed phase, `passYesMin` |
| **Formula** | `passed = yesCount ≥ passYesMin`; `hardItemFlagged = passed ∧ (the single hard item was answered "no")` |
| **Threshold** | `READINESS_PASS_YES_MIN = 4` of 5; exactly one item per phase carries `hard: true` |
| **Resulting state** | `readiness_check_results` row (immutable) |
| **Next** | Pass → standard first session. Fail → first session served Simplified. Hard-item flag → "keep an eye on [X]" note, **never blocks** |
| **Source** | DESIGN (owner rulings, 2026-08-09); content is approved v1.0.0 |
| **Validation** | UNIT (9 tests) |
| **Edge cases** | Non-boolean answers are discarded before scoring, and the route separately rejects a submission with fewer than 5 booleans (400). `hardItemFlagged` is only meaningful on a **pass** — on a fail the hard item is irrelevant. One result per assessment, enforced by a 409 on repeat. If the child was placed `start_directly` the route returns 409 — currently unreachable per D5 |
| **Duplication** | None |

---

#### D17 · Readiness gate at session start

| Field | Value |
|---|---|
| **Inputs** | Latest scored assessment, `placement_mode`, `starting_phase`, count of completed sessions in that phase, readiness result |
| **Formula** | Gate applies when `placement_mode === "readiness_module_first" ∧ starting_phase === session.phase_number ∧ completedInPhase === 0`. Then: no result → **409** `readiness_check_required`; result failed ∧ script has a Simplified variant → serve Simplified; result passed → standard |
| **Threshold** | `completedInPhase === 0` |
| **Resulting state** | Either a 409, or `runSimplified` with reason `readiness_ease_in` |
| **Next** | Client routes to the ~90-second check |
| **Source** | DESIGN (owner ruling, 2026-08-09) |
| **Validation** | NONE — no automated test covers this route |
| **Edge cases** | Phase membership is resolved by **`phase_number`**, correctly tolerating multiple content versions of a phase. The gate is skipped entirely if `runSimplified` was already set by D18's retake branch — so a retake-driven Simplified session suppresses the readiness gate. A failed readiness check with **no** Simplified variant in the script silently serves the standard session |
| **Duplication** | The same gate is evaluated a second time in [practice/page.tsx:133](app/(app)/children/[id]/practice/page.tsx#L133) for routing/display. Both now key on `phase_number`. The page is presentational; the route is authoritative |

---

### Subsystem C — Session runtime and scoring

---

#### D18 · Session variant selection

| Field | Value |
|---|---|
| **Inputs** | Most recent completed attempt at **this exact session id**, `script.simplified` presence, readiness result |
| **Formula** | `runSimplified = (lastAttempt.outcome === "simplify_triggered" ∧ script.simplified exists)`, else the readiness branch (D17) |
| **Threshold** | Single most recent attempt |
| **Resulting state** | `session_instances.ran_simplified`, `simplified_reason ∈ {retake_support, readiness_ease_in, null}` |
| **Next** | Determines which script variant is returned; feeds D23's graduation restriction |
| **Source** | THERAPY-SPEC (Simplified Session exists per phase); the exact trigger mapping is DESIGN |
| **Validation** | NONE (route untested); the *consequence* in D23 is UNIT-tested |
| **Edge cases** | **Server-authoritative — the client cannot choose the variant.** Keyed to the exact `session_id`, so the retake chain is per variant. A `simplify_triggered` outcome with no Simplified variant available silently serves the standard script. **D12's `start_in_simplified` is never consulted here** |
| **Duplication** | None |

---

#### D19 · Content runnability gate

| Field | Value |
|---|---|
| **Inputs** | `sessions.content_json` |
| **Formula** | Structural validation: `script_version === 1`, `steps[]` well-formed, `checkin.interval_seconds > 0`, `checkin.count ≥ 1`, `options.length ≥ 2` with every option carrying `label`, `response_category`, and `credit_value ∈ [0,100]`; `simplified` validated identically when present |
| **Threshold** | As above |
| **Resulting state** | `SessionScript` or `null` |
| **Next** | `null` → **HTTP 422**, "flag to content review" |
| **Source** | DESIGN (content/code boundary, CLAUDE.md) |
| **Validation** | UNIT via content tests; all 46 seeded sessions validate |
| **Edge cases** | Deliberately refuses to run rather than repairing bad content in code. Does **not** validate that `credit_value` sets match any clinical scale, nor that `options` are ordered — only structure |
| **Duplication** | None |

---

#### D20 · Per-trial bonus

| Field | Value |
|---|---|
| **Inputs** | `baseCredit` (0–100 from version-pinned content), bonus observation |
| **Formula** | Gate: `baseCredit > 0`. **attribute** → `added ? min(base+10, 100) : base`. **stem** → `correct ? min(base+10,100) : max(base−10, 50)`. **approximation** → applies only when `base === 25`, then `exceededBaseline ? min(base+10,100) : base` |
| **Threshold** | +10 / −10; cap 100; stem floor 50; approximation gate `base === 25` |
| **Resulting state** | Final trial credit |
| **Next** | Aggregated by D21 |
| **Source** | THERAPY-SPEC (Scoring Appendix §3) |
| **Validation** | UNIT (15 tests) |
| **Edge cases** | **Flagged in code:** the stem floor is applied literally, so a base **below** 50 would be *raised* to 50 by an incorrect stem — a penalty that rewards. The comment records this as a faithful reading pending SLP confirmation. Bonuses never apply to 0-credit trials. Approximation is numerically inert on any base other than 25 |
| **Duplication** | None |

---

#### D21 · Session score

| Field | Value |
|---|---|
| **Inputs** | All `session_checkins` rows for the instance |
| **Formula** | `score = round( Σ applyBonus(baseCredit_i, bonus_i) / n , 2 )`; `n = 0 → 0` |
| **Threshold** | — |
| **Resulting state** | `session_instances.score_percent` |
| **Next** | Compared against the pass mark in D23 |
| **Source** | THERAPY-SPEC |
| **Validation** | UNIT |
| **Edge cases** | An empty session scores 0 and therefore cannot pass. **The score is a plain mean over however many check-ins were actually recorded** — `checkin.count` in the script is a plan, not an enforced denominator, so an abandoned session scores on its partial trials. Combined with the absence of offline support, a dropped check-in changes the mean and can flip a pass/fail |
| **Duplication** | [advancement.ts](lib/engine/advancement.ts) also exports `computeScorePercent`, a base-only mean retained for base-only phases. `/sessions/complete` uses `scoreSessionPercent`. Two aggregators exist; only one is on the live path |

---

#### D22 · Rolling baseline (Phase 12)

| Field | Value |
|---|---|
| **Inputs** | Prior approximation steps for one target, chronological |
| **Formula** | Mode of the last 5 prior steps; ties resolve to the **higher** step; empty history → 0 |
| **Threshold** | Window = 5 |
| **Resulting state** | Baseline step for the bonus comparison in D20 |
| **Next** | `exceededBaseline = step > baseline` |
| **Source** | THERAPY-SPEC (Appendix §3b); the tie-break direction is IMPL, flagged as a default pending confirmation |
| **Validation** | UNIT |
| **Edge cases** | Returns 0 with no history, so a first-ever attempt cannot exceed a non-existent baseline. **Flagged interpretation:** the baseline is drawn from *prior sessions only*, not from earlier trials within the current session. Ties to the higher step make the bonus harder to earn — deliberately conservative. Targets are matched by exact string |
| **Duplication** | None |

---

#### D23 · Progression state  *(unified 2026-08-14)*

| Field | Value |
|---|---|
| **Inputs** | Completed attempts (chronological), `phaseSessionIds`, optional `sessionId` |
| **Formula** | `consecutivePasses` = trailing run of attempts with `score ≥ passMark` among in-phase attempts. `priorFailedAttemptsThisSession` = count of failures at that exact session id. `graduationAwaitingStandardPass = runComplete ∧ lastPass.ran_simplified === true` |
| **Threshold** | `PASS_MARK = 75`, `REQUIRED_CONSECUTIVE_PASSES = 3` |
| **Resulting state** | `ProgressionState` |
| **Next** | Consumed by D24 (decision) **and** by the practice page (display) |
| **Source** | THERAPY-SPEC (75% / 3 consecutive) |
| **Validation** | UNIT (22 tests, including agreement assertions against D24) |
| **Edge cases** | Null and empty scores are treated as non-passes, never as passes. PostgREST returns `numeric` columns as strings, so values are coerced before comparison. Attempts outside the phase are ignored, including trailing ones, so an interleaved other-phase attempt does not break a run. Phase membership is keyed by `phase_number` |
| **Duplication** | **Resolved.** This calculation was previously implemented twice — authoritatively in `/sessions/complete` and again for display in the practice page, keyed on `phase_id` rather than `phase_number` and ignoring `ran_simplified`. Both now call this single function. `grep` confirms the trailing-run loop exists in exactly one place |

---

#### D24 · Advancement decision

| Field | Value |
|---|---|
| **Inputs** | `score`, `priorConsecutivePasses`, `priorFailedAttemptsThisSession`, `ranSimplified` |
| **Formula** | If `score ≥ 75`: `consecutive = prior + 1`; `advancesPhase = (consecutive ≥ 3) ∧ ¬ranSimplified` → outcome `advance`. Else if `priorFailedAttemptsThisSession ≥ 1` → `simplify_triggered`. Else → `retake` |
| **Threshold** | 75%, 3 consecutive |
| **Resulting state** | `session_instances.outcome`, `advancesPhase` |
| **Next** | On graduation only: write `phase_history` (`rl_advance`) and move `children.current_phase_id` |
| **Source** | THERAPY-SPEC (locked rule); the mapping onto the three-value outcome enum is DESIGN, explicitly documented as requiring sign-off. The Simplified graduation restriction is DESIGN (owner ruling 2026-08-09) |
| **Validation** | UNIT (17 tests) + E2E |
| **Edge cases** | **A Simplified pass counts toward the run but cannot be the graduating pass** — the run holds and the next standard pass advances. **Completing Phase 12 writes no `phase_history` row and the child stays put** — there is no terminal "programme complete" state. If the next phase row is missing, graduation silently does not occur. The consecutive run spans *any* session in the phase, not three distinct sessions — three passes at the same session graduate |
| **Duplication** | None |

---

#### D25 · Retake ordering

| Field | Value |
|---|---|
| **Inputs** | Failed sessions `{session_id, score, attempted_at}` |
| **Formula** | Sort ascending by `score`, ties by earliest `attempted_at`; return the first |
| **Threshold** | — |
| **Resulting state** | Recommended next session |
| **Next** | Drives the "Start here" recommendation |
| **Source** | THERAPY-SPEC ("retake lowest-scoring first") |
| **Validation** | UNIT |
| **Edge cases** | Sequencing only — never an outcome. The practice page filters to sessions still without a passing attempt on any variant before calling this. Keyed to the exact variant so the retake→simplify chain continues |
| **Duplication** | None |

---

### Subsystem D — Age-variant progression

---

#### D26 · Age-bracket transition (three gates)

| Field | Value |
|---|---|
| **Inputs** | Last 3 completed in-bracket sessions (`scorePercent`, `topTierShare`, `triggeredRetake`), `childAgeMonths`, `nextVariantFloorMonths`, `sessionsSinceLastTransition` |
| **Formula** | Ordered guards: terminal bracket → no move; cooldown → no move; window < 3 → no move. Then **G1** `mean(score) ≥ 85`, **G2** `topTierShare ≥ 0.7` in **every** session, **G3** no retakes in any session. All three must hold, then the age floor must be met |
| **Threshold** | Window 3 · G1 85 · G2 0.70 · G3 zero · cooldown 3 · floors 84 months (3-7→8-12) and 108 months (8-12→10-14) |
| **Resulting state** | `transition`, plus `blockedByCooldown` / `blockedByAgeFloor` |
| **Next** | On fire: `children.age_bracket` moves **one** step and `phase_history` records `age_bracket_transition` (phase unchanged) |
| **Source** | THERAPY-SPEC (Age-Bracket Transition Rule); all values are declared launch defaults pending SLP sign-off, with a stated validation trigger |
| **Validation** | UNIT (12 tests) + E2E; thresholds **UNVALIDATED** |
| **Edge cases** | Guard order means a cooldown block reports `gates: all false` rather than the true gate results — **the gate outcome is not recoverable when blocked, and is not persisted in any case**, so "do these gates ever clear?" cannot currently be answered from data. Evaluated **only when the child is not graduating a phase**. Wrapped in try/catch so a failure cannot invalidate an already-persisted session outcome. `triggeredRetake` is derived as `outcome !== "advance"`, an IMPL interpretation that treats `simplify_triggered` as a retake. `topTierShare` counts check-ins at exactly `credit_value === 100`; sessions with no check-ins yield share 0. Default `sessionsSinceLastTransition` is "cooldown satisfied" when no prior transition exists |
| **Duplication** | Threshold constants live in `age-bracket.ts`; [contract.ts](lib/compass/contract.ts) notes §13 asks for one shared module and records this as an unresolved follow-up |

---

#### D27 · Downward advisory

| Field | Value |
|---|---|
| **Inputs** | Recent per-activity scores, activity baseline, margin |
| **Formula** | Over the last 6 attempts (minimum 5): advise **iff** `baseline − score_i ≥ 15` for **every** attempt in the window |
| **Threshold** | Window 5–6, margin 15 points |
| **Resulting state** | `session_instances.downward_advisory { advise, reason, baseline, recent }` |
| **Next** | **Advisory only — never moves the variant** |
| **Source** | THERAPY-SPEC (advisory-only, per-activity, 5–6 sessions); the **baseline definition** and margin are IMPL, flagged in code as launch defaults |
| **Validation** | UNIT; parameters **UNVALIDATED** |
| **Edge cases** | Baseline is computed in the route as the mean of attempts *before* the recent 6-attempt window, requiring ≥3 such attempts — so the advisory cannot fire until a child has ≥9 attempts at one session. **Every evaluation is persisted, including negatives**, explicitly so later validation work has the null results. Requires *every* attempt in the window to be below margin, so a single good session resets it |
| **Duplication** | None |

---

### Subsystem E — Caregiver-initiated and structural rules

---

#### D28 · Caregiver regression

| Field | Value |
|---|---|
| **Inputs** | `child_id`, `target_phase_id`, caller identity, `phase_history`, phase numbers |
| **Formula** | Validation only: caller must be `primary_caregiver_id`; target must appear in the child's `phase_history`; `target.phase_number < current.phase_number` |
| **Threshold** | Strictly earlier phase |
| **Resulting state** | `phase_history` row with `caregiver_regression`; `children.current_phase_id` moved |
| **Next** | Child resumes at the earlier phase |
| **Source** | THERAPY-SPEC / API.md ("cannot regress to a phase never reached"); primary-caregiver restriction is DESIGN |
| **Validation** | NONE — no automated test |
| **Edge cases** | Secondary caregivers are refused (403). Regression to the current phase is refused. A child with no `current_phase_id` bypasses the ordering check — any reached phase becomes valid. Consecutive-pass runs are **not** reset on regression; the run is recomputed from in-phase history, so prior passes in the target phase still count |
| **Duplication** | None |

---

#### D29 · Age-variant guard at session start

| Field | Value |
|---|---|
| **Inputs** | `session.age_bracket`, `child.age_bracket` |
| **Formula** | Reject when both are non-null and unequal |
| **Threshold** | Exact string equality |
| **Resulting state** | HTTP 400 |
| **Next** | Blocks the session |
| **Source** | DESIGN (§13.3 integrity — prevents wrong-variant attempts contaminating D26's in-bracket window) |
| **Validation** | NONE |
| **Edge cases** | A null session bracket means "all ages" and always passes. A child with **no** bracket assigned passes every guard — so a child who never completed the Compass can run any variant |
| **Duplication** | The practice page filters the visible list by the same rule, so the guard is normally unreachable through the UI |

---

#### D30 · Child-profile cap

| Field | Value |
|---|---|
| **Inputs** | Count of the caregiver's existing children |
| **Formula** | Reject creation at `count ≥ CHILD_PROFILE_CAP` |
| **Threshold** | 5 |
| **Resulting state** | Creation refused |
| **Next** | Friendly error |
| **Source** | DESIGN (owner ruling, 2026-08-14) |
| **Validation** | NONE (application layer); enforced independently by a database trigger |
| **Edge cases** | **Deliberately dual-enforced** — [lib/limits.ts](lib/limits.ts) and migration 019. The file comment states "Change both together," which is the only thing keeping the two in agreement |
| **Duplication** | Intentional defence in depth, not drift |

---

## 3. Cross-cutting findings

### 3.1 Duplication register

| Rule | Status |
|---|---|
| Consecutive-pass run (D23) | **Resolved 2026-08-14** — single function, two callers, test-asserted agreement |
| `PASS_MARK` / window constants | **Two sources.** `PASS_MARK_PERCENT = 75` and `PASS_WINDOW_SESSIONS = 3` in [contract.ts](lib/compass/contract.ts) are **unused**; `PASS_MARK` and `REQUIRED_CONSECUTIVE_PASSES` in [advancement.ts](lib/engine/advancement.ts) are live. Values currently agree, so there is no active divergence — but two declarations exist and `contract.ts` flags the unification as outstanding |
| `ageInMonths` | **Two implementations** — [load-config.ts:24](lib/compass/load-config.ts#L24) and [age-bracket-runtime.ts:28](lib/engine/age-bracket-runtime.ts#L28). Logic identical today; no shared source |
| Session score aggregation | `computeScorePercent` (base-only) and `scoreSessionPercent` (bonus-aware) both exist; only the latter is on the live path |
| Readiness gate (D17) | Evaluated in the route (authoritative) and the practice page (routing). Both key on `phase_number` |
| Child-profile cap (D30) | Intentionally dual-enforced |
| **`start_in_simplified` (D12)** | **Genuine contradiction** — computed, persisted, and shown to two audiences; never read by the runtime that would have to honour it |

### 3.2 Computed-then-discarded signals

| Signal | Consequence |
|---|---|
| `elseBranch` (D9) | The proportion of placements arriving via fallback cannot be measured |
| Age-gate outcomes (D26) | Whether the three gates are ever jointly satisfiable cannot be answered from data — despite this being a stated validation trigger |
| `consistency` (D5) | Always `null` at launch; the benchmark cross-check computes but does not influence |

Each is already calculated. Persisting them is a schema change, not new logic.

### 3.3 Hardcoded non-parameters

- `suggested_reassessment_interval` is the literal string `"6 weeks"` for every child, regardless of phase or profile (§14.8 records a phase-aware interval as a later refinement).
- `benchmark_crosscheck.consistent_with_domain_scores` defaults to `true` when nothing was cross-checked.

### 3.4 Validation status summary

| Status | Rules |
|---|---|
| Clinically validated | **None** |
| Empirically validated against outcomes | **None** — the system holds no production data |
| Unit-tested (implementation verified) | D1–D16, D19–D27 |
| Untested | **D17, D18, D28, D29, D30** — the readiness gate, variant selection, regression, variant guard, and profile cap. Every one of these is a route handler; the project has no automated tests above the pure-function layer |
| Explicitly flagged as provisional in code | Stem floor (D20), rolling-baseline tie-break (D22), downward baseline definition (D27), age-gate thresholds (D26), `ageWeightFactors` (D2), benchmark τ values (D4) |

**Unvalidated parameter count:** 17 phase-mapping thresholds (D8), 3 confidence parameters (D5), 2 strength/need bands (D6), 5 age-gate parameters (D26), 2 downward-advisory parameters (D27), 21 benchmark τ values, 21 age-weight factors, and 7 domain weights (D3) — **approximately 78 tunable clinical constants, none empirically derived.**

---

## 4. Complete decision flow — pseudocode

Notation: `←` assignment, `∧` and, `∨` or, `¬` not. All arithmetic is deterministic; no stochastic element exists anywhere in this flow.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║ CONSTANTS (all curriculum- or blueprint-authored; none learned)              ║
╚══════════════════════════════════════════════════════════════════════════════╝
PASS_MARK              ← 75      REQUIRED_CONSECUTIVE   ← 3
CONF_DIRECT_MIN        ← 0.75    CONF_SUPPLEMENT_MIN    ← 0.60
CONF_UNCALIBRATED_CAP  ← 0.74    PLACEMENT_GAP_MAX      ← 10
READINESS_PASS_MIN     ← 4 of 5
AGE_GATE_WINDOW ← 3   AGE_MEAN_MIN ← 85   AGE_TOPTIER_MIN ← 0.70   AGE_COOLDOWN ← 3
AGE_FLOOR["3-7"] ← 84 months      AGE_FLOOR["8-12"] ← 108 months
DOWN_WINDOW ← 5..6                DOWN_MARGIN ← 15
DOMAIN_WEIGHTS  ← {rec .20, exp .20, soc .20, fun .15, spe .10, play .10, lrn .05}

╔══════════════════════════════════════════════════════════════════════════════╗
║ PROCEDURE 1 — ONBOARDING PLACEMENT                                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
PROCEDURE AssignBracket(ageMonths):                                       ▸ D1
    IF ageMonths < 36 ∨ ageMonths > 179 THEN RETURN null                  ▸ dignified exit
    IF ageMonths ≤ 95  THEN RETURN "3-7"
    IF ageMonths ≤ 155 THEN RETURN "8-12"
    RETURN "10-14"

PROCEDURE ComputeDomainScores(responses, config, bracket):                ▸ D2
    FOR EACH domain d IN the 7 scored domains:
        items   ← config.items WHERE domain = d ∧ bracket applies
        (sum,n) ← Σ points[response] over answered items, count of them
        raw[d]      ← IF n = 0 THEN 0 ELSE round(sum / (n × 4) × 100)     ▸ 0 ≡ unanswered
        adjusted[d] ← round(raw[d] × ageWeightFactor[d][bracket])         ▸ factor = 1.000
    RETURN adjusted

PROCEDURE ComputeConfidence(responses, adjusted, config):                 ▸ D5
    completeness ← min(1, |answered| / itemsTotal)
    agreement    ← BenchmarkAgreement(adjusted, answers, config)          ▸ D4
    IF config.benchmarkThresholdsCalibrated ∧ agreement.n ≥ 4 THEN
        RETURN round(0.6 × completeness + 0.4 × agreement.rate, 2)
    ELSE
        RETURN min(round(completeness, 2), CONF_UNCALIBRATED_CAP)         ▸ ≤ 0.74 ALWAYS
                                                                          ▸ ⇒ start_directly
                                                                          ▸   unreachable
PROCEDURE MapPhase(s, oralMotorPresent, τ):                              ▸ D8
    ▸ Ordered predicate list — FIRST MATCH WINS. Order encodes clinical precedence.
    IF oralMotorPresent ∧ s.speech      < τ.P3max          RETURN Phase 3
    IF s.social                         < τ.P1max          RETURN Phase 1
    IF s.learning                       < τ.P2max          RETURN Phase 2
    IF s.functional                     < τ.P4max          RETURN Phase 4
    IF s.functional  ∈ τ.P5range                           RETURN Phase 5
    IF s.functional ≥ τ.P6min ∧ s.receptive ∈ τ.P6range    RETURN Phase 6
    IF s.expressive  ∈ τ.P7range                           RETURN Phase 7
    IF s.receptive  ≥ τ.P8min ∧ s.social    ∈ τ.P8range    RETURN Phase 8
    IF s.expressive ≥ τ.P9min                              RETURN Phase 9
    IF s.social ≥ τ.P10min ∧ s.expressive ≥ τ.P10expMin    RETURN Phase 10
    IF s.functional ≥ τ.P11min ∧ s.expressive ≥ τ.P11eMin  RETURN Phase 11
    IF s.speech < τ.P12max ∧ ∀d≠speech: s[d] ≥ τ.P12other  RETURN Phase 12
    RETURN ElseNearestPhase(s, oralMotorPresent, τ)                       ▸ D9

PROCEDURE ElseNearestPhase(s, oralMotorPresent, τ):                      ▸ D9
    ▸ Guarantees totality: every possible profile receives a placement.
    candidates ← for each phase p: (p, driver_p, gap ← distance(s[driver_p], τ_p))
    IF ¬oralMotorPresent THEN remove Phase 3 from candidates
    sort candidates by (gap ASC, phase_number ASC)                        ▸ ties → LOWER phase
    RETURN candidates[0] with elseBranch ← true                           ▸ ⚠ not persisted

PROCEDURE Assess(input, config, childName):                              ▸ D2–D13
    adjusted   ← ComputeDomainScores(...)
    overall    ← Σ adjusted[d] × DOMAIN_WEIGHTS[d]                        ▸ D3, report only
    confidence ← ComputeConfidence(...)                                   ▸ D5
    (strengths, needs) ← domains ≥ 65 (top 3) , domains ≤ 45 (bottom 3)   ▸ D6
    oralFlags  ← items in domain 'oral_motor' scoring > 0                 ▸ D7
    candidate  ← MapPhase(adjusted, |oralFlags| > 0, config.thresholds)   ▸ D8/D9

    ▸ D10 — placement mode
    IF confidence ≥ CONF_DIRECT_MIN ∧ |candidate.gap| ≤ PLACEMENT_GAP_MAX THEN
        placementMode ← "start_directly"                                  ▸ UNREACHABLE at launch
    ELSE
        placementMode ← "readiness_module_first"

    twoAdultAdvisory  ← candidate.phase ∈ {4,5} ∧ secondAdult = "no"      ▸ D11
    startInSimplified ← engagementAnswer ∈ {"Under 1 min","1–2 min"}      ▸ D12 ⚠ NEVER CONSUMED
    redFlags          ← DetectRedFlags(...)                               ▸ D13
    RETURN §8 payload

PROCEDURE ScoreEndpoint(assessment, responses):                          ▸ D14
    result ← Assess(...)
    IF result.confidence < CONF_SUPPLEMENT_MIN THEN
        RETURN HTTP 202 "supplemental_needed"      ▸ assessment stays open, no placement
    persist result
    children.current_phase_id ← phase(result.starting_phase)
    phase_history ← (trigger_reason = "assessment_placement")
    RETURN HTTP 200

PROCEDURE Override(assessment, caregiverPhase, confirmed):               ▸ D15
    IF confirmed ≠ true THEN RETURN HTTP 400          ▸ gate enforced SERVER-SIDE
    IF caregiverPhase ∉ ℤ ∩ [1,12] THEN RETURN HTTP 400
    IF assessment.status ≠ "scored" THEN RETURN HTTP 409
    placement_overrides ← (engine_phase, caregiver_phase)   ▸ the calibration signal
    assessment.starting_phase ← caregiverPhase
    assessment.placement_source ← "caregiver_override"
    ▸ recommended_phase preserved; red flags never suppressed
    phase_history ← (trigger_reason = "caregiver_override")

╔══════════════════════════════════════════════════════════════════════════════╗
║ PROCEDURE 2 — PRE-SESSION READINESS                                         ║
╚══════════════════════════════════════════════════════════════════════════════╝
PROCEDURE ScoreReadiness(check, answers):                                ▸ D16
    yesCount ← |{ i ∈ check.items : answers[i] = true }|
    passed   ← yesCount ≥ READINESS_PASS_MIN
    hardFlag ← passed ∧ (the one item with hard = true was answered false)
    RETURN (passed, hardFlag)          ▸ hardFlag NEVER blocks — advisory note only

╔══════════════════════════════════════════════════════════════════════════════╗
║ PROCEDURE 3 — SESSION START                                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
PROCEDURE StartSession(childId, sessionId, user):                        ▸ D17–D19, D29
    session ← curriculum_content.sessions[sessionId]         ▸ version-pinned

    IF session.age_bracket ≠ null ∧ child.age_bracket ≠ null              ▸ D29
       ∧ session.age_bracket ≠ child.age_bracket THEN RETURN HTTP 400

    script ← ParseSessionScript(session.content_json)                     ▸ D19
    IF script = null THEN RETURN HTTP 422 "flag to content review"

    ▸ D18 — variant decision. SERVER-AUTHORITATIVE: the client never chooses.
    runSimplified ← false
    lastAttempt ← most recent completed attempt at THIS session_id
    IF lastAttempt.outcome = "simplify_triggered" ∧ script.simplified ≠ null THEN
        runSimplified ← true ; reason ← "retake_support"

    ▸ D17 — readiness gate (skipped entirely if runSimplified already true)
    IF ¬runSimplified THEN
        a ← latest scored assessment for this child
        IF a.placement_mode = "readiness_module_first"
           ∧ a.starting_phase = session.phase_number
           ∧ completedSessionsInPhase(by phase_number) = 0 THEN
              r ← readiness_check_results[a.id]
              IF r = null THEN RETURN HTTP 409 "readiness_check_required"
              IF ¬r.passed ∧ script.simplified ≠ null THEN
                  runSimplified ← true ; reason ← "readiness_ease_in"

    ▸ NOTE: a.start_in_simplified (D12) is NOT consulted here — see §3.1
    session_instances ← INSERT(content_version, age_bracket ← child.age_bracket,
                               ran_simplified ← runSimplified)
    RETURN the chosen script variant

╔══════════════════════════════════════════════════════════════════════════════╗
║ PROCEDURE 4 — CHECK-IN CAPTURE (fact recording, not a decision)             ║
╚══════════════════════════════════════════════════════════════════════════════╝
EVERY script.checkin.interval_seconds:
    caregiver selects an option from the version-pinned script
    session_checkins ← INSERT(interval_index, response_category,
                              credit_value  ← option.credit_value,   ▸ FROM CONTENT
                              bonus_kind, bonus_observation)         ▸ never computed client-side

╔══════════════════════════════════════════════════════════════════════════════╗
║ PROCEDURE 5 — SESSION COMPLETION (the central decision path)                ║
╚══════════════════════════════════════════════════════════════════════════════╝
PROCEDURE CompleteSession(instanceId):                                   ▸ D20–D27
    IF instance.completed_at ≠ null THEN RETURN HTTP 409     ▸ immutable

    ▸ ── Step 1: score (server recomputes from stored rows; never trusts client)
    checkins ← session_checkins WHERE session_instance_id = instanceId
    FOR EACH trial IN checkins:                                           ▸ D20
        base ← trial.credit_value
        IF base ≤ 0 THEN final ← base                     ▸ bonuses only on >0 trials
        ELSE SWITCH trial.bonus_kind:
            "attribute"     : final ← added   ? min(base+10,100) : base
            "stem"          : final ← correct ? min(base+10,100) : max(base−10, 50)
                              ▸ ⚠ flagged: floor RAISES a sub-50 base
            "approximation" : IF base ≠ 25 THEN final ← base
                              ELSE baseline ← mode(last 5 prior steps, ties→higher)  ▸ D22
                                   final ← (step > baseline) ? min(base+10,100) : base
            none            : final ← base
    score ← round(Σ final / |checkins|, 2)     ▸ D21; |checkins| = 0 ⇒ score 0

    ▸ ── Step 2: progression state — ONE authoritative reading (D23)
    ▸ Consumed by BOTH this decision and the caregiver progress display.
    inPhase ← completed attempts WHERE phase_number = currentPhaseNumber
    consecutivePasses ← length of trailing run in inPhase with score ≥ PASS_MARK
    priorFailuresHere ← |{ a ∈ completed : a.session_id = this ∧ a.score < PASS_MARK }|

    ▸ ── Step 3: advancement decision (D24)
    IF score ≥ PASS_MARK THEN
        consecutive   ← consecutivePasses + 1
        advancesPhase ← (consecutive ≥ REQUIRED_CONSECUTIVE) ∧ ¬instance.ran_simplified
        outcome       ← "advance"        ▸ a Simplified pass HOLDS the run, cannot graduate
    ELSE IF priorFailuresHere ≥ 1 THEN
        outcome ← "simplify_triggered" ; advancesPhase ← false
    ELSE
        outcome ← "retake"             ; advancesPhase ← false

    persist(outcome, score, completed_at)                 ▸ service role only

    ▸ ── Step 4: phase graduation
    IF advancesPhase THEN
        next ← phase WHERE phase_number = currentPhaseNumber + 1
        IF next ≠ null THEN
            phase_history ← (trigger_reason = "rl_advance")
            children.current_phase_id ← next.id
        ▸ ELSE: Phase 12 complete — no row written, child remains. No terminal state.

    ▸ ── Step 5: age-bracket transition (D26) — only when NOT graduating
    IF ¬advancesPhase THEN TRY:
        IF nextBracket = null THEN HOLD "terminal bracket"
        ELSE IF sessionsSinceLastTransition < AGE_COOLDOWN THEN HOLD "cooldown"
        ELSE IF |window| < AGE_GATE_WINDOW THEN HOLD "insufficient window"
        ELSE
            w  ← last AGE_GATE_WINDOW in-bracket sessions
            G1 ← mean(w.scorePercent) ≥ AGE_MEAN_MIN
            G2 ← ∀ s ∈ w : s.topTierShare ≥ AGE_TOPTIER_MIN      ▸ EVERY session
            G3 ← ∀ s ∈ w : ¬s.triggeredRetake                    ▸ outcome ≠ "advance"
            IF ¬(G1 ∧ G2 ∧ G3)                 THEN HOLD "gate(s) failed"
            ELSE IF ageMonths < AGE_FLOOR[cur] THEN HOLD "performance-ready, below age floor"
            ELSE
                children.age_bracket ← nextBracket               ▸ exactly ONE step
                phase_history ← (trigger_reason = "age_bracket_transition")
    CATCH: record error — MUST NOT invalidate the already-persisted outcome
    ▸ ⚠ gate outcomes are NOT persisted — achievability cannot be measured

    ▸ ── Step 6: downward advisory (D27) — advisory ONLY, never moves the variant
    activityScores ← completed attempts at THIS session_id, plus this score
    baselinePool   ← activityScores[0 .. −6]
    IF |baselinePool| ≥ 3 THEN
        baseline ← mean(baselinePool)                ▸ IMPL interpretation, flagged
        recent   ← last 6 attempts
        advise   ← |recent| ≥ DOWN_WINDOW ∧ ∀ r ∈ recent : (baseline − r) ≥ DOWN_MARGIN
        persist downward_advisory ALWAYS             ▸ negatives retained for validation

    RETURN (outcome, score, advancesPhase, reason, ageBracket, downwardAdvisory)

╔══════════════════════════════════════════════════════════════════════════════╗
║ PROCEDURE 6 — CAREGIVER-INITIATED REGRESSION                                ║
╚══════════════════════════════════════════════════════════════════════════════╝
PROCEDURE Regress(childId, targetPhaseId, user):                         ▸ D28
    IF user ≠ child.primary_caregiver_id THEN RETURN HTTP 403
    IF targetPhaseId ∉ phases the child has entered THEN RETURN HTTP 400
    IF target.phase_number ≥ current.phase_number  THEN RETURN HTTP 400
    phase_history ← (trigger_reason = "caregiver_regression")
    children.current_phase_id ← targetPhaseId
    ▸ NOTE: the consecutive-pass run is NOT reset; it is recomputed from history

╔══════════════════════════════════════════════════════════════════════════════╗
║ INVARIANTS                                                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
I1  Determinism: identical inputs ⇒ identical outputs. No randomness anywhere.
I2  Client authority: no client may submit a score, phase, outcome, or confidence.
    Enforced structurally — no user-writable RLS policy exists on those columns.
I3  Single audit trail: every phase change writes exactly one phase_history row,
    distinguished only by trigger_reason ∈ {assessment_placement, caregiver_override,
    rl_advance, age_bracket_transition, caregiver_regression}.
I4  Version pinning: every session_instance and assessment records the content
    version it ran under; later content edits cannot reinterpret past data.
I5  Totality of placement: MapPhase always returns a phase (D9 guarantees this).
I6  Referral independence: a hard red flag always surfaces, and is never
    suppressed by scoring, placement, or a caregiver override.
I7  Advisory containment: downward advisory and two-adult advisory never alter
    state; they only surface guidance.
```

---

## 5. Conclusions

**Character of the system.** This is a deterministic clinical decision-support engine: approximately 30 rules, all closed-form arithmetic or threshold comparison, arranged in three sequential decision layers (placement → readiness → per-session progression) plus two advisory side-channels. The adaptivity is entirely *authored* — the branching was specified in advance by clinical documents — which makes every decision traceable to a named rule, a named threshold, and a recorded content version. That auditability is the system's principal engineering property, and it is a direct consequence of choosing rules over a learned model.

**Principal defect.** D12 (`start_in_simplified`) is computed, persisted, and shown to both the caregiver and the reviewing SLP, but is never read by `/api/sessions/start`. Caregivers of children flagged for gentler entry are told the activities will be adapted; they will not be. This is a divergence between two parts of the application implementing the same rule differently — the specific failure mode this audit was asked to look for.

**Principal structural risk.** Five decision rules (D17, D18, D28, D29, D30) have no automated test coverage whatsoever, because the project's 108 tests stop at the pure-function boundary. Every untested rule is a route handler, and three of them (D17, D18, D29) directly determine what a child is asked to do.

**Principal evaluative limitation.** Roughly 78 clinical constants govern this engine, and none is empirically derived. Three signals that would begin to validate them — the ELSE-branch flag, the age-gate outcomes, and the benchmark consistency term — are computed and then discarded. Two of the three could be persisted with a schema change and no new logic. Meanwhile the confidence cap (D5) holds `start_directly` unreachable by design, so one of two documented placement pathways will generate no evidence at all until benchmark thresholds are calibrated.

---

*Read-only audit conducted 15 August 2026 by direct inspection of the repository and the live seeded configuration. Verified at time of writing: 108 tests passing, TypeScript clean, working tree clean. No application code, configuration, or data was modified.*
