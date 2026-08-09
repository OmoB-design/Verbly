# DATABASE.md

Schema, entity relationships, and versioning strategy for Verbly, on Supabase/Postgres. This describes what tables exist and why — not migration syntax or ORM code (that's implementation, not architecture).

Three principles from `ARCHITECTURE.md` govern every table below:
1. **Row-Level Security enforces data isolation at the database layer**, not just in application code.
2. **Content is versioned; data referencing content is immutable against later content edits.**
3. **One audit trail (`phase_history`) for every kind of phase transition** — no parallel mechanism-specific tables.

---

## Entity Overview

```
caregivers ──┬── children ──┬── phase_history
             │               ├── session_instances ──┬── session_checkins
             │               │                        ├── session_participants
             │               │                        └── (extension tables, per phase)
             │               ├── assessments (Compass)
             │               └── vocalization_logs
             │
             └── notification_preferences

slps ── slp_child_links ── children

curriculum_content (phases, sessions) — referenced by session_instances, not owned by any caregiver
compass_content (item bank, domain weights, decision tree) — referenced by assessments
```

---

## Core Account & Profile Tables

### `caregivers`
Backed by Supabase Auth. One row per caregiver account.
| Column | Notes |
|---|---|
| `id` | matches `auth.users.id` |
| `role` | `primary` / `secondary` — per the two-tier permission model: only primary caregivers hold account-level permissions (invite, export, delete); secondary caregivers can run sessions and add journal entries |
| `account_owner_id` | for secondary caregivers, references the primary caregiver's account grouping |

### `children`
| Column | Notes |
|---|---|
| `id` | |
| `primary_caregiver_id` | FK → `caregivers`, owns export/delete rights |
| `name`, `dob` | Tier 1 sensitivity — see Security section |
| `current_phase_id` | FK → `curriculum_content.phases`, denormalized for quick dashboard reads; source of truth is still `phase_history` |
| `content_version_at_creation` | which curriculum content version was active when this child's therapy began — informational, not a hard lock |

### `slps`
| Column | Notes |
|---|---|
| `id` | matches `auth.users.id` — SLPs authenticate the same way caregivers do |

### `slp_child_links`
Per the SLP–child linking design in `ARCHITECTURE.md`.
| Column | Notes |
|---|---|
| `slp_id` | FK → `slps` |
| `child_id` | FK → `children` |
| `linked_at` | |
| `linked_by` | who created the link (dev/admin for the dissertation cohort; would be "invite acceptance" if a self-serve flow is added later) |

RLS: an SLP's queries against any child-scoped table only return rows for children present in this table for their `slp_id`.

---

## The Audit Trail: `phase_history`

The single table every phase transition writes to, regardless of cause.
| Column | Notes |
|---|---|
| `id` | |
| `child_id` | FK → `children` |
| `phase_id` | FK → `curriculum_content.phases` |
| `entered_at` | |
| `trigger_reason` | enum: `assessment_placement`, `rl_advance`, `caregiver_regression`, `caregiver_override`, `age_bracket_transition` |
| `content_version` | which curriculum content version defined this phase at the time of transition |

This table is what the RL's age-bracket-transition logic reads from — it needs to be queryable as a decision input (pass rate, prompt-level trend, retake frequency within the current bracket), not just stored for reporting.

---

## Curriculum Content (versioned, not caregiver-owned)

### `curriculum_content.phases` / `.sessions`
Structured, versioned records — not hardcoded application logic (see `CLAUDE.md`). Each session row includes:
- `phase_number`, `session_number`, `age_bracket` (nullable text `3-7`/`8-12`/`10-14` — null when the session isn't age-variant)
- `content_json` — activity steps, RL behavior script (trigger interval, question text, answer options, credit values, branch targets), scoring criteria, Simplified Session variant
- `content_version` — bumped on any edit; reviewed like code before being seeded (see `CONTRIBUTING.md`)

### Age scheme (unified, §13.3)
There is **one** canonical age scheme across the whole app: the varchar bracket `3-7` / `8-12` / `10-14` defined once as `AGE_BRACKETS` in `lib/compass/contract.ts` and enforced by a CHECK wherever it's stored (`children.age_bracket`, `session_instances.age_bracket`, `phase_history.age_bracket`, `curriculum_content.sessions.age_bracket`, `assessments.age_bracket`). Some sessions carry a bracket only to swap game content; Turn-Taking-type sessions use it to also change the fading target — both are expressed via the same `age_bracket` value, with the *meaning* of the variance living in that session's own `content_json`, not in a lookup table.

The earlier `curriculum_content.age_bands` uuid table was **retired** (migration `011`, owner sign-off 2026-08-07) once the Compass v2.1.0 contract made the varchar bracket the single scheme driving both the Compass item set and the curriculum activity variant.

---

## Session Runtime Tables

### `session_instances`
One row per session attempt.
| Column | Notes |
|---|---|
| `id` | |
| `child_id`, `session_id` (FK → curriculum content), `content_version` | version pinned at creation — later content edits never retroactively change this row's meaning |
| `primary_caregiver_id` | the one logged-in caregiver running the session (single-device model) |
| `outcome` | `advance` / `retake` / `simplify_triggered` |
| `score_percent` | computed uniformly across all 12 phases now that scoring is standardized (Spontaneous/Prompted/No-Response, plus phase-specific bonus categories) |

### `session_checkins`
One row per interval check-in within a session (the repeating yes/no/partial pattern).
| Column | Notes |
|---|---|
| `session_instance_id` | |
| `interval_index` | |
| `response_category` | Spontaneous / Prompted / No-Response, or a phase-specific variant (e.g. Reversion-to-Single-Card for PECS Phase 4) |
| `credit_value` | pulled from the session's `content_json` at the pinned `content_version`, not recomputed against current content |

### `session_participants`
Per the single-device runtime decision — logs who was present without requiring every participant to hold an account.
| Column | Notes |
|---|---|
| `session_instance_id` | |
| `participant_role` | `primary` / `secondary` / `peer` |
| `caregiver_id` | nullable — null for unauthenticated helpers/peers |
| `display_name` | nullable, for unauthenticated participants only |

---

## Phase-Specific Extension Tables

Not every phase's data is "one score per session" — these sit alongside `session_instances` for the phases that need them (see `PHASES.md` for the clinical rationale):

| Table | Phase | Purpose |
|---|---|---|
| `prompt_fading_log` | 4 (PECS 1) | Per-trial prompt level (5-level hierarchy), feeding the next trial's starting level |
| `error_correction_events` | 6 (PECS 3) | In-trial 4-step error-correction state — distinct from the retake/simplify mechanism; do not merge with `session_checkins` |
| `communication_method_log` | 11 (Daily Routines) | Which method (PECS/gesture/vocalization/AAC/gaze) was used per instance, across partners/routines |
| `shaping_curve` | 12 (Vocal Approximation) | Per-target-sound/word shaping step and history — longitudinal, not per-session |

---

## Communication Compass

### `compass_content`
Versioned item bank, domain weights, and phase decision tree (`schema_version`) — same content-vs-code discipline as the curriculum.

### `assessments`
| Column | Notes |
|---|---|
| `child_id` | |
| `schema_version` | pins which scoring logic produced this result — critical, since domain weights and thresholds are explicitly tunable, evolving parameters |
| `domain_scores` | normalized structured columns |
| `raw_payload` (JSONB) | full response payload, kept alongside the normalized columns specifically so responses can be re-scored against a future `schema_version` without re-administering the assessment — intentional redundancy, not a cleanup target |
| `recommended_phase`, `confidence` | |
| `placement_mode` | `start_directly` / `readiness_module_triggered` (§6.2 ELSE branch) / `caregiver_override` |

The ELSE branch, per the current decision, always resolves to placing the child at the tentative candidate phase — no separate SLP-flag state is written here at this stage.

---

## Vocalization Logs & Storage

`vocalization_logs` references audio files in Supabase Storage. **Never a public file path** — always resolved to a signed, time-limited URL at read time. Surrounding metadata (timestamp, context tag, target sound) must carry enough information that the log is still useful if audio can't be played (accessibility requirement, see `DESIGN.md`).

---

## Notifications

`notification_preferences`: per-caregiver frequency setting (`daily` / `weekly` / `off`) covering both notification types from `ARCHITECTURE.md` (data-driven nudges and generic encouragement lines) — a single toggle, not two, unless usage data later suggests caregivers want to split them.

---

## Versioning Strategy Summary

Two independent version lineages, never merged:
- **Curriculum content version** — governs `curriculum_content.sessions`, referenced by `session_instances`, `session_checkins`, and `phase_history`.
- **Compass schema version** — governs `compass_content`, referenced by `assessments`.

Both follow the same rule: **bump on edit, pin at the point of use, never rewrite historical rows' interpretation.** This is what makes it possible to say, months later, "this child's Phase 4 retake was scored under content v3" or "this placement used Compass schema v2" with certainty.

---

## Security Summary (see also `DEPENDENCIES.md` → Vendor Risk)

- RLS on every child-scoped table: a caregiver's queries are restricted to children they own (`primary_caregiver_id` or a `secondary` role grant); an SLP's queries are restricted to children present in `slp_child_links` for their `slp_id`.
- Tier 1 data (name, diagnosis notes, audio, assessment responses, session performance) gets audit logging on read once the SLP role is active — worth being able to answer "who looked at this child's data, when."
- Deletion is one cascade (`children` → `session_instances` → `session_checkins`/extension tables → `phase_history` → `assessments` → storage objects), tested explicitly rather than assumed to work because foreign keys exist.
