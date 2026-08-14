# PROJECT_STATE_REPORT.md

**Technical audit of the Verbly application as it currently exists.**

| | |
|---|---|
| **Audit date** | 12 August 2026 |
| **Repository** | `/Users/owner/Verbly` |
| **Git state** | Working tree clean, 6 commits, HEAD `d996f40` |
| **Scope** | The application codebase only |

### Method and its limits

Every claim below was checked against the repository or the live database. Verification performed during this audit:

| Check | Command | Result |
|---|---|---|
| Test suite | `npm test` | **86 tests passing, 7 files** |
| Type safety | `npx tsc --noEmit` | **Clean, exit 0** |
| Lint | `npm run lint` | **No ESLint warnings or errors** |
| Seeded content | Read-only REST query against the hosted database | 12 phases, 46 sessions, 1 Compass content row, 1 readiness content row |
| Content validity | 46 seeded scripts validated against `parseSessionScript` | **46/46 runnable, 46/46 have a Simplified variant, 7 carry bonus capture** |

**Not run:** `npm run build`. The repository has a documented defect where running a production build and then the dev server corrupts the `.next` cache. Running it would have disturbed a running development server. Build status is therefore **UNKNOWN**, though typecheck and lint both pass.

**No dissertation, proposal, supervisor feedback, or university requirements were available to this audit, and none were assumed.** Section 16 compares the code only against technical documents inside the repository.

**Nothing was modified.** No code changes, no installs, no refactors.

---

## 2. EXECUTIVE SUMMARY

**What type of application is it?** A server-rendered web application — a caregiver-facing clinical workflow tool with a secondary read-only clinician portal. It is not a mobile app, not a game, and not a content library.

**What problem does it address?** Structured speech and language therapy is normally delivered by a clinician. Verbly encodes a 12-phase therapy curriculum, together with its decision rules, so that a parent can deliver clinically structured sessions at home while the software handles placement, timing, scoring, and progression decisions.

**Who is the intended user?** Evidence in the code identifies three roles. The **caregiver** is the primary user and owns the account (`public.caregivers`). The **speech-language pathologist** is a secondary read-only user reached through an invite-and-accept flow (`public.slps`, `slp_child_links`, `app/(app)/slp/`). A **helper or peer** is a second adult physically present during a session who is logged without an account (`session_participants`, written at `components/practice/session-runner.tsx:142`).

**Major functions.** Account and child management; a structured onboarding assessment that places a child at a starting phase; a pre-session readiness check; a live timed session runner that captures caregiver observations; server-side scoring and advancement decisions; age-variant progression; vocalisation capture; an SLP portal with notes; and email notifications.

**Technologies.** Next.js 15.5 with the App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase (PostgreSQL, Auth, Storage, Row-Level Security), Resend for email, Vitest for tests, Vercel for hosting.

**Overall architecture.** A single Next.js application. Server Components read data directly under Row-Level Security; client components handle interactive flows; Route Handlers perform every operation that constitutes a *decision*. All decision logic sits in pure, separately tested modules under `lib/`. There is no separate backend service.

**State of completion.** The decision engines, the database schema, and the onboarding path are complete and tested. The session runtime is built and operates on real seeded content. The weakest areas are the absence of a reproducible content-seeding path, the total absence of automated tests above the pure-function layer, and several database tables that exist but are never written.

### In plain language

Verbly is a website a parent logs into to deliver speech therapy exercises to their child at home. It begins by asking the parent a series of questions about how the child currently communicates, and uses the answers to decide which of twelve therapy stages to start at — so a child who already points and gestures is not made to start from the very beginning. The parent then works through timed activity sessions with the child while the app prompts them, every so often, to record what the child just did. The app scores each session, and applies fixed rules that were written in advance by following a clinical curriculum: score 75% or more three sessions in a row and the child moves up a stage; fall short and the session is repeated; fall short again and a gentler version is offered. A speech therapist can be invited to view the child's progress and leave notes, but cannot run sessions. Importantly, the app does not *learn* — it follows a fixed rulebook identically for every child.

---

## 3. TECHNOLOGY STACK

| Layer | Technology | Used for | Evidence |
|---|---|---|---|
| Frontend framework | Next.js 15.5 (App Router) | Routing, Server Components, server rendering | `package.json`, `app/` |
| UI library | React 19 | Component rendering, client-side state | `package.json` |
| Language | TypeScript 5.7 | All application code | `tsconfig.json`; `tsc --noEmit` clean |
| Styling | Tailwind CSS v4 | All styling | `postcss.config.mjs`, `app/globals.css` |
| Component primitives | shadcn/ui + Radix (`react-label`, `react-slot`) | 9 UI primitives | `components/ui/`, `components.json` |
| Icons | lucide-react | Iconography | `package.json` |
| Backend | Next.js Route Handlers | All server-authoritative decision logic | `app/api/` (19 route files) |
| Database | Supabase PostgreSQL | All persistence | `supabase/migrations/` (18 migrations) |
| Auth | Supabase Auth via `@supabase/ssr` | Signup, login, session cookies | `lib/supabase/`, `middleware.ts` |
| File storage | Supabase Storage | Vocalisation audio, private bucket, signed URLs only | `20260809000015_vocalization_capture.sql` |
| Access control | PostgreSQL Row-Level Security | Family data isolation | 36 policies across 8 migrations |
| Email | Resend | Notifications, invites, resume links | `lib/email/resend.ts` |
| Testing | Vitest 3.2 | Unit tests on pure logic | 7 test files, 86 tests |
| Hosting | Vercel | Deployment and cron | `vercel.json`, `.vercel/project.json` |
| Utilities | `clsx`, `tailwind-merge`, `class-variance-authority` | Class composition | `lib/utils.ts` |

### AI / ML libraries

**None. IMPLEMENTED: no machine-learning dependency of any kind exists.** The complete production dependency list is: `@radix-ui/react-label`, `@radix-ui/react-slot`, `@supabase/ssr`, `@supabase/supabase-js`, `class-variance-authority`, `clsx`, `lucide-react`, `next`, `react`, `react-dom`, `resend`, `tailwind-merge`. There is no TensorFlow, PyTorch, scikit-learn, ONNX, LLM SDK, or statistical library. This is a deliberate architectural position documented in `CLAUDE.md` and repeated in source headers.

---

## 4. APPLICATION ARCHITECTURE

### Actual flow

```
CAREGIVER (browser)
   │
   ├── Server Components (app/(app)/…)  ── read ──▶ Supabase PostgREST ── RLS ──▶ Postgres
   │      dashboard, child detail, practice, SLP portal
   │
   ├── Client Components (components/…)
   │      │
   │      ├── FACT recording ──── direct insert ──▶ Postgres (RLS-enforced)
   │      │     session_checkins, session_participants
   │      │
   │      └── DECISION request ──▶ Route Handler (app/api/…)
   │                                    │
   │                                    ├─▶ Pure engine (lib/…)  ← deterministic rules
   │                                    │     advancement · scoring · age-bracket
   │                                    │     compass · readiness
   │                                    │
   │                                    └─▶ Admin client (service role)
   │                                          writes score, outcome, phase_history
   │                                          — no user write policy exists on these
   ▼
RESPONSE: outcome + score + reason + advisories
```

**The load-bearing distinction:** a *fact* (what the child did) is written straight from the browser under RLS; a *decision* (what it means) is computed only on the server. `app/api/sessions/complete/route.ts:22-27` states this explicitly, and it is enforced structurally — decision fields have no user-writable policy, so the client physically cannot submit a score.

### Major components

**Frontend — pages (14).** Landing `app/page.tsx`; auth `app/(auth)/login`, `/signup`; `app/(app)/dashboard`; `app/(app)/children/new`; `app/(app)/children/[id]`; `app/(app)/children/[id]/compass`; `app/(app)/children/[id]/practice`; `app/(app)/children/[id]/practice/[session_id]`; `app/(app)/settings`; `app/(app)/slp`; `app/(app)/slp/children/[id]`; `app/invite/[token]`.

**Frontend — feature components (2,608 lines total).** `components/practice/session-runner.tsx` (616 lines — the live session engine UI); `components/compass/assessment-flow.tsx` (the assessment wizard); `components/compass/compass-results.tsx`; `components/readiness/readiness-check.tsx`; `components/practice/sound-capture.tsx`; four SLP components; nine `components/ui/` primitives.

**API endpoints (19).**

| Endpoint | Type | Purpose |
|---|---|---|
| `POST /api/compass/start` | Decision | Assign bracket, create/reuse assessment, return items |
| `POST /api/compass/[id]/save` | Fact | Persist wizard draft state |
| `POST /api/compass/[id]/resume-link` | Action | Email a resume link |
| `POST /api/compass/[id]/score` | **Decision** | Run placement engine, place child |
| `POST /api/compass/[id]/override` | **Decision** | Caregiver override, server-gated |
| `GET /api/compass/result/[child_id]` | Read | Latest finalised result |
| `POST /api/readiness/[id]/submit` | **Decision** | Score readiness check |
| `POST /api/sessions/start` | **Decision** | Create instance, choose standard vs Simplified variant |
| `POST /api/sessions/complete` | **Decision** | Score, advance, age-bracket, advisory |
| `POST /api/phase-history/regress` | **Decision** | Caregiver-initiated regression |
| `POST /api/vocalization-logs` | Fact | Metadata + audio upload |
| `GET /api/vocalization-logs/[id]/audio-url` | Read | Signed time-limited URL |
| `POST /api/slp-links/invite` / `invite-email` / `accept` / `revoke` | Action | SLP linking lifecycle |
| `POST /api/slp-notes` | Fact | Append-only clinician note |
| `GET /api/children/[id]` | Read | Child record |
| `GET /api/cron/notifications` | Scheduled | Daily notification dispatch |

**Core business logic (`lib/`, 2,599 lines).** `lib/engine/` — advancement, scoring, age-bracket, age-bracket-runtime, session-script. `lib/compass/` — assess, scoring, phase-mapper, red-flags, config, contract. `lib/readiness/score.ts`. `lib/notifications/`. All pure functions; all data assembly happens in callers.

**Clinical content (`content/`, 3,768 lines).** Twelve phase files plus readiness content, authored as versioned TypeScript data — not application logic.

---

## 5. COMPLETE FEATURE INVENTORY

### 5.1 Authentication — IMPLEMENTED

**Purpose:** Account creation and session management. **Interaction:** Email/password signup, confirmation, login, logout. **Files:** `app/(auth)/`, `app/auth/confirm/route.ts`, `app/auth/signout/route.ts`, `lib/supabase/`, `middleware.ts`. **Backend:** Supabase Auth; profile rows provisioned by a database trigger, not application code. **Database:** `auth.users`, `public.caregivers`, `public.slps`. **Evidence:** Middleware gates all non-public paths and correctly excludes `/api` so API clients receive JSON 401s rather than an HTML redirect (`lib/supabase/middleware.ts:41-56`).

### 5.2 Child profiles — IMPLEMENTED

**Files:** `app/(app)/children/new/`, `app/(app)/children/actions.ts`, `app/(app)/children/[id]/page.tsx`, `app/(app)/dashboard/page.tsx`. **Database:** `public.children`. **Evidence:** The child list query carries no application-side ownership filter — isolation relies entirely on RLS, which is the documented intent.

### 5.3 Communication Compass — IMPLEMENTED

**Purpose:** Places a child at an appropriate starting phase instead of defaulting everyone to Phase 1. Explicitly framed as screening, not diagnosis. **Interaction:** One question per screen, with progress, save-and-resume, benchmark items, red-flag intake, and a free-text concern field. **Files:** `components/compass/assessment-flow.tsx`, `compass-results.tsx`, `app/(app)/children/[id]/compass/page.tsx`, six endpoints, `lib/compass/` (1,084 lines). **Database:** `compass_content`, `assessments`, `placement_overrides`. **Evidence:** 17 passing tests; on scoring the route writes the result, moves `children.current_phase_id`, and seeds `phase_history` with `assessment_placement`; repeat scoring returns 409.

### 5.4 Caregiver placement override — IMPLEMENTED

**Evidence:** `app/api/compass/[assessment_id]/override/route.ts:31-33` rejects any request where `confirmed !== true`. The confirmation gate is enforced **server-side**, not merely in the interface. Both the engine's phase and the caregiver's phase are recorded in `placement_overrides`, and a distinct `caregiver_override` row is written to `phase_history`.

### 5.5 Readiness check — IMPLEMENTED

**Purpose:** A one-shot five-question check before the first session of a placed phase. **Files:** `content/readiness/readiness-checks.ts`, `lib/readiness/score.ts`, `app/api/readiness/[assessment_id]/submit/route.ts`, `components/readiness/readiness-check.tsx`. **Database:** `readiness_content`, `readiness_check_results`. **Evidence:** 9 passing tests; gated both in the caregiver's path and server-side at `/sessions/start` (409); one immutable result per assessment.

### 5.6 Session runtime — IMPLEMENTED

**Purpose:** Runs one therapy session live: setup, materials, participant logging, timed check-ins, bonus capture, completion. **Interaction:** The caregiver confirms who is present, reads activity steps, and answers a check-in prompt at the script's interval. **Files:** `components/practice/session-runner.tsx` (616 lines), `app/(app)/children/[id]/practice/`, `/api/sessions/start`, `/api/sessions/complete`, `lib/engine/session-script.ts`. **Database:** `session_instances`, `session_checkins`, `session_participants`. **Evidence:** Check-ins are direct RLS-scoped inserts carrying `credit_value` from the version-pinned script; completion recomputes the score server-side from the stored rows. All 46 seeded scripts validate against the runtime contract.

### 5.7 Advancement decisions — IMPLEMENTED

Detailed in §7 and §8. 17 passing tests.

### 5.8 Age-bracket progression — IMPLEMENTED

**Files:** `lib/engine/age-bracket.ts`, `age-bracket-runtime.ts`; invoked from `/sessions/complete` step 6. **Evidence:** 12 passing tests. Deliberately skipped when the child is graduating a phase, and wrapped in a try/catch so a failure cannot invalidate an already-persisted session outcome.

### 5.9 Downward advisory — IMPLEMENTED

**Evidence:** `/sessions/complete` step 7 persists **every** evaluation, positive or negative, to `session_instances.downward_advisory` — the code comments note the negatives are needed for later validation work. Advisory only; never moves the variant.

### 5.10 Vocalisation capture — IMPLEMENTED

**Files:** `components/practice/sound-capture.tsx`, `components/slp/vocal-playback.tsx`, `POST /api/vocalization-logs`, `GET /api/vocalization-logs/[id]/audio-url`. **Evidence:** `storage_path` is nullable, so a text-only log is valid; audio lives in a private bucket reachable only by signed, time-limited URL.

### 5.11 SLP portal — IMPLEMENTED

**Files:** `app/(app)/slp/`, `app/invite/[token]/page.tsx`, four `slp-links` endpoints, `slp-notes`, four `components/slp/` components. **Database:** `slps`, `slp_invites`, `slp_child_links`, `slp_notes`. **Evidence:** Single-use 14-day tokens; notes inserted through the SLP's own session so the RLS with-check proves the link; the caregiver holds a revoke lever.

### 5.12 Notifications — PARTIALLY IMPLEMENTED

**Purpose:** Daily nudges and milestone messages. **Files:** `lib/notifications/engine.ts`, `templates.ts`, `lib/email/resend.ts`, `GET /api/cron/notifications`, `vercel.json` cron at 09:00 UTC. **Status:** The engine is complete with 10 passing tests, and the cron route is Bearer-authenticated. **However, no email is ever sent.** Verified this audit: `RESEND_API_KEY` is still the literal placeholder `your-resend-api-key` and `NOTIFICATIONS_FROM` is unset, so `emailConfigured()` returns false and every dispatch is logged as `dry_run`. This is a deliberate safety no-op of the real integration, not a mock.

### 5.13 Curriculum content — PARTIALLY IMPLEMENTED

**Status:** All twelve phases are authored (3,768 lines) and wired into `ALL_PHASES`. The hosted database contains 12 phases and 46 sessions, all runnable. **But `content/curriculum/index.ts` is imported by nothing, `supabase/seed.sql` contains zero inserts, and `package.json` has no seed script.** The live database content cannot be reproduced from the repository. See §10, Issue 1.

### 5.14 Phase-specific clinical logging — UNUSED (schema only)

`prompt_fading_log`, `error_correction_events`, `communication_method_log`, `shaping_curve`, `shaping_curve_events` all have full schema and are **never written by any code**. The only references are comments in the content files acknowledging the gap — for example `content/curriculum/phase-12-vocal-approximation.ts:29` notes "shaping_curve tables exist; the runner doesn't write them."

### 5.15 Progress visualisation — NOT IMPLEMENTED

The child detail page renders phase history and session attempts as lists. No chart, curve, or exportable report exists anywhere in the repository.

### 5.16 Offline capability — NOT IMPLEMENTED

No service worker, no PWA manifest, no `public/` directory, no client-side persistence. Every page is a Server Component requiring a live query, and each check-in is an individual network round-trip.

---

## 6. END-TO-END USER JOURNEY

**Step 1 — Arrival.** *Plain:* The parent opens the site and sees what it is, including a note that it does not replace a professional. *Technical:* `app/page.tsx`. Middleware treats `/`, `/login`, `/signup`, `/auth`, `/invite` as public.

**Step 2 — Account.** *Plain:* They sign up and confirm by email. *Technical:* Supabase Auth; a database trigger provisions the `caregivers` row.

**Step 3 — Add a child.** *Plain:* They enter the child's name and date of birth. *Technical:* Direct insert into `children`. **No phase is assigned at this point** — `app/(app)/children/actions.ts` does not set `current_phase_id`.

**Step 4 — Assessment.** *Plain:* Questions about how the child communicates, one per screen, resumable. *Technical:* `POST /api/compass/start` computes age in months, assigns a bracket (3-7 / 8-12 / 10-14), rejects out-of-range ages with a referral message, reuses any in-progress assessment, and returns the bracket's item set. Progress auto-saves to `assessments.draft_state`.

**Step 5 — Placement.** *Plain:* The app works out which stage to begin at and explains why. *Technical:* `POST /api/compass/[id]/score` runs the full engine (§8, algorithms 8–15). Below 0.60 confidence it returns 202 and stays open. Otherwise it writes the result, sets `children.current_phase_id`, and seeds `phase_history` with `assessment_placement`.

**Step 6 — Results, optionally overridden.** *Plain:* Strengths first, then the starting stage, with referral notes kept visually separate. *Technical:* `compass-results.tsx`; override requires `confirmed: true` server-side.

**Step 7 — Readiness check.** *Plain:* Five yes/no questions before the first session. *Technical:* `POST /api/readiness/[id]/submit`; ≥4 yes passes; a lone "no" on the hard item raises a keep-an-eye flag without blocking; ≤3 yes silently causes the Simplified variant to be served.

**Step 8 — Session start.** *Plain:* The app shows what to prepare and who needs to be there. *Technical:* `POST /api/sessions/start` creates a `session_instances` row pinned to `content_version`, stamps `age_bracket`, and **decides which variant to serve** — the client never chooses. Helpers are logged to `session_participants`.

**Step 9 — Live check-ins.** *Plain:* A countdown runs; at each interval the parent taps what the child just did. *Technical:* `session-runner.tsx` ticks only while running and unpaused. Each answer inserts one `session_checkins` row carrying `interval_index`, `response_category`, and `credit_value` **read from the version-pinned script, not calculated in the browser**. Seven sessions additionally capture a bonus observation, offered only when credit exceeds zero.

**Step 10 — Completion and scoring.** *Plain:* The app works out the score. *Technical:* `POST /api/sessions/complete` re-reads the stored check-ins, resolves Phase 12 rolling baselines from prior sessions, applies bonuses, and computes the mean. **The score is never accepted from the client.**

**Step 11 — Progression decision.** *Technical:* The route assembles the trailing run of in-phase passes and prior failures at this same session, then calls `decideAdvancement`. On graduation it writes `phase_history` (`rl_advance`) and moves the child. If there is no next phase, the child has completed Phase 12 and stays put.

**Step 12 — Secondary evaluations.** *Technical:* Age-bracket transition runs only when not graduating; the downward advisory is computed and persisted either way.

**Step 13 — Feedback.** *Plain:* The parent sees the score, what it means, and what happens next. *Technical:* The response carries `outcome`, `score_percent`, `advancesPhase`, a human-readable `reason`, and both advisories.

**Step 14 — Optional SLP review.** *Technical:* Invite → token → accept → `slp_child_links`; the SLP gets read-only views plus append-only notes.

---

## 7. ADAPTIVE ENGINE

### 7.1 What is NOT implemented — stated explicitly

| Technique | Status |
|---|---|
| Machine learning | **NOT IMPLEMENTED.** No model, no training, no inference, no ML dependency. |
| Reinforcement learning (the ML technique) | **NOT IMPLEMENTED.** No agent, policy, reward function, value function, or exploration/exploitation. |
| Bayesian Knowledge Tracing | **NOT IMPLEMENTED.** No latent knowledge state, no prior/slip/guess/learn parameters, no probabilistic update. |
| Item Response Theory / Elo / other psychometric model | **NOT IMPLEMENTED.** |
| Any other statistical or probabilistic model | **NOT IMPLEMENTED.** No distributions, no inference, no regression. |
| Randomness | **NOT PRESENT.** No `Math.random()` in any decision path. |

**Terminology warning that matters for the write-up.** The project uses "RL" throughout to mean **Reinforcement Loop**, a deterministic session state machine. This is *not* reinforcement learning. `CLAUDE.md` and the header of `lib/engine/advancement.ts` both state this in explicit terms. Any document describing this system as using reinforcement learning would be incorrect.

### 7.2 What IS implemented

A **deterministic, rule-based decision system** with fixed, curriculum-authored thresholds — closer to a clinical decision-support system or expert system than to an adaptive learning model.

1. **Inputs.** Caregiver assessment responses; per-trial check-in credits from version-pinned content; completed session history; chronological age in months; readiness answers; caregiver override requests.

2. **Variables maintained.** `children.current_phase_id`, `age_bracket`, `bracket_assigned_at_months`, `age_floor_next_bracket_months`; per-session `score_percent`, `outcome`, `ran_simplified`, `downward_advisory`; the full `phase_history` audit trail; `assessments` with domain scores, confidence, placement.

3. **Calculations.** Sixteen distinct algorithms, enumerated in §8.

4. **Rules and thresholds.** Pass mark 75%; three consecutive passes to graduate; retake then Simplified on repeated failure; age gates at 85% mean, 70% top-tier in every session, zero retakes; three-session cooldown; age floors at 84 and 108 months; readiness ≥4 of 5; Compass domain weights summing to 1.00; twelve phase-entry threshold bands; confidence thresholds 0.75 (direct) and 0.60 (supplemental); placement gap ≤10 points.

5. **How difficulty changes.** Three mechanisms, all rule-driven. **Phase** moves up on three consecutive passes (graduation must occur on a standard session) and can move down only through explicit caregiver-initiated regression. **Variant** — standard versus Simplified — is served automatically after a repeated failure or a failed readiness check. **Age framing** moves up one bracket at a time when three gates plus an age floor plus a cooldown all clear; downward movement is advisory only and never automatic.

6. **How the next activity is selected.** `app/(app)/children/[id]/practice/page.tsx` lists the current phase's sessions ordered by `session_number`; failed sessions are prioritised by `nextRetakeSessionId` (lowest score first, ties broken by earliest attempt); otherwise the next session without a pass is offered. There is no scoring model, no difficulty estimate, and no search — this is ordered selection with a failure-priority rule.

7. **How performance is represented.** As observed percentages only. There is no latent ability estimate, mastery probability, or knowledge state.

8. **Deterministic?** **Yes, entirely.** Identical inputs always produce identical outputs. Every engine module is a pure function with data assembly performed by the caller — the structure that makes the 86 unit tests possible.

9. **What makes it "adaptive"?** Only this: the starting point and the subsequent path differ per child, as a function of that child's own assessment responses and recorded performance, under rules fixed in advance. It is **personalised via deterministic branching**, not adaptive in the machine-learning sense. Describing it otherwise would misrepresent the code.

---

## 8. ALGORITHMS AND MATHEMATICAL MODELS

Sixteen implemented algorithms. Formulas are as coded.

### 8.1 Session score

**Location:** `lib/engine/scoring.ts:scoreSessionPercent`. **Formula:** `score = (Σ applyBonus(baseCreditᵢ, bonusᵢ)) / n`, rounded to 2dp; returns 0 when n = 0. **Example:** trials of 100, 75, 50, 0 → 225/4 = **56.25%**, a fail. **Importance:** the single number the entire progression system consumes.

### 8.2 Bonus application

**Location:** `lib/engine/scoring.ts:applyBonus`. **Rules:** attribute → `min(base+10, 100)`, no penalty; stem → correct `min(base+10,100)`, incorrect `max(base−10, 50)`; approximation → applies only when `base === 25`, then `min(base+10,100)` if the baseline was exceeded. Gated by `baseCredit > 0`. **Example:** base 75 with a correct stem → 85. **Flagged in the code:** for a base below 50 the stem floor would *raise* the trial to 50. The comment records that this literal reading was preserved rather than reinterpreted, and flags it for clinical review.

### 8.3 Rolling baseline

**Location:** `lib/engine/scoring.ts:rollingBaselineStep`. **Formula:** the mode of the last five prior steps for a target; ties resolve to the higher step; returns 0 with no history. **Example:** `[2,3,3,4,4]` → tie between 3 and 4 → **4**. **Importance:** history-dependent, therefore necessarily server-side; a first-ever attempt cannot exceed a baseline that does not exist.

### 8.4 Advancement decision

**Location:** `lib/engine/advancement.ts:decideAdvancement`. **Logic:** if `score ≥ 75` → `advance`, with `consecutive = prior + 1` and `advancesPhase = (consecutive ≥ 3) AND NOT ranSimplified`; else if `priorFailedAttemptsThisSession ≥ 1` → `simplify_triggered`; else → `retake`. **Example:** score 80 with 2 prior passes on a standard session → advances. The same on a Simplified variant → the run continues at 3, but advancement defers to the next standard pass. **Importance:** the central progression rule of the product.

### 8.5 Retake ordering

**Location:** `nextRetakeSessionId`. Sort ascending by score, ties by earliest attempt, take first.

### 8.6 Age-bracket transition

**Location:** `lib/engine/age-bracket.ts:evaluateAgeBracketTransition`. **Gates over the last 3 in-variant sessions:** G1 `mean ≥ 85`; G2 `topTierShare ≥ 0.7` in **every** session; G3 no retakes. Requires all three, plus `childAgeMonths ≥ nextVariantFloorMonths`, plus `sessionsSinceLastTransition ≥ 3`. **Example:** scores 90/88/86 (mean 88 ✓), top-tier 0.8/0.75/0.65 → **G2 fails** on the third session; no transition. **Importance:** prevents promotion on a birthday alone or on a single strong week.

### 8.7 Downward advisory

**Location:** `evaluateDownwardAdvisory`. **Formula:** over the last 6 attempts (minimum 5), advise when `baseline − scoreᵢ ≥ 15` for **every** attempt. In `/sessions/complete`, baseline = mean of attempts before that window, requiring ≥3 — an operational interpretation the code flags as a launch default.

### 8.8 Domain scores

**Location:** `lib/compass/scoring.ts:computeDomainScores`. **Formula:** `raw = round((Σ points)/(n × 4) × 100)`; `adjusted = round(raw × ageWeightFactor)`. **Example:** 3 items scoring 3, 2, 4 → 9/12 = **75**. Age factors currently all 1.000, so adjusted equals raw.

### 8.9 Overall score

**Formula:** `Σ (adjustedᵈ × weightᵈ)` over 7 domains, weights summing to 1.00 — receptive 0.20, expressive 0.20, social 0.20, functional 0.15, speech 0.10, play 0.10, learning readiness 0.05. Oral-motor is excluded from scoring and captured as flags.

### 8.10 Benchmark agreement

**Formula:** per answered benchmark item, 1.0 if the yes/no agrees with whether the predicted domain's score clears the threshold; 0.5 within a ±10 near-miss band; else 0. Rate = mean, bounded [0,1]. **Importance:** an independent cross-check on the survey against itself.

### 8.11 Confidence

**Formula:** `0.6 × completeness + 0.4 × consistency`, where `completeness = min(1, answered/total)`. **Launch behaviour:** because `benchmarkThresholdsCalibrated = false`, the `n<4` path is forced — consistency is omitted and confidence is **capped at 0.74**. **Consequence:** since `confidenceDirectMin = 0.75`, `start_directly` is currently **unreachable**; every child routes to a readiness module. Intentional, asserted by tests, documented at `lib/compass/scoring.ts:87-95`.

### 8.12 Strengths and needs

Strengths: adjusted ≥ 65, top 3 descending. Needs: adjusted ≤ 45, bottom 3 ascending.

### 8.13 Phase mapping

**Location:** `lib/compass/phase-mapper.ts:mapPhase`. A twelve-branch decision tree in **fixed priority order**, first match wins. Phase 3 is reachable only when oral-motor flags are present. **Example:** social 30 → the Phase 1 branch fires before any later branch is evaluated. **Importance:** the placement decision itself; priority order encodes clinical precedence.

### 8.14 ELSE fallback

**Location:** `elseNearestPhase`. When no branch matches, compute `|score − threshold|` on each phase's **primary driver domain** (range-aware via `distToRange`), sort ascending, break ties toward the **lower** phase number. **Importance:** guarantees a placement for every possible profile — the system cannot fail to place a child.

### 8.15 Placement mode

**Formula:** `start_directly` iff `confidence ≥ 0.75 AND |gap| ≤ 10`, else `readiness_module_first`. Currently always the latter, per 8.11.

### 8.16 Readiness scoring

**Location:** `lib/readiness/score.ts`. `passed = yesCount ≥ 4` of 5; `hardItemFlagged = passed AND the single NO was the hard prerequisite`. A hard-item flag never blocks.

### Formalisation candidates

Presented as observation, not recommendation. The following already contain explicit, testable logic that could be stated formally: the three-gate age-bracket conjunction (a clean conjunctive rule with a temporal window and a refractory period); the ELSE nearest-driver fallback (a distance function over a threshold space with a documented tie-break); the confidence composite and its degenerate launch case; the priority-ordered decision tree (expressible as an ordered predicate list with a proven-total fallback); and the bonus-adjusted mean with clamping. The override-versus-engine comparison stored in `placement_overrides` is a directly analysable disagreement signal.

---

## 9. DATABASE AND DATA FLOW

**Technology:** Supabase PostgreSQL, 18 migrations, two schemas (`public`, `curriculum_content`), 36 RLS policies.

### Tables (26)

**Content (versioned):** `curriculum_content.phases`, `.sessions`, `.age_bands` *(UNUSED)*, `public.compass_content`, `public.readiness_content`.
**Identity:** `caregivers`, `slps`, `children`, `slp_child_links`, `slp_invites`, `slp_notes`.
**Assessment:** `assessments`, `placement_overrides`, `readiness_check_results`.
**Runtime:** `session_instances`, `session_checkins`, `session_participants`.
**Audit:** `phase_history`.
**Clinical logging — all UNUSED:** `prompt_fading_log`, `error_correction_events`, `communication_method_log`, `shaping_curve`, `shaping_curve_events`.
**Other:** `vocalization_logs`, `notification_preferences`, `notifications_log`.

### Key relationships

`caregivers 1—N children 1—N session_instances 1—N session_checkins`; `children 1—N phase_history` (single audit trail, `trigger_reason` ∈ {assessment_placement, caregiver_override, rl_advance, caregiver_regression}); `children 1—N assessments 1—N placement_overrides`; `children N—M slps` via `slp_child_links`.

### Data flow

**Enters as:** assessment responses, readiness answers, per-trial check-ins, participant records, vocalisation metadata and audio, SLP notes.
**Stored:** facts by the browser under RLS; decisions only by the service-role client.
**Processed:** on `/sessions/complete` and `/compass/score`, always server-side, always from stored rows rather than client-supplied values.
**Influences later decisions:** completed `session_instances` drive the consecutive-pass run, retake detection, age-gate window, and downward baseline; prior `session_checkins` with `bonus_kind = 'approximation'` drive Phase 12 rolling baselines across sessions; `assessments.placement_mode` gates the readiness check; `children.age_bracket` selects the content variant.

**Version pinning:** `session_instances` and `assessments` both record the content version they ran under, so later content edits cannot retroactively reinterpret collected data.

---

## 10. BUGS AND TECHNICAL INCONSISTENCIES

*Nothing was fixed. Reported only.*

### Issue 1 — No reproducible content-seeding path

**Severity: CRITICAL.** The live database holds 12 phases and 46 sessions, but `content/curriculum/index.ts` is imported by no code, `supabase/seed.sql` contains zero inserts, and `package.json` defines no seed script. **Evidence:** `grep -rl "ALL_PHASES" app lib scripts` returns nothing; `grep -c "insert into" supabase/seed.sql` returns 0. **Likely cause:** content was seeded by an ad-hoc script run outside version control. **Consequence:** the database state cannot be recreated from the repository. A database reset, a fresh environment, or a demonstration on a different project would lose all curriculum content with no committed way to restore it. **Recommended fix:** commit a seed script that reads `ALL_PHASES` and writes `curriculum_content`, with a `package.json` entry. **Must fix before demonstration: YES.**

### Issue 2 — Email silently disabled

**Severity: HIGH.** `RESEND_API_KEY` is the literal placeholder and `NOTIFICATIONS_FROM` is unset, so `emailConfigured()` is false and everything is logged `dry_run`. **Affects:** daily notifications, Compass resume links, SLP invite emails. **Evidence:** verified this audit against `.env.local`. **Note:** the behaviour is intentional and safe — `lib/email/resend.ts:14-18` documents it — but the affected features cannot be demonstrated. **Must fix before demonstration: YES, if email is demonstrated.**

### Issue 3 — Duplicated advancement logic

**Severity: MEDIUM.** The consecutive-pass run is computed in two places: authoritatively in `app/api/sessions/complete/route.ts:152-160`, and again for display in `app/(app)/children/[id]/practice/page.tsx:95-101`, whose comment claims it "Mirrors /sessions/complete exactly." The two use different filters (phase number versus phase-scoped session id set), and the display copy does not account for `ran_simplified`. **Consequence:** the progress indicator shown to the caregiver could disagree with the actual decision, particularly around a Simplified pass. **Recommended fix:** extract one shared pure helper. **Must fix before demonstration: NO** (display-only), but it is a visible inconsistency risk.

### Issue 4 — Five tables written by nothing

**Severity: MEDIUM (architectural).** `prompt_fading_log`, `error_correction_events`, `communication_method_log`, `shaping_curve`, `shaping_curve_events` have full schema and RLS but no writer. **Evidence:** the only references are comments in content files acknowledging the gap. **Consequence:** the phase-specific clinical detail the curriculum describes is not captured; only the generic check-in credit is. **Must fix before demonstration: NO.**

### Issue 5 — `curriculum_content.age_bands` orphaned

**Severity: LOW.** Superseded by the varchar bracket scheme in migrations 0009 and 0011 but never dropped. Dead schema.

### Issue 6 — No tests above the pure-function layer

**Severity: MEDIUM.** All 86 tests target `lib/` and `content/`. There is **no automated test for any of the 19 route handlers or any UI component** — including `session-runner.tsx` (616 lines) and `assessment-flow.tsx`. **Consequence:** orchestration bugs — history assembly, RLS behaviour, error paths — would not be caught. **Must fix before demonstration: NO**, but it is the largest quality gap.

### Issue 7 — `start_directly` unreachable

**Severity: LOW as a defect — INTENTIONAL. HIGH as an evaluation limitation.** Confidence is capped at 0.74 against a 0.75 threshold, so no child is ever placed directly. **This is deliberate**, asserted by tests, and must not be "fixed." Its significance is that one of the two documented placement pathways cannot be exercised or evaluated until benchmark thresholds are calibrated.

### Issue 8 — Two open TODOs

**Severity: LOW.** `lib/compass/ui-copy.ts:61` (readiness modules — appears largely superseded by the implemented readiness check) and `lib/compass/red-flags.ts:57` (history signals wired at the endpoint layer).

### Issue 9 — Development server instability

**Severity: MEDIUM for demonstration.** The dev server was killed repeatedly with exit code 137 (SIGKILL) during recent work, while serving normally and with no error in its log, under sustained memory pressure (swap ~7.4 GB of ~8.2 GB). **Consequence:** a live demonstration could lose the server mid-session. **Recommended action:** free memory before demonstrating, or run a production build. **Must fix before demonstration: YES, mitigate.**

### Issue 10 — `.next` cache corruption

**Severity: MEDIUM for demonstration.** Documented in project notes: running `npm run build` and then `npm run dev` corrupts `.next`, producing `Cannot find module './vendor-chunks/*.js'` and HTTP 500s. Also observed when two dev servers share one `.next`. **Workaround:** `rm -rf .next` before `npm run dev`; never run two servers. **Must fix before demonstration: NO, but must be known.**

### Checked and found clean

Middleware correctly excludes `/api` from the HTML redirect. `NEXT_PUBLIC_SITE_URL` is unset locally but falls back to the request origin. Typecheck, lint, and all 86 tests pass. No broken imports. All 46 seeded scripts validate. **Build status: UNKNOWN** — not run, per §1.

---

## 11. TECHNICAL STRENGTHS

**1. The fact/decision boundary is enforced structurally, not by convention.** Decision fields have no user-writable RLS policy, so a client cannot submit a score even if it tried. Scores are always recomputed server-side from stored rows.

**2. Genuinely testable engine design.** Every decision module is a pure function; callers assemble data. This is what makes 86 fast, meaningful unit tests possible, and it is the strongest software-engineering property in the codebase.

**3. Defence in depth on authorisation.** RLS at the database, middleware at the edge, per-route `getUser()` checks, service-role confined to server code, and the override confirmation gate enforced server-side.

**4. Content/code separation actually held.** Clinical content lives in versioned records validated by a contract (`parseSessionScript`); unparseable content surfaces an error rather than being patched in code. All 46 seeded scripts validate.

**5. Version pinning for data integrity.** Sessions and assessments record the content version they ran under, so historical data cannot be retroactively reinterpreted.

**6. Single audit trail.** All four transition causes write to one `phase_history` table with a distinguishing `trigger_reason`, rather than parallel per-mechanism tables.

**7. Failure isolation in the completion path.** Age-bracket evaluation is wrapped in try/catch and the advisory write is non-fatal, so a secondary failure cannot invalidate an already-persisted outcome.

**8. Honest handling of clinical ambiguity.** Where the source curriculum was ambiguous, the code applies the literal reading and flags it in a comment rather than silently reinterpreting — ten such flags exist. This is unusual discipline and is directly citable.

**9. Deliberate conservative defaults.** The uncalibrated confidence cap routes every child through a readiness check rather than risking a confident-but-unvalidated direct placement.

**10. Negative results retained.** Downward advisory evaluations are persisted whether or not they fire, explicitly because later validation needs the negatives.

---

## 12. TECHNICAL WEAKNESSES

**A. Cosmetic.** No visual identity — `app/globals.css` is the unmodified shadcn slate default, no brand palette, type scale, or spacing system. The stated accessibility requirements (colour-blind redundancy on check-in controls, ≥44×44px targets, no fixed-px text, WCAG 2.1 AA, `prefers-reduced-motion`) are **not verified as met**.

**B. Technical.** No tests above `lib/`. Duplicated advancement logic (Issue 3). Two open TODOs. Build status unknown.

**C. Architectural.** No reproducible seeding path (Issue 1) — the most serious problem in the project. Five unused tables plus one orphaned table. No offline capability, in an application whose core use is a timed in-person session where a dropped check-in can change a pass/fail outcome.

**D. Algorithmic.** Every threshold is a launch default pending clinical sign-off. Age weight factors are inert at 1.000, so §8.8's adjustment step is currently a no-op. Benchmark thresholds are uncalibrated, making `start_directly` unreachable and the consistency term dead. Several operational interpretations — the downward baseline definition, the stem floor, the tie-break direction — are flagged assumptions, not validated choices.

**E. Data-related.** No production data exists. Phase-specific clinical detail is not captured. Only observed percentages are stored; there is no derived per-skill representation.

**F. Evaluation-related.** With no data and one placement pathway unreachable, the system's decisions cannot presently be evaluated against outcomes. There is no export mechanism for analysis.

### Dangerous for a live demonstration

1. **Server instability** (Issue 9) — repeated SIGKILLs under memory pressure. Highest practical risk.
2. **Content loss with no restore path** (Issue 1) — a database problem would be unrecoverable from the repository.
3. **`.next` corruption** (Issue 10) — produces immediate 500s; the workaround must be known in advance.
4. **Email features cannot be shown** (Issue 2).
5. **Every child routes to a readiness check** (Issue 7) — expected behaviour, but it will look like a bug to an observer unless explained.

---

## 13. POTENTIAL ENGINEERING CONTRIBUTION

*Observation of what exists. This audit takes no position on sufficiency for any academic purpose.*

**A. Existing engineering components.** A full-stack application with a clean pure-function decision layer, 18 versioned migrations, 36 RLS policies, layered authorisation, a content-validation contract, versioned content with pinning, an append-only audit trail, and a scheduled dispatch pipeline.

**B. Existing algorithmic components.** Sixteen documented deterministic algorithms (§8), notably: a priority-ordered decision tree with a proven-total nearest-neighbour fallback; a three-gate conjunctive transition rule with a temporal window and refractory period; a composite confidence measure with an explicit degenerate case; a bonus-adjusted aggregation with clamping and floors; and a cross-check agreement measure with a graded near-miss band.

**C. Existing system-design components.** The fact/decision boundary; content/code separation; version pinning; single-audit-trail design; server-enforced confirmation gates; conservative defaults under uncertainty; and retention of negative evaluations for later validation.

**D. Areas that could be strengthened.** The `placement_overrides` table already captures engine-versus-caregiver disagreement, which is an analysable signal that requires no new instrumentation. The flagged interpretation points are explicit, enumerable decision records. The unreachable `start_directly` path is a well-defined calibration problem with the measurement apparatus already in place.

**E. Currently weak or missing.** No evaluation of decision quality against any outcome. No data. No export or analysis tooling. No offline resilience. Uncalibrated parameters throughout. No testing above the pure-function layer.

**Honest characterisation:** the engineering strength is in *systems* work — data integrity, authorisation, content governance, auditability — rather than in algorithmic novelty. The algorithms are careful, well-tested, faithfully transcribed implementations of externally authored clinical rules. They are not novel computational methods, and presenting them as such would not survive scrutiny.

---

## 14. WHAT IS ACTUALLY NOVEL OR DISTINCTIVE

*Stated as observations. No claim of academic novelty is made.*

**Potentially distinctive — the fact/decision architectural boundary.** The consistent separation of "what happened" (client-written under RLS) from "what it means" (server-only, structurally unwritable by clients) applied to *clinical* decisions, with the stated rationale that two client versions must never disagree about the same child's outcome.

**Potentially distinctive — content governance as an engineering constraint.** Clinical content is versioned data validated by a runtime contract, with a rule that unparseable content raises an error rather than being repaired in code. The ten in-code flags marking ambiguous clinical wording form an explicit interpretation register.

**Potentially distinctive — conservative degradation under uncertainty.** Rather than placing children with uncalibrated confidence, the system caps confidence so that every child receives an extra readiness check, and tests assert this. Designed-in caution that fails toward more support.

**Potentially distinctive — the override as a designed calibration signal.** Caregiver overrides are recorded alongside the engine's recommendation specifically so that systematic directional disagreement at a phase boundary becomes evidence about the mapper, generated by ordinary use.

**Potentially distinctive — the deliberate non-digitisation of PECS Phase 4.** The physical card exchange is intentionally *not* rendered on screen; the app narrates, times, and scores while the exchange stays physical. A case of declining to digitise because digitising would undermine the intervention.

**Conventional.** Next.js App Router structure; Supabase auth with cookie sessions; RLS for multi-tenancy; shadcn/ui; token-based invites; cron-driven email; threshold-based rules engines; weighted-sum composites; decision trees. None of these are unusual.

---

## 15. EVALUATION POSSIBILITIES

| Metric | Measures | Data needed | Already collected? | Instrumentation gap | Output |
|---|---|---|---|---|---|
| Session score distribution | Performance spread | `session_instances.score_percent` | **Yes** | None | Histogram; box plot by phase |
| Pass rate against the 75% mark | Threshold appropriateness | Same | **Yes** | None | Bar chart of pass/fail by phase |
| Advancement latency | Sessions to graduate a phase | `phase_history` + instances | **Yes** | None | Distribution of sessions-per-phase |
| Retake and Simplified rate | How often support escalates | `outcome`, `ran_simplified` | **Yes** | None | Stacked bar by phase |
| Placement distribution | Where the Compass sends children | `assessments.recommended_phase` | **Yes** | None | Histogram over phases 1–12 |
| ELSE-branch frequency | How often no rule matches | `elseBranch` | Computed but **not persisted** | Persist the flag on the assessment | Proportion of ELSE placements |
| Override rate and direction | Caregiver–engine disagreement | `placement_overrides` (both phases) | **Yes** | None | Signed difference by boundary |
| Placement stability | Whether placement predicted performance | Placement + first sessions | **Yes** | None | Placement phase vs early score |
| Confidence distribution | Effect of the cap | `assessments.confidence` | **Yes** | None | Histogram; expect a spike at 0.74 |
| Readiness pass rate | Gate discrimination | `readiness_check_results` | **Yes** | None | Pass/fail with hard-flag breakdown |
| Age-gate outcomes | Whether gates ever clear | Gate results | **Computed but not persisted** | Persist the gate object | Per-gate pass counts |
| Downward advisory rate | Advisory firing | `session_instances.downward_advisory` | **Yes — including negatives** | None | Fire rate over time |
| Check-in response mix | Support-level profile | `session_checkins.response_category` | **Yes** | None | Stacked area over sessions |
| Bonus earn rate | Bonus mechanics | `bonus_kind`, `bonus_observation` | **Yes** | None | Earn rate for the 7 bonus sessions |
| Session duration | Practical burden | `started_at`, `completed_at` | **Yes** | None | Duration distribution |
| Content coverage | Which sessions get used | `session_id` frequency | **Yes** | None | Heatmap over the 46 sessions |
| Usability | Caregiver experience | — | **No** | External study | Standard usability instrument |
| Reliability | Crashes, failed requests | — | **No** | Error logging | Error rate over time |

**Two cheap, high-value instrumentation additions:** persisting the ELSE-branch flag and the age-gate outcome object. Both are already computed and then discarded; the age-gate case is already identified in project notes as needing instrumentation to test whether the gates are achievable at all.

**Overriding constraint:** the system currently holds no production data, so every metric above is a *design* for evaluation, not an available result.

---

## 16. REQUIREMENTS VERSUS IMPLEMENTATION

*Compared only against technical documents in the repository (`README.md`, `API.md`, `DESIGN.md`, `ARCHITECTURE.md`, `CLAUDE.md`). No academic document was available or assumed.*

| Requirement | Implemented? | Evidence | Missing / incomplete | Notes |
|---|---|---|---|---|
| 12-phase curriculum as versioned content | **Yes** | 12 phase files; 12 phases / 46 sessions seeded; all validate | No committed seeding path | Issue 1 |
| Compass placement assessment | **Yes** | `lib/compass/`, 6 endpoints, 17 tests | — | Most complete module |
| Deterministic RL, no ML | **Yes** | No ML dependency; pure functions; 86 tests | — | Fully honoured |
| 75% pass mark, uniform | **Yes** | `PASS_MARK = 75` | — | — |
| Retake → Simplified fallback | **Yes** | `decideAdvancement`; 46/46 have Simplified | — | — |
| Single caregiver per session | **Yes** | One account; helpers unauthenticated | — | — |
| Helper logged without an account | **Yes** | `session_participants` insert | — | — |
| PECS 4 strip stays physical | **Yes** | No drag-and-drop; narration only | — | Locked decision honoured |
| ELSE → tentative candidate phase | **Yes** | `elseNearestPhase`, ties → lower | — | — |
| Override with confirmation, logged distinctly | **Yes** | Server-enforced `confirmed === true` | — | — |
| Content versioned; data immutable against changes | **Yes** | Version pinned on instances and assessments | — | — |
| One `phase_history` for all transitions | **Yes** | Four `trigger_reason` values | — | — |
| RLS as the enforcement layer | **Yes** | 36 policies; no app-side ownership filter | — | — |
| Audio via signed, time-limited URLs | **Yes** | Private bucket; signed-URL endpoint | — | — |
| One canonical age scheme | **Yes** | Varchar brackets with CHECK; unified in 0009/0011 | `age_bands` orphaned | Issue 5 |
| Clinical framing visible in-app | **Yes** | App layout, signup, landing, results | — | — |
| Email notifications, not push | **Partially** | Engine + cron built, 10 tests | No domain → dry-run | Issue 2 |
| Web app on Next.js + Tailwind + shadcn | **Yes** | Verified | — | — |
| `POST /sessions/checkin` as a direct query | **Yes** | Direct insert in the runner | — | As specified |
| Child delete cascade as a server operation | **No** | No such endpoint | Entire feature | `API.md` requires it |
| SLP dashboard, read-only | **Yes** | Portal, notes, invites, revoke | — | Exceeds spec: `API.md` said no invite endpoint for this build |
| Phase-specific extension logging | **No** | 5 tables, no writers | All writers | Issue 4 |
| Progress and reporting module | **No** | Lists only | Charts, curves, export | — |
| Accessibility requirements | **Unknown** | Not verified | Audit needed | `DESIGN.md` calls these testable |

---

## 17. PROJECT LIMITATIONS

**Current.** No visual design system. No progress visualisation. No child-facing activity screens. Email disabled. Development-server instability under memory pressure.

**Missing functionality.** Reproducible content seeding. Child deletion cascade. Phase-specific clinical logging. Data export. Offline support.

**Data.** No production data. No pilot cohort. Five clinical logging tables never populated. Two computed signals (ELSE branch, age-gate outcomes) discarded rather than persisted.

**Algorithmic.** All thresholds are unvalidated launch defaults. Age weight factors inert at 1.000. Benchmark thresholds uncalibrated, making `start_directly` unreachable and the consistency term dead. Several flagged operational interpretations remain unconfirmed.

**Evaluation.** Decision quality cannot presently be assessed against outcomes. One of two placement pathways is unexercisable. No usability or reliability instrumentation.

**Deployment.** Vercel project linked but deployment status unverified by this audit. Build status unknown. Content seeded manually in one environment with no reproducible path. Supabase database password rotation noted as outstanding in project records. `curriculum_content` schema exposure was applied by SQL rather than dashboard configuration and may not survive a platform configuration sync.

---

## 18. WHAT THE STUDENT NEEDS TO UNDERSTAND

**1. What is my application?** A website where a parent delivers structured speech-therapy sessions to their child at home, guided step by step, with a therapist able to look in.

**2. What does it do?** It works out which of twelve therapy stages a child should start at, runs timed sessions, records what the child did, scores each session, and decides what happens next.

**3. Who uses it?** Parents primarily. Speech therapists secondarily, read-only, by invitation. A second adult can help in the room without an account.

**4. What happens when they use it?** They sign up, add their child, answer assessment questions, get a starting stage with an explanation, pass a short readiness check, then run sessions where the app prompts them at intervals to record what the child just did. At the end they see a score and what it means.

**5. What does it collect?** Assessment answers, one row per check-in (what the child did and its credit value), who was present, session scores and outcomes, every stage change with its cause, optional vocalisation recordings, and therapist notes.

**6. What does it calculate?** Seven domain scores and a weighted overall score; a confidence value; a recommended starting stage; per-session scores as the average of check-in credits with bonuses; consecutive-pass runs; three age-progression gates; and a downward advisory.

**7. What decisions does it make?** Which stage to start at; whether a session passed; whether to repeat, offer a gentler version, or move up; whether to change the age framing; and whether to flag a concern for professional referral.

**8. What is adaptive about it?** Only that different children get different starting points and different paths, based on their own answers and their own recorded performance. The *rules* never change — they are the same for everyone.

**9. What algorithm does it use?** Not one algorithm — sixteen deterministic rules, listed in §8. Threshold comparisons, weighted averages, a priority-ordered decision tree with a nearest-match fallback, and a multi-gate conjunctive check.

**10. Where does the important logic live?** `lib/engine/` (session scoring and progression), `lib/compass/` (placement), `lib/readiness/` (pre-session check). The route handlers in `app/api/` fetch the data and call these; the engines themselves are pure and independently tested.

**11. Strongest parts?** The clean separation between recording facts and making decisions, enforced at the database level; the pure-function engine design and its 86 tests; the layered security; and the honesty of the code where clinical wording was ambiguous.

**12. Weakest parts?** No committed way to reload the curriculum content into a database. No tests above the pure-function layer. No visual design. All thresholds unvalidated. No data yet.

**13. What is currently broken?** Nothing throws errors — tests, typecheck, and lint all pass. What is *missing* is the seeding path (Issue 1) and working email (Issue 2). The development server has also been dying under memory pressure.

**14. What to understand before touching the code again?** Four things. **(a)** "RL" here means Reinforcement Loop — a fixed rulebook — and never reinforcement learning; do not let anyone describe it as machine learning. **(b)** Clinical numbers live in content and config, never hardcoded in components — changing a threshold is a clinical decision, not a refactor. **(c)** The confidence cap at 0.74 is deliberate and asserted by tests; "fixing" it would break the intended conservative behaviour. **(d)** Your database has content that your repository cannot regenerate — treat that as fragile until a seed script is committed.

### The 30-second explanation

> "It's a web app that lets parents deliver structured speech therapy to their child at home. It starts with a questionnaire that works out which of twelve therapy stages the child should begin at, rather than starting everyone at stage one. Then it runs live sessions — it times them, tells the parent what to do, and prompts them at intervals to record how the child responded. It scores each session and applies fixed clinical rules to decide whether to move up, repeat, or offer a gentler version. A speech therapist can be invited in to review progress. The decision logic is deterministic — a rulebook taken from a clinical curriculum, not a machine-learning model — so every decision is traceable and reproducible."

---

## 19. PRIORITISED TECHNICAL ACTION PLAN

*Technical tasks only. No redesign proposed.*

### P0 — Critical

**Task: Commit a reproducible content-seeding script.**
*Reason:* The database holds content the repository cannot regenerate (Issue 1). A reset or a fresh environment loses the entire curriculum. *Affected:* `content/curriculum/index.ts` (already exports `ALL_PHASES`), `supabase/seed.sql` or a new script, `package.json`. *Outcome:* `npm run seed` reproduces the seeded state. *Difficulty:* Medium — the data exists and is exported; the mapping to `phases`/`sessions` and content-version handling is the work. *Dependencies:* Service-role credentials.

### P1 — Must fix

**Task: Provision Resend and set both variables.** *Reason:* Issue 2 — three features silently no-op. *Affected:* `.env.local`, Vercel environment. *Outcome:* `emailConfigured()` true; sends recorded as `sent`. *Difficulty:* Low, but requires a domain and DNS verification. *Dependencies:* An owned domain.

**Task: Stabilise the demonstration environment.** *Reason:* Issues 9 and 10 — repeated SIGKILLs and cache corruption. *Affected:* Environment, not code. *Outcome:* A session that survives a demonstration. *Difficulty:* Low. *Dependencies:* None.

**Task: Extract the duplicated consecutive-pass calculation.** *Reason:* Issue 3 — the displayed progress can disagree with the actual decision. *Affected:* `app/api/sessions/complete/route.ts`, `app/(app)/children/[id]/practice/page.tsx`, a new shared helper in `lib/engine/`. *Outcome:* One implementation, unit-tested. *Difficulty:* Low. *Dependencies:* None.

### P2 — Important

**Task: Persist the ELSE-branch flag and the age-gate outcome object.** *Reason:* Both are computed and discarded; both are needed to evaluate the placement and progression rules. *Affected:* `/compass/score`, `age-bracket-runtime.ts`, one migration. *Outcome:* Two evaluation metrics become available. *Difficulty:* Low. *Dependencies:* None.

**Task: Add integration tests for the decision route handlers.** *Reason:* Issue 6 — the orchestration layer is entirely untested. *Affected:* `/sessions/complete`, `/compass/score`, `/readiness/submit`. *Outcome:* History assembly and error paths covered. *Difficulty:* Medium. *Dependencies:* A test database strategy.

**Task: Verify the accessibility requirements.** *Reason:* `DESIGN.md` states them as testable; none is verified. *Affected:* `session-runner.tsx` check-in controls especially. *Outcome:* A pass/fail list against the stated criteria. *Difficulty:* Medium. *Dependencies:* None.

**Task: Confirm the production build.** *Reason:* Build status unknown (§1). *Affected:* Whole app. *Outcome:* Known-good deployable build. *Difficulty:* Low. *Dependencies:* Clear `.next` afterwards per Issue 10.

### P3 — Optional

**Task: Remove or document the six unused tables.** *Reason:* Issues 4 and 5 — dead schema misleads readers about what is captured. *Difficulty:* Low.

**Task: Resolve the two open TODOs.** *Difficulty:* Low.

**Task: Implement the child deletion cascade.** *Reason:* `API.md` requires it as a server operation. *Difficulty:* Medium.

---

## 20. FINAL TECHNICAL SUMMARY

### WHAT CURRENTLY EXISTS
A Next.js 15 / React 19 / TypeScript web application on Supabase, comprising roughly 8,900 lines of application code plus 3,768 lines of versioned clinical content. Fourteen pages, nineteen API route handlers, twenty-six database tables across eighteen migrations, thirty-six RLS policies, and eighty-six passing unit tests. Deployed target is Vercel with a daily cron. Six commits; working tree clean.

### WHAT ACTUALLY WORKS
Authentication and accounts. Child profiles. The complete Compass onboarding path — start, save, resume, score, results, override — with a server-enforced confirmation gate. The readiness check. The live session runtime, operating on 46 seeded scripts that all validate against the engine contract and all carry a Simplified variant. Server-side scoring with the three bonus mechanisms, including the history-dependent Phase 12 baseline. Advancement decisions. Age-bracket progression and the downward advisory. Vocalisation capture with signed-URL playback. The SLP portal with invites, revocation, and append-only notes. Typecheck, lint, and all 86 tests pass.

### WHAT DOES NOT WORK
Email — every dispatch is a dry run because the API key is a placeholder and the sending address is unset. Five clinical logging tables are never written. `start_directly` placement is unreachable by design. No progress visualisation, no data export, no offline capability, no child deletion cascade.

### WHAT IS INCOMPLETE
Content seeding has no committed path — the live database holds content the repository cannot regenerate. Testing stops at the pure-function boundary; nineteen route handlers and every UI component are untested. The visual design system does not exist. The stated accessibility requirements are unverified. Every clinical threshold is an unvalidated launch default, and the age weight factors are inert at 1.000.

### WHAT THE ADAPTIVE ENGINE ACTUALLY DOES
It applies fixed, curriculum-authored rules to observed inputs. It places a child at a starting phase by running their domain scores through a priority-ordered decision tree with a nearest-driver fallback. It scores each session as the bonus-adjusted mean of caregiver-recorded check-in credits. It decides pass, retake, or Simplified against a 75% threshold, and graduates a phase after three consecutive passes where the graduating pass must be a standard session. It evaluates a three-gate age-variant promotion with a cooldown and a chronological floor, and raises an advisory on persistent activity-specific decline. Every decision is deterministic and reproducible. **It does not learn, does not update any model, and behaves identically for every child given identical inputs.**

### WHAT ALGORITHMS ARE ACTUALLY IMPLEMENTED
Sixteen, fully enumerated in §8: session score aggregation; bonus application; rolling baseline (mode of last five, ties high); advancement decision; retake ordering; three-gate age transition; downward advisory; domain scoring; weighted overall; benchmark agreement; confidence composite; strengths/needs extraction; the twelve-branch phase decision tree; the nearest-driver ELSE fallback; placement-mode selection; readiness scoring.

### WHAT MATHEMATICAL MODELS ARE ACTUALLY IMPLEMENTED
Arithmetic and rule-based only: weighted linear combinations (domain weights summing to 1.00; confidence as 0.6·completeness + 0.4·consistency), arithmetic means with clamping and floors, absolute and range-aware distance functions with a documented tie-break, a mode calculation, and threshold comparisons. **There is no statistical model, no probabilistic inference, no optimisation, and no learned parameter anywhere in the system.**

### STRONGEST TECHNICAL COMPONENT
The decision architecture. Clinical decisions cannot be made or submitted client-side — not by convention but structurally, because the relevant fields have no user-writable policy and scores are always recomputed server-side from stored rows. Combined with pure-function engines, version pinning, and a single audit trail, this produces a system whose every clinical decision is traceable, reproducible, and independently testable. The 86 tests exist because the design permits them.

### BIGGEST TECHNICAL PROBLEM
The absence of a reproducible content-seeding path. The application depends entirely on 12 phases and 46 sessions in the hosted database; `content/curriculum/index.ts` exports all twelve phases and **nothing imports it**, `seed.sql` contains zero inserts, and no seed script exists. The working system cannot be recreated from its own repository. Every other issue is recoverable; this one risks the artefact itself.

### FIVE MOST IMPORTANT TECHNICAL NEXT STEPS
1. **Commit a content-seeding script** that reads `ALL_PHASES` and writes `curriculum_content`, so the running system can be rebuilt from source. *(P0)*
2. **Provision Resend** — a verified domain, a real key, and `NOTIFICATIONS_FROM` — so notifications, resume links, and SLP invites actually send. *(P1)*
3. **Stabilise the demonstration environment** — free memory to stop the SIGKILLs, and clear `.next` before running to avoid the known cache corruption. *(P1)*
4. **Extract the duplicated consecutive-pass calculation** into one shared, tested helper so the caregiver's progress display cannot disagree with the engine. *(P1)*
5. **Persist the ELSE-branch flag and the age-gate outcome object** — both already computed and discarded — to make the placement and progression rules evaluable. *(P2)*

---

*Compiled by direct inspection on 12 August 2026. Test counts, line counts, and database counts were accurate at the time of writing. No application code, configuration, or data was modified during this audit.*
