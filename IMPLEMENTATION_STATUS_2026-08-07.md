# Verbly — Implementation Status Record

**Snapshot date:** 7 August 2026
**Purpose:** A factual record of what has been built, for aligning the dissertation write-up against the actual artefact.
**Verification method:** Every claim below was checked directly against the working repository — file inventory, database migrations, a full test run (`npm test`), and a TypeScript compilation check (`npx tsc --noEmit`). Nothing here is inferred from planning documents.

> **Note on volatility:** this codebase changed three times during the single session in which this record was compiled. Treat it as a snapshot, not a stable state.

---

## 1. What Verbly Is

Verbly is a web application that digitises a 12-phase, evidence-grounded speech and language therapy progression (drawing on Milieu Teaching, PECS, ABA shaping/differential reinforcement, PROMPT, NDP3, and ReST), so that a caregiver rather than a clinician can deliver structured sessions at home, guided in real time by the app, with a speech-language pathologist able to review progress remotely.

It is a decision engine wrapped around a clinical curriculum, not a content library or a drill app.

### Critical framing: "RL" is not machine learning

Throughout the project, **RL stands for Reinforcement Loop**, not reinforcement *learning*. There is no trained model, no reward-maximising policy, no exploration/exploitation, and no learned component of any kind. It is a **deterministic, curriculum-authored state machine** with fixed thresholds and fixed branch logic, executed identically for every child.

This distinction matters for the dissertation. The system's adaptivity is **authored** — clinicians specified the branching rules in advance — and is therefore inspectable, reproducible, and auditable in a way a learned model would not be. Every placement and advancement decision can be traced to a specific rule and a specific content version.

---

## 2. Technology Stack

| Layer | Choice |
|---|---|
| Frontend / Framework | Next.js 15.5 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui components |
| Backend logic | Next.js Route Handlers (server-side), deployed on Vercel |
| Database / Auth / Storage | Supabase (PostgreSQL, Auth, Storage, Row-Level Security) |
| Email | Resend (transactional/notification email) |
| Testing | Vitest |
| Deployment | Vercel (project linked; daily cron configured) |

### Platform decisions worth recording

- **Web application, not native mobile.** React Native + Expo was the original plan and was abandoned. This widened the viewport range the design must serve (phone browser through desktop, the latter especially for SLP review) and removed the assumption that a phone is the only target.
- **Email notifications rather than push.** Chosen specifically to sidestep the Web Push and Safari PWA-install limitations. The acknowledged cost is that email is easier to miss than a phone notification.
- **Server-authoritative logic in Route Handlers, not Supabase Edge Functions.** One deployment target and one language. (Note: the `API.md` specification document still uses "Edge Function" terminology throughout; the implemented reality is Route Handlers.)
- **Authentication in httpOnly cookies, not localStorage**, so the session token is not readable by injected scripts.

---

## 3. Architectural Principles Actually Enforced in Code

These are not aspirations; each is implemented and verifiable.

**1. The client is never the source of truth for a clinical decision.**
No endpoint accepts a `score_percent`, `recommended_phase`, or advancement outcome from the client. Scoring, placement, and advancement are all computed server-side. The stated rationale: if decision logic lived client-side, two app versions in the field could disagree about the same child's outcome.

**2. Row-Level Security is the isolation boundary, not application code.**
A caregiver's queries are scoped to their own children at the database level. The child list query, for example, carries no application-side ownership filter at all — it relies entirely on RLS. This was verified live against the hosted database.

**3. Content is versioned; collected data is immutable against content changes.**
Every session instance and assessment records the content version it ran under. A later edit to curriculum content or Compass scoring cannot retroactively change the interpretation of already-collected data.

**4. One audit trail for phase transitions.**
Every phase change — Compass placement, RL advancement, caregiver-initiated regression, caregiver override — writes to a single `phase_history` table with a `trigger_reason` enum distinguishing the cause. There are no parallel mechanism-specific tables.

**5. Audio is never served from a permanent public URL.**
Vocalisation recordings use time-limited signed URLs via Supabase Storage.

---

## 4. Implemented Modules

### 4.1 Authentication and accounts — complete

Signup, login, logout, and email confirmation. Caregiver and SLP profile rows are provisioned by a Postgres trigger on user creation rather than by application code.

### 4.2 Child profiles — complete

Create a child, list children, view a child's detail page (current phase, phase history, recent session attempts). Deletion cascade behaviour was corrected after an end-to-end test exposed a foreign-key gap.

### 4.3 Communication Compass — complete, the most mature module

The onboarding assessment that places a child at an appropriate starting phase, replacing "every child starts at Phase 1." It is **screening, not diagnosis**, and the interface states this.

**Engine** (~1,078 lines, 17 tests): scoring, domain weighting, phase mapping, red-flag detection, and result assembly, implemented against blueprint v2.1.0.

**Scored domains (7):** receptive language, expressive language, speech sound, social communication, functional communication, play/shared activity, learning readiness. Oral-motor items are collected separately as flags rather than scored into the composite.

**Age brackets (3):** 3–7, 8–12, 10–14, assigned from chronological age. Ages below 3;0 or at/above 15;0 receive a deliberate, dignified exit that recommends professional consultation and generates no placement.

**Item structure:** each item maps a caregiver-facing response option to a 0–4 point value. Response scales include frequency (Never→Always), behavioural (Not yet→Almost always), intelligibility (Almost none→Nearly all), a communication hierarchy (Cry/fuss only→Use words), and engagement duration.

**Confidence gating:** if confidence falls below 0.60, the assessment returns a "supplemental information needed" state and stays open rather than producing a placement.

**Functional benchmark cross-check:** a separate set of yes/no developmental milestone items acts as an independent proxy check against the domain scores.

**Caregiver override:** implemented with the confirmation gate **enforced server-side**, not merely in the interface. Overrides are recorded in a dedicated `placement_overrides` table capturing both the engine's phase and the caregiver's chosen phase, and write a distinct `caregiver_override` row to `phase_history`. An override never suppresses a red flag.

**Interface:** a 604-line assessment flow with save/resume support, and a 247-line results screen that leads with strengths, separates red-flag messaging from the score itself, and carries a quiet, understated override affordance.

### 4.4 Session engines (the Reinforcement Loop) — complete and tested

**Advancement engine** (12 tests). Global pass mark of **75%**, applied uniformly across all 12 phases. Pass advances; a phase is only graduated on the **third consecutive** in-phase pass. A first failure triggers a retake; failing an already-retaken session triggers a Simplified Session.

**Scoring engine** (15 tests). A **five-level base scale**: 100 Independent / 75 Verbal / 50 Gestural-Visual / 25 Physical / 0 None. Three phases use exception scales — Picture Discrimination (accuracy plus self-correction), Responsive Requesting (latency), and Turn-Taking (behavioural compliance, where turn theft and session abandonment both score 0 but are logged distinctly).

Three **bonus mechanisms** are implemented: attribute expansion (+10, capped at 100), correct stem selection (+10 capped at 100 / −10 floored at 50), and closer vocal approximation (+10, applicable only to imitated-vocal trials, awarded when an attempt exceeds the rolling most-frequent step across the last five attempts — history-dependent, and therefore necessarily server-side). Bonuses apply per trial and only to trials already scoring above zero.

**Age-bracket transition rule** (12 tests). Three gates evaluated over the child's last three sessions: mean ≥85%, at least 70% top-tier responses in *every* session, and zero retakes. All three must pass. A three-session cooldown applies and movement is one step at a time, with chronological age floors. Downward movement is advisory only.

### 4.5 Session runtime — under active construction

A 575-line session runner plus practice route pages exist. It starts a session, logs participants, writes check-ins, and completes the session. This module was being written during the compilation of this record and should be re-verified before citation.

### 4.6 Notifications — built, not yet live

A notification engine with templates and a daily scheduled job (09:00 UTC). Currently operates in **dry-run mode** — it plans and logs sends but dispatches nothing, because no verified sending domain has been provisioned yet.

### 4.7 Curriculum content — in transcription

The 12-phase curriculum is being transcribed from the source document into versioned, structured TypeScript content records (~2,430 lines so far), with tests. **Eight of twelve phases have files authored**, though only Phase 1 is currently wired into the export used for seeding, and no seeding path from these files into the database exists yet.

The twelve phases: Joint Attention; Imitation; Oral Motor; PECS 1 (How to Communicate); PECS 2 (Distance & Persistence); PECS 3 (Picture Discrimination); PECS 4 (Sentence Structure); PECS 5 (Responsive Requesting); PECS 6 (Commenting); Turn-Taking & Social Interaction Games; Functional Communication in Daily Routines; Vocal Approximation & Sound Shaping.

---

## 5. Database Schema

Fourteen migrations. Tables in place:

**Curriculum content (versioned, separate schema):** `phases`, `sessions`
**Accounts:** `caregivers`, `slps`, `slp_child_links`, `children`
**Assessment:** `compass_content`, `assessments`, `placement_overrides`
**Session runtime:** `session_instances`, `session_checkins`, `session_participants`
**Audit:** `phase_history`
**Phase-specific logging:** `prompt_fading_log`, `error_correction_events`, `communication_method_log`, `shaping_curve`, `shaping_curve_events`
**Other:** `vocalization_logs`, `notification_preferences`, `notifications_log`

Row-Level Security is enabled on child-scoped tables.

---

## 6. Verification Status

| Check | Result |
|---|---|
| Automated tests | **71 passing across 6 files** |
| TypeScript compilation | **Clean** (zero errors) |
| Live end-to-end verification | Session start → check-in inserts under RLS → completion → phase graduation, plus the retake→simplify path, all confirmed against the hosted database via real HTTP endpoints and real authentication cookies |

**Test coverage is uneven.** The decision engines are well covered (Compass 17, scoring 15, advancement 12, age-bracket 12, notifications 10, content 5). The user interface, the session runner, and several recently added endpoints have **no automated tests**.

---

## 7. Not Yet Built

- **Curriculum content seeding.** Four phases remain untranscribed; seven of the eight transcribed phases are not yet wired in; and no path exists to seed authored content into the database. The runtime reads curriculum content from the database, so the session loop cannot yet run end-to-end on real content.
- **Progress and reporting module** — score history, prompt-fading and shaping curves, exportable SLP reports. The child page currently shows raw lists, no visualisation.
- **SLP dashboard** — the tables exist; no interface or endpoints.
- **Vocalisation capture** — the signed-URL read endpoint exists; recording, upload, and playback do not.
- **Phase-specific extension logging** — five tables have schema and no code.
- **Child-facing games** — a deliberately separate design pass, not a restyling of the caregiver interface.
- **Visual design system** — still the unmodified shadcn default palette. No brand colour, typography scale, or spacing system.
- **Offline capability — none.** No service worker, no PWA manifest, no client-side persistence. Every page is a server component requiring a live database query, and each session check-in is an individual network round-trip. This is a genuine risk for the session runtime specifically: a caregiver mid-session on unreliable connectivity could silently lose a trial, and because the session score is the mean of check-in credits, a lost trial can change a pass/fail outcome.

---

## 8. Provisional Settings and Known Limitations

**These matter for the dissertation's validity discussion and should not be presented as final.**

**1. Compass benchmark thresholds are uncalibrated — by design.**
Because per-item thresholds have not been empirically set, the engine deliberately caps confidence at 0.74. The consequence is that **every child currently routes to a readiness module first, and no child is placed directly into a phase.** This is intentional conservative behaviour at launch, asserted by the test suite, and must not be "fixed" as a bug. It does mean any pilot data collected before calibration will not exercise the direct-placement path.

**2. Age weight factors ship at 1.000.**
The domain weighting by age bracket is specified but not yet differentiated — all factors are currently neutral placeholders.

**3. Advancement thresholds are launch defaults pending SLP sign-off.**
The age-bracket gate values (85% mean, 70% top-tier, zero retakes) carry an explicit validation trigger: instrument the gate outcomes, and revisit if none of the first 50 children clear all three gates.

**4. Two errata were found and corrected during blueprint verification.**
A worked example in the v1 blueprint recommended a phase that contradicted the blueprint's own decision table, and an overall score in the same example had been computed as an unweighted mean of six domains rather than applying the specified weights. Both were corrected in v2.1.0 and the engine matches the corrected values. **This is worth reporting in the methodology as evidence of the cross-verification process, not hidden.**

**5. Clinical content has not yet had independent SLP review.**
Both source documents are original work, explicitly built without drawing on PLS-5, CELF, VB-MAPP, or other proprietary instruments, and both remain pending independent clinical plausibility review.

---

## 9. Design Commitments Recorded but Not Yet Implemented

The design specification defines concrete, testable accessibility requirements that the interface does not yet meet: colour must never be the sole signal (the session check-in controls specifically require icon or text redundancy); touch targets at minimum 44×44px and larger on the active-session screen; text must not be fixed in pixels; WCAG 2.1 AA screen-reader support across caregiver-facing flows; `prefers-reduced-motion` respected before any celebration animation; and a non-audio fallback for the vocalisation feature.

The specification explicitly warns that retrofitting these after the component library exists costs more than designing them in.

Two design questions remain deliberately open: the visual treatment of the second-person instruction block, and whether the check-in component's icon set is standardised now or designed per phase.

---

## 10. Deliberate Design Decisions Worth Defending in the Write-Up

Each of these was chosen *against* the more conventional pattern, on purpose.

- **The PECS Phase 4 sentence strip stays physical.** The app narrates, times, and scores the exchange; it does not render an on-screen drag-and-drop strip. This preserves the physical hand-to-hand exchange that PECS as a method is built around — a case where digitising the interaction would undermine the intervention.
- **Single-caregiver session runtime.** One logged-in caregiver per session. Where the curriculum requires a second person, that person follows on-screen or spoken instructions and is logged as an unauthenticated helper with a role tag and optional name — no account required. This lowers the participation barrier for a grandparent or sibling.
- **Ambiguous Compass placements resolve to the tentative candidate phase.** No clinician-flagging branch exists at this stage; in-session performance data corrects the placement from there.
- **Caregiver override is permitted**, gated by confirmation and logged distinctly from algorithmic placement. The resulting override data is itself a calibration signal: systematic directional override at a particular phase boundary is direct evidence the phase mapper is mis-calibrated there — evidence the product generates from real use without a separate study.
- **Curriculum content is treated as reviewed clinical content, not application logic** — versioned, reviewed before seeding, and never edited through the API at runtime.
- **"Not a substitute for professional evaluation" is visible in-app**, not confined to onboarding. Verified present in the application layout, signup, landing page, and Compass results.

---

## 11. Operational Items Outstanding

- Supabase database password rotation is pending (the password was exposed in plaintext in a terminal error during setup).
- Resend has no verified sending domain, so notifications remain in dry-run.
- The `README.md` and `CLAUDE.md` status sections still state that no implementation exists — substantially out of date.

---

*Compiled by direct inspection of the repository on 7 August 2026. Figures such as line counts and test totals were accurate at the time of writing and are changing rapidly.*
