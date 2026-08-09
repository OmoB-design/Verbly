# ARCHITECTURE.md

System architecture for Verbly. This describes module boundaries, data flow, and runtime behavior — not the database schema itself (`DATABASE.md`), not endpoint definitions (`API.md`), and not clinical content (`PHASES.md`).

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (React) |
| UI | Tailwind CSS + shadcn/ui (caregiver-facing surface only — child-facing game screens are custom-built, see `DESIGN.md`) |
| Backend | Supabase (Postgres, Auth, Storage, Row-Level Security) |
| Notifications | Email (not push) |

See `DEPENDENCIES.md` for rationale and open items (analytics, error monitoring).

---

## The Three Modules

Verbly is architecturally three separate concerns that must not be tangled together, because they change at different rates and are owned by different kinds of decisions (clinical content vs. runtime engineering vs. reporting):

```
┌─────────────────────┐     ┌──────────────────────┐     ┌───────────────────────┐
│  Curriculum Engine    │ --> │  Session Runtime (RL) │ --> │  Longitudinal Record   │
│  (content, versioned) │     │  (live execution)      │     │  (progress, reports)   │
└─────────────────────┘     └──────────────────────┘     └───────────────────────┘
```

### 1. Curriculum Engine

Owns the 12-phase content: phase → session → activity steps → RL behavior script → scoring criteria → Simplified Session. Stored as structured, versioned content records (see `CLAUDE.md` → *Content vs. code boundary*), not hardcoded in application logic. Each session's RL behavior is its own versioned config object — trigger interval, question text, answer options, credit value per option, branch target — because the variance between sessions (60-second vs. 15-second intervals, 2- vs. 3- vs. 4-option check-ins) is real and needs to be data, not a growing pile of special-cased components.

Also owns the **Communication Compass** content (item bank, domain weights, phase decision tree) — architecturally the same kind of thing (versioned, clinically-authored, content-not-code) even though it runs once at onboarding rather than repeatedly like a session script.

### 2. Session Runtime (the RL)

Executes one session's script live. Since all 12 phases now share one categorized scoring model (Spontaneous / Prompted / No-Response, plus phase-specific bonus categories — see `PHASES.md`), this layer can use **one scoring strategy** rather than branching per phase. It still needs to accommodate phase-specific *extension data* beyond a plain session score:

| Phase(s) | Extra data captured beyond session score |
|---|---|
| 4 (PECS 1) | Per-trial prompt-fading level (5-level hierarchy), used to set the next trial's starting prompt level |
| 6 (PECS 3) | In-trial 4-step error-correction state — distinct from the between-session retake/simplify flow; do not conflate the two recovery mechanisms |
| 7 (PECS 4) | Reversion-to-Single-Card as a distinct outcome, not folded into No-Response |
| 11 (Daily Routines) | Which communication method was used per instance (PECS/gesture/vocalization/AAC/gaze) |
| 12 (Vocal Approximation) | 5-step shaping curve per target sound/word — a longitudinal structure, not a single score |

**Runtime model:** single logged-in caregiver per session (locked decision, originally framed as "single device" — on the web this means a single active browser session running the session runtime, not a single physical device; a caregiver switching between a laptop and a tablet across different sessions is already covered by the earlier "multi-device, single caregiver, no conflict-resolution UI needed" decision, since sessions are attributed to the caregiver account, not the device or browser). Where a session calls for a second person, the runtime displays instructions for that person on-screen rather than requiring a second browser session. A `session_participants` entry (role tag + optional display name, `caregiver_id` nullable) logs their presence without requiring an account — this same mechanism covers the PECS Phase 1 Caregiver A/B pattern, the PECS Phase 4 Session 3 second communication partner, and Turn-Taking sibling/peer participants.

**Advancement decision:** on session completion, applies the global rule (75% pass mark across 3 consecutive sessions → advance; below → retake lowest-scoring session first; still below after retake → Simplified Session) uniformly, since scoring is now consistent across all phases.

### 3. Longitudinal Clinical Record

Progress history, per-phase score history, the phase-specific extension data above, vocalization logs, and exportable reports for the reviewing SLP. This is read-heavy and append-mostly — session data is never edited retroactively by a later content change (see *Content Versioning* below).

---

## Placement → Therapy Handoff

The Communication Compass runs once, at onboarding, and hands off to the Curriculum Engine/Session Runtime via a single event: `assessment.scored`. Its output (`recommended_phase`, `domain_scores`, `confidence`, any hard red flags) seeds the first row in `phase_history`.

**§6.2 ELSE branch (ambiguous placement):** currently always resolves to placing the child at the tentative candidate phase — no SLP-flagging fork exists at this stage. This was deliberately simplified rather than built as a conditional branch on whether an SLP is linked to the account, since that verification mechanism doesn't exist yet. If an SLP-linked-account feature is added later, this is the point in the flow where a conditional fork could be reintroduced — but it is **not** currently in scope.

**Caregiver override:** a caregiver may override `recommended_phase` before starting, gated by a confirmation step, logged as a distinct `trigger_reason` in `phase_history` so algorithmic and human-adjusted placements stay analytically separable (relevant to the dissertation's own validation work, not just engineering hygiene).

---

## One Audit Trail: `phase_history`

Every phase transition — Compass placement, RL-driven advance, caregiver-initiated regression, caregiver override, age-bracket transition — writes to this single table with a `trigger_reason` enum. This was a deliberate choice against building three separate mechanism-specific tables that each need their own reporting logic later.

---

## Content Versioning

Every curriculum content record and the Compass's scoring logic carry a version identifier. Every `SessionInstance` and `assessment` record references the content/schema version it ran under. **A content edit never retroactively changes the meaning of already-collected data** — this is the same discipline in both subsystems (curriculum and Compass), applied consistently rather than as two different patterns. Content edits are reviewed like code changes (see `CONTRIBUTING.md`) before being seeded into the live database — no in-app live-editing CMS for the dissertation-scope build.

---

## Age-Band Model

One canonical age-band table, referenced by all phases, replacing the curriculum's original inconsistent per-phase ranges. Phases vary in *how deeply* they use age bands — some only swap game content (Phase 1), Turn-Taking (Phase 10) varies both content and the prompt-fading target itself — so the content schema must support both shapes without assuming age variance is always cosmetic.

Note this is a separate system from the Compass's own age bands (used only for initial-placement weighting), which operate on a coarser scale for a different purpose — the two should never be unified into one table even though both are "age bands."

---

## Data Access & Security

- **Row-Level Security is the enforcement layer**, not just an application-side check — a caregiver's queries are scoped to their own child(ren) at the database level.
- **Session/auth tokens stored in httpOnly cookies, not `localStorage` or `sessionStorage`** — a browser-based app is exposed to XSS in a way a mobile app isn't, and a JWT sitting in `localStorage` is readable by any injected script. This is the main reason Next.js + `@supabase/ssr` is suggested in `DEPENDENCIES.md` over a plain SPA.
- **Audio (vocalization recordings)** served only via Supabase Storage signed, time-limited URLs — never a permanent public path.
- **SLP access** is read-oriented: progress/report/milestone visibility into a specific child's data, not general account access. (The mechanism for establishing which SLP is linked to which caregiver/child is not yet designed — flagged as an open item below.)

---

## Notifications

Email (see `DEPENDENCIES.md` for provider), covering two distinct types that should not be collapsed into one:
1. **Data-driven nudges** — session reminders, milestone alerts, retake suggestions.
2. **Generic encouragement/motivation lines** — a small original bank of caregiver-facing copy, frequency controlled by a Settings toggle (daily/weekly/off) from day one, since notification fatigue is a real churn risk and the product's own pressure-free philosophy argues against aggressive default frequency.

---

## SLP–Child Linking

Caregiver signup and child profile creation are always fully self-serve — no SLP involvement or approval is required to create an account, run the Compass, or start therapy. This is the default, primary path for every user.

SLP access is a **separate, optional** layer on top of that: an SLP's read-only dashboard visibility into a *specific* child's progress requires that child to be linked to that SLP, since without a link, any SLP account could see any child's data — a real privacy problem, not a hypothetical one.

**`slp_child_links` table** (`slp_id`, `child_id`, `linked_at`, `linked_by`) is the mechanism, and Row-Level Security scopes an SLP's queries to only children they're linked to, enforced at the database layer like everything else in this project's security model (see `DATABASE.md`).

**For the dissertation build specifically:** these links are created manually (by the developer or the SLP directly, in the database) when a test family is onboarded, rather than through a self-serve invite/accept UI — since the actual test cohort has known SLP–family pairings in advance, there's no ambiguity for an invite flow to resolve. If this becomes a broader product later, the same table supports a self-serve invite flow on top (SLP invites → caregiver accepts → row created) without any rework to the underlying data model — only the onboarding UI would need to be added.

## Open Architectural Items

Not yet resolved — flag rather than assume if these come up during implementation:

- **Analytics/error monitoring vendor** — still undecided per `DEPENDENCIES.md`; must respect the Tier 1/2/3 data classification once chosen.
