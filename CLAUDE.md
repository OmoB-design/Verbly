# CLAUDE.md

Guidance for Claude (or any AI assistant) working on the Verbly codebase. Read this before generating code, schema, or content for this project. It exists to prevent two failure modes seen repeatedly in earlier design discussions: (1) inventing product decisions that were never made, and (2) quietly reversing decisions that *were* made because they weren't visible in the immediate context.

For product background, see `README.md`. This file is about how to work on the project, not what the project is.

---

## The single most important rule

**Verbly's "RL" is a deterministic rules engine, not machine learning.** Never introduce ML vocabulary, ML libraries, or ML-shaped abstractions (`train()`, `policy`, `reward()`, `model.predict()`) anywhere in this codebase for the session/advancement logic. It is curriculum-authored, fixed-threshold branching logic. Name things `SessionStateMachine`, `AdvancementDecisionEngine`, `ScoringEngine` — not anything implying a learned component. If a genuinely learned/adaptive component is ever proposed, it must be scoped and named as a clearly separate system, never folded into the existing RL naming.

---

## Locked decisions — do not silently relitigate these

These were deliberated and settled. Do not propose alternatives to them unless the user explicitly reopens the topic. Do not "helpfully" default back to a more common pattern (e.g. multi-device sync, an on-screen sentence strip) just because it's more typical for this kind of app — these choices were made *against* the more typical pattern on purpose.

| Area | Decision |
|---|---|
| Platform | Web application — Next.js, Tailwind CSS + shadcn/ui, notifications via email (not push). React Native + Expo was the original plan and is no longer applicable; do not build against it |
| Backend/database | Supabase (Postgres, Auth, Storage, Row-Level Security) — unaffected by the platform pivot |
| Global pass mark | 75%, applied uniformly across all 12 phases |
| Session runtime | Single logged-in caregiver per session, one active browser session at a time. A second person (physical prompter, second communication partner) follows on-screen/spoken instructions with no login of their own |
| Session participant logging | A second person present is logged as an unauthenticated helper/peer (role tag + optional display name only) — do not require an account for this |
| PECS Phase 4 sentence strip | Stays a **physical** velcro card exchange. Do not build a digital drag-and-drop sentence strip — the app narrates, times, and scores; it does not render the exchange itself |
| Ambiguous Compass placement (§6.2 ELSE branch) | Always resolves to placing the child at the tentative candidate phase. No SLP-flagging branch exists at this stage — do not build one unprompted |
| Caregiver override | Caregiver may override the Compass's initial phase recommendation, gated by a confirmation step; log overrides distinctly from algorithmic placements (`trigger_reason`) |
| Content governance | Curriculum content is structured, versioned content (not hardcoded logic), reviewed like code before being seeded. Every `SessionInstance` references the content version it ran under |
| Age bands | One canonical age scheme across the whole app: the varchar bracket `3-7` / `8-12` / `10-14` from the Compass blueprint §13.3 (`AGE_BRACKETS` in `lib/compass/contract.ts`), enforced by a CHECK on the columns that store it. This **supersedes** the earlier "one canonical age-band *table*" wording (owner sign-off 2026-08-07): the old `curriculum_content.age_bands` uuid table was retired (migration 011) in favour of the constant + CHECK. Intent unchanged — do not let individual phases define their own ad hoc ranges |
| Clinical framing | "Not a substitute for professional evaluation" messaging stays visible in-app, not just at onboarding |

If asked to implement something that conflicts with this table, flag the conflict explicitly rather than picking one silently.

---

## Data integrity conventions

- **Every phase transition writes to one `phase_history` table**, regardless of cause (Compass placement, RL advance, caregiver-initiated regression, caregiver override, age-bracket transition). Include a `trigger_reason` enum. Do not create parallel, mechanism-specific tables for this — one audit trail, one table.
- **Content is versioned, data is immutable against version changes.** A `SessionInstance` or `assessment` record always references the `content_version`/`schema_version` it was created under. Never let an edit to curriculum content or Compass scoring retroactively change the interpretation of already-collected data.
- **Row-Level Security is the enforcement layer for child data isolation**, not just an application-layer check. A caregiver's queries must be scoped to their own child(ren) at the database level — do not rely solely on application code to prevent cross-family data leakage.
- **Audio (vocalization recordings) is never served via a permanent public URL.** Use Supabase Storage with signed, time-limited URLs.

---

## Content vs. code boundary

The 12-phase curriculum and the Communication Compass item bank are **clinical content**, not application logic, even though they contain branching rules. Treat them as versioned data:

- Curriculum sessions (activity steps, RL behavior scripts, scoring criteria, Simplified Sessions) live as structured, versioned content records — not hardcoded in application code.
- Do not "improve" or rephrase clinical wording while implementing a feature. If content looks inconsistent or incomplete, flag it back to the user rather than editing it unilaterally — this content has already been through an SLP-questionnaire-informed design process and a verification pass against source documents.
- Any change to scoring thresholds, phase entry conditions, or the Compass's domain weights (§5.2/§6.1 in the Compass blueprint) should be treated as a clinical decision requiring explicit user sign-off, not a routine refactor.

---

## Terminology glossary

| Term | Meaning here |
|---|---|
| RL / Reinforcement Loop | Deterministic session state machine — **not** machine learning |
| Compass | The Communication Compass onboarding assessment (placement, not diagnosis) |
| ELSE branch | The Compass's fallback path when a child's score profile doesn't cleanly match any single phase's entry condition |
| Simplified Session | A scaled-down version of a phase's session, triggered when a caregiver fails to meet the pass mark after a retake — not just "the same task, easier" |
| Session participant | Anyone present for a session; may or may not hold an account (see Locked Decisions) |
| Caregiver A / B | Roles within a single session (e.g. communication partner vs. physical prompter) — both may be embodied by the single logged-in caregiver's on-screen instructions plus an in-room helper, per the single-caregiver-session decision above |

---

## Project status

Documentation and architecture phase. Curriculum (12 phases, all with Simplified Sessions) and the Communication Compass blueprint are both finalized source documents, cross-verified against each other. No frontend, backend, or database implementation exists yet as of this file's writing. This is a master's dissertation project; SLPs are involved in both design input and planned testing.
