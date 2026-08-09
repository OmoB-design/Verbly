# Verbly

**An adaptive, caregiver-delivered speech and language intervention platform for children with speech delays.**

Verbly digitizes a 12-phase, evidence-grounded therapy progression (Milieu Teaching, PECS, ABA shaping/differential reinforcement, PROMPT, NDP3, ReST) so that a parent or caregiver — not a clinician — can deliver structured, clinically informed sessions at home, guided in real time by the app, with a speech-language pathologist (SLP) able to review progress remotely.

> **Project context:** Verbly is a master's dissertation project. Design decisions in the therapy curriculum and the onboarding assessment were informed by structured questionnaires sent to practicing SLPs, and the app is intended to be tested by those same SLPs with real families. Ethics/IRB approval, informed consent, and data handling for the study are documented separately in the dissertation methodology, not in this repository.

---

## What Verbly Is

Verbly is not a passive content library or a gamified drill app. It's a **decision engine wrapped around a clinical curriculum** — every therapy session has explicit branching logic (when to prompt, when to fade support, when to reward, when to retry, when to advance or simplify) authored alongside the activity content itself. The app's job is to run that logic live, in real time, while a caregiver and child are sitting together.

### Core modules

| Module | Responsibility |
|---|---|
| **Communication Compass** | An 8–12 minute onboarding assessment (nine domains, age-banded, with a confidence-gated supplemental module) that places a child at the appropriate starting phase — replacing "every child starts at Phase 1" with an evidence-informed placement. Screening, not diagnosis. |
| **Curriculum Engine** | The 12-phase, versioned content library: phase → session → activity steps → scoring criteria → Simplified Session fallback. Content-managed and versioned, not hardcoded. |
| **Session Runtime (the RL)** | Executes one session's script live: prep checklist, timers, interval-based caregiver check-ins, real-time scoring, end-of-session Retake/Advance decision. |
| **Progress & Reporting** | Per-child, per-phase score history, prompt-fading and shaping-step curves, vocalization logs, and exportable reports for the reviewing SLP. |
| **Multi-participant session logging** | Tracks who was present for a session (primary caregiver, secondary caregiver, or an unauthenticated helper/peer) without requiring every participant to hold an account. |

### A note on terminology: "RL" is not machine learning

Throughout this project, **"RL" stands for Reinforcement Loop**, not reinforcement *learning* in the machine-learning sense. There is no trained model, no reward-maximizing policy, and no exploration/exploitation. It is a **deterministic, curriculum-authored state machine**: fixed thresholds, fixed per-session branch logic, executed identically for every child. Code and documentation should avoid ML vocabulary (`train`, `policy`, `reward()`) for this system — prefer names like `SessionStateMachine` or `AdvancementDecisionEngine` — to avoid implying a learned component that doesn't exist.

---

## Who It's For

**Primary users**
- **Caregivers** (usually a parent) — the actual hands delivering therapy, coached moment-to-moment by the app.

**Secondary users**
- **SLPs** — read-only oversight of a child's Compass placement, session history, and progress reports; may review ambiguous placements and flagged milestones. SLPs do not run sessions in-app.
- **Secondary caregivers / helpers** — a co-parent, grandparent, or sibling who participates in a session physically but does not need their own account (see *Single-Session Runtime* below).

---

## Key Design Decisions

These decisions were made deliberately during architecture review and should be treated as settled unless explicitly revisited:

- **Global pass mark:** 75%, applied uniformly across all 12 phases (supersedes an earlier inconsistent "70%+" note in phase-level content).
- **Single-session runtime:** One primary caregiver operates the app per session, in a single active browser session. On the web this is a browser-session concept, not a physical-device one — the same caregiver may use a laptop for one session and a tablet for another, since sessions are attributed to the caregiver account, not the device or browser (see `ARCHITECTURE.md` → *Session Runtime*). Where the curriculum calls for a second person (e.g., a physical prompter or a second communication partner), that person follows on-screen/spoken instructions and does not need their own browser session or login.
- **Session participant logging:** A second person present for a session is logged as an unauthenticated helper/peer (role tag + optional name), not as a full account holder.
- **PECS Phase 4 sentence strip stays physical.** The app times, narrates, and scores the exchange; it does not render an on-screen interactive sentence strip. This preserves the physical hand-to-hand exchange that PECS as a method is built around.
- **Ambiguous Compass placement (§6.2 "ELSE" branch):** always resolves to placing the child at the tentative candidate phase (no SLP-flagging branch at this stage). In-session performance data corrects the placement from there.
- **Caregiver override:** a caregiver may override the Compass's initial phase recommendation before starting, gated by a confirmation step; overrides are logged distinctly from algorithmic placements.
- **Content governance:** curriculum content lives as structured, versioned content (not hardcoded logic), reviewed like code before being seeded into the database. Every `SessionInstance` references the content version it was run under, so later content edits never retroactively change the meaning of past data.
- **Age bands:** unified into one canonical age-band table referenced by all phases, replacing the curriculum's original inconsistent per-phase ranges (this is a content-level migration, tracked separately from the Compass's own, unrelated placement age bands).
- **Not a substitute for professional evaluation:** this framing is kept visible in-app, not just at onboarding.

---

## Source Documentation

This repository is built against two verified source documents (cross-checked against each other for consistency, including exact phase-name/order alignment):

1. **The 12-phase therapy curriculum** — phase overviews, scoring criteria, session-by-session activity steps, RL behavior scripts, age variants, and (as of the latest revision) a Simplified Session for every phase.
2. **The Communication Compass blueprint** — item bank, scoring math, phase decision tree, red-flag list, JSON schema, database schema, and API spec for the onboarding assessment.

Both are original work — the Compass is explicitly built without drawing from PLS-5, CELF, VB-MAPP, or any other proprietary instrument — and both are pending independent clinical plausibility review by a licensed SLP before real-world testing.

---

## Documentation Index

| Document | Purpose |
|---|---|
| `README.md` | This file — project overview and orientation |
| `CLAUDE.md` | Working conventions and context for AI-assisted development on this codebase |
| `DESIGN.md` | UX/design system, accessibility requirements, visual language |
| `DEPENDENCIES.md` | Third-party libraries, services, and vendor choices |
| `PHASES.md` | Full technical breakdown of the 12-phase curriculum as implemented |
| `ARCHITECTURE.md` | System architecture, module boundaries, data flow |
| `DATABASE.md` | Schema, entity relationships, versioning strategy |
| `API.md` | Endpoint specification |
| `CONTRIBUTING.md` | How to propose and review changes, including clinical content changes |

*(Each will be added to this repository in turn.)*

---

## Status

Currently in the **documentation and architecture phase** — curriculum and assessment content are finalized and cross-verified; database, API, and frontend implementation have not yet begun.

**Platform:** web application — Next.js, Tailwind CSS + shadcn/ui, email notifications (not push). Not a native mobile app.

**Backend/database:** [Supabase](https://supabase.com) (Postgres, Auth, Storage, Row-Level Security). This choice is relevant to several of the decisions above — e.g. row-level security should enforce that a caregiver can only query their own child's data at the database layer, not just in application code, and Supabase Storage with signed, time-limited URLs is the intended mechanism for any audio recordings (vocalization logs) rather than public file URLs.

## Clinical & Ethical Grounding

Verbly is designed to complement, not replace, professional speech-language pathology care. It is intended for use either independently by caregivers or as a home-practice tool recommended by an SLP, with progress visible to that SLP. See the dissertation methodology for ethics approval, informed consent process, and data handling procedures governing the study this app supports.
